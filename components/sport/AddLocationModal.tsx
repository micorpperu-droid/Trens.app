// ============================================================================
// ADD LOCATION MODAL — Crear/editar un item de "Lugares" (Sport)
// Foto 16:9 + nombre + ubicación elegida con buscador de mapa + notas.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, MapPin, Trash2 } from 'lucide-react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import cloudflareR2 from '../../services/cloudflare/r2';
import { supabase } from '../../lib/supabase';
import type { SportLocation } from '../../types/sport';
import { MapPickerModal, PickedPlace } from './MapPickerModal';
import { StaticMapPreview } from './StaticMapPreview';

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  sportId: string;
  editingItem?: SportLocation | null;
  onSaved: (item: SportLocation) => void;
  onDeleted: (id: string) => void;
  accentColor?: string;
}

export function AddLocationModal({
  visible,
  onClose,
  userId,
  sportId,
  editingItem,
  onSaved,
  onDeleted,
  accentColor = '#DC2626',
}: AddLocationModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const MEDIA_WIDTH = screenWidth - 40;
  const MEDIA_HEIGHT = (MEDIA_WIDTH * 9) / 16;

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null); // nuevo (local, sin subir)
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingItem;
  const previewUri = photoUri || editingItem?.photo_url || null;

  useEffect(() => {
    if (visible) {
      setName(editingItem?.name || '');
      setNotes(editingItem?.notes || '');
      setAddress(editingItem?.address || '');
      setMapsUrl(editingItem?.maps_url || '');
      setCoords(
        editingItem?.latitude != null && editingItem?.longitude != null
          ? { lat: editingItem.latitude, lng: editingItem.longitude }
          : null
      );
      setPhotoUri(null);
    }
  }, [visible, editingItem]);

  const handlePickLocation = (place: PickedPlace) => {
    setAddress(place.address);
    setMapsUrl(place.mapsUrl);
    setCoords({ lat: place.latitude, lng: place.longitude });
    setName(place.name);
  };

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para elegir la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPhotoUri(result.assets[0].uri);
    } catch (error) {
      console.error('Error al elegir foto de ubicación:', error);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre al lugar.');
      return;
    }

    setSaving(true);
    try {
      let photo_url = editingItem?.photo_url;

      if (photoUri) {
        const key = `sport-locations/${userId}/${Date.now()}.jpg`;
        const upload = await cloudflareR2.uploadFile(photoUri, key, 'image/jpeg');
        if (!upload.success || !upload.url) {
          throw new Error(upload.error || 'Error subiendo la foto');
        }
        photo_url = upload.url;
      }

      const payload = {
        user_id: userId,
        sport_id: sportId,
        name: name.trim(),
        notes: notes.trim() || null,
        address: address.trim() || null,
        maps_url: mapsUrl.trim() || null,
        photo_url: photo_url || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        is_primary: editingItem?.is_primary || false,
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from('sport_locations')
          .update(payload)
          .eq('id', editingItem!.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as SportLocation);
      } else {
        const { data, error } = await supabase
          .from('sport_locations')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as SportLocation);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      Alert.alert('Error', 'No se pudo guardar el lugar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert('Eliminar lugar', `¿Quieres eliminar "${editingItem.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            if (editingItem.photo_url) {
              const key = cloudflareR2.getKeyFromUrl(editingItem.photo_url);
              if (key) await cloudflareR2.deleteFile(key);
            }
            const { error } = await supabase
              .from('sport_locations')
              .delete()
              .eq('id', editingItem.id);
            if (error) throw error;
            onDeleted(editingItem.id);
            onClose();
          } catch (error) {
            console.error('Error eliminando ubicación:', error);
            Alert.alert('Error', 'No se pudo eliminar el lugar.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Editar Lugar' : 'Nuevo Lugar'}
      showCloseButton
      height="auto"
      accentColor={accentColor}
      footer={
        <View className="px-5 pt-4 flex-row" style={{ gap: 10 }}>
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={saving}
              className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <Trash2 color="#DC2626" size={20} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: accentColor, opacity: saving ? 0.6 : 1 }}
            className="flex-1 h-12 rounded-xl items-center justify-center"
          >
            <Text className="text-white font-bold">{saving ? 'GUARDANDO...' : 'GUARDAR'}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="px-5 pb-4" style={{ gap: 16 }}>
        {/* Selector de foto 16:9 */}
        <TouchableOpacity
          onPress={handlePickPhoto}
          activeOpacity={0.85}
          style={{
            width: MEDIA_WIDTH,
            height: MEDIA_HEIGHT,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#18181b',
          }}
          className="border border-zinc-800 items-center justify-center"
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT }}
              contentFit="cover"
            />
          ) : (
            <>
              <Camera color="#71717a" size={28} />
              <Text className="text-zinc-500 text-xs font-semibold mt-2">Foto 16:9</Text>
            </>
          )}
        </TouchableOpacity>

        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Smart Fit - San Isidro"
            placeholderTextColor="#52525b"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
          />
        </View>

        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">UBICACIÓN</Text>
          {coords ? (
            <View style={{ gap: 8 }}>
              <StaticMapPreview
                latitude={coords.lat}
                longitude={coords.lng}
                mapsUrl={mapsUrl}
                label={name}
                aspectRatio={1.85}
              />
              {!!address && (
                <Text className="text-zinc-400 text-xs" numberOfLines={2}>
                  {address}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => setMapPickerVisible(true)}
                className="flex-row items-center self-start"
              >
                <MapPin color={accentColor} size={13} />
                <Text style={{ color: accentColor }} className="text-xs font-semibold ml-1.5">
                  Cambiar ubicación
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setMapPickerVisible(true)}
              activeOpacity={0.8}
              className="flex-row items-center bg-zinc-900 border border-dashed border-zinc-700 rounded-xl px-4 py-4"
            >
              <MapPin color="#71717a" size={18} />
              <Text className="text-zinc-400 text-sm ml-2">
                Buscar y elegir ubicación en el mapa
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">
            NOTAS / ESPECIFICACIONES
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Horario, acceso, referencias..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
            style={{ minHeight: 80 }}
          />
        </View>
      </View>

      <MapPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        onSelect={handlePickLocation}
        accentColor={accentColor}
      />
    </BottomSheetModal>
  );
}
