// ============================================================================
// ADD SPORT EVENT MODAL — Crear/editar un evento agendado del deporte activo
// Fecha + Hora + Ubicación (Maps) + Texto + media adjunta (foto o video).
// Alimenta la tarjeta genérica del timeline CEO (sport_events).
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Clock, Camera, PlayCircle, MapPin, Trash2 } from 'lucide-react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import cloudflareR2 from '../../services/cloudflare/r2';
import { supabase } from '../../lib/supabase';
import type { SportEvent } from '../../types/sport';
import { MapPickerModal, PickedPlace } from './MapPickerModal';
import { StaticMapPreview } from './StaticMapPreview';

// DateTimePicker solo existe en nativo
let RNDateTimePicker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface AddSportEventModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  sportId: string;
  editingItem?: SportEvent | null;
  onSaved: (item: SportEvent) => void;
  onDeleted: (id: string) => void;
  accentColor?: string;
}

function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AddSportEventModal({
  visible,
  onClose,
  userId,
  sportId,
  editingItem,
  onSaved,
  onDeleted,
  accentColor = '#0EA5E9',
}: AddSportEventModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const MEDIA_WIDTH = screenWidth - 40;
  const MEDIA_HEIGHT = (MEDIA_WIDTH * 9) / 16;

  const [eventDate, setEventDate] = useState(todayISODate());
  const [eventTime, setEventTime] = useState('07:00');
  const [mapsUrl, setMapsUrl] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [saving, setSaving] = useState(false);

  const [nativePicker, setNativePicker] = useState<'date' | 'time' | null>(null);

  const isEditing = !!editingItem;

  useEffect(() => {
    if (visible) {
      setEventDate(editingItem?.event_date || todayISODate());
      setEventTime(editingItem?.event_time || '07:00');
      setMapsUrl(editingItem?.maps_url || '');
      setAddress('');
      setLocationName(editingItem?.location || '');
      setCoords(
        editingItem?.latitude != null && editingItem?.longitude != null
          ? { lat: editingItem.latitude, lng: editingItem.longitude }
          : null
      );
      setNotes(editingItem?.notes || '');
      setMediaUri(null);
      setMediaType(editingItem?.media_type || 'PHOTO');
    }
  }, [visible, editingItem]);

  const handlePickLocation = (place: PickedPlace) => {
    setAddress(place.address);
    setMapsUrl(place.mapsUrl);
    setLocationName(place.name);
    setCoords({ lat: place.latitude, lng: place.longitude });
  };

  const previewIsVideo = mediaType === 'VIDEO' && !!(mediaUri || editingItem?.media_url);
  const previewUri = mediaUri || editingItem?.media_url || null;

  const player = useVideoPlayer(previewIsVideo && previewUri ? previewUri : '', (p) => {
    p.loop = true;
    p.muted = true;
    p.pause();
  });

  // --------------------------------------------------------------------------
  // FECHA / HORA — nativo (DateTimePicker) o web (input real superpuesto)
  // --------------------------------------------------------------------------
  const openNative = (mode: 'date' | 'time') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNativePicker(mode);
  };

  const handleNativeChange = (event: any, selected?: Date) => {
    const mode = nativePicker;
    setNativePicker(null);
    if (event?.type !== 'set' || !selected) return;
    if (mode === 'date') {
      setEventDate(selected.toISOString().split('T')[0]);
    } else {
      const h = selected.getHours().toString().padStart(2, '0');
      const m = selected.getMinutes().toString().padStart(2, '0');
      setEventTime(`${h}:${m}`);
    }
  };

  const dateAsValue = () => {
    const d = new Date(`${eventDate}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  };
  const timeAsValue = () => {
    const [h, m] = eventTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para elegir la media.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        videoMaxDuration: 20,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setMediaUri(asset.uri);
      setMediaType(asset.type === 'video' ? 'VIDEO' : 'PHOTO');
    } catch (error) {
      console.error('Error al elegir media del evento:', error);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let media_url = editingItem?.media_url;
      let media_type_final: 'PHOTO' | 'VIDEO' | undefined = editingItem?.media_type;

      if (mediaUri) {
        const extension = mediaType === 'VIDEO' ? 'mp4' : 'jpg';
        const contentType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
        const key = `sport-events/${userId}/${Date.now()}.${extension}`;
        const upload = await cloudflareR2.uploadFile(mediaUri, key, contentType);
        if (!upload.success || !upload.url) {
          throw new Error(upload.error || 'Error subiendo la media');
        }
        media_url = upload.url;
        media_type_final = mediaType;
      }

      const autoName = (notes.trim() || 'Evento').slice(0, 60);

      const payload = {
        user_id: userId,
        sport_id: sportId,
        name: autoName,
        event_date: eventDate,
        event_time: eventTime,
        event_type: 'SESSION' as const,
        status: 'UPCOMING' as const,
        location: locationName.trim() || null,
        maps_url: mapsUrl.trim() || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        notes: notes.trim() || null,
        media_url: media_url || null,
        media_type: media_url ? media_type_final : null,
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from('sport_events')
          .update(payload)
          .eq('id', editingItem!.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as SportEvent);
      } else {
        const { data, error } = await supabase
          .from('sport_events')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as SportEvent);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error guardando evento:', error);
      Alert.alert('Error', 'No se pudo guardar el evento. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert('Eliminar evento', '¿Quieres eliminar este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            if (editingItem.media_url) {
              const key = cloudflareR2.getKeyFromUrl(editingItem.media_url);
              if (key) await cloudflareR2.deleteFile(key);
            }
            const { error } = await supabase.from('sport_events').delete().eq('id', editingItem.id);
            if (error) throw error;
            onDeleted(editingItem.id);
            onClose();
          } catch (error) {
            console.error('Error eliminando evento:', error);
            Alert.alert('Error', 'No se pudo eliminar el evento.');
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
      title={isEditing ? 'Editar Evento' : 'Nuevo Evento'}
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
        {/* Fecha + Hora */}
        <View className="flex-row" style={{ gap: 10 }}>
          <TouchableOpacity
            onPress={() => openNative('date')}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <Calendar size={16} color={accentColor} />
            <Text className="text-white ml-2 font-semibold">{formatDateDisplay(eventDate)}</Text>
            {Platform.OS === 'web' &&
              React.createElement('input', {
                type: 'date',
                value: eventDate,
                onChange: (e: any) => e.target.value && setEventDate(e.target.value),
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  border: 'none',
                },
              })}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => openNative('time')}
            activeOpacity={0.8}
            className="flex-1 flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <Clock size={16} color={accentColor} />
            <Text className="text-white ml-2 font-semibold">{eventTime}</Text>
            {Platform.OS === 'web' &&
              React.createElement('input', {
                type: 'time',
                value: eventTime,
                onChange: (e: any) => e.target.value && setEventTime(e.target.value),
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  border: 'none',
                },
              })}
          </TouchableOpacity>
        </View>

        {Platform.OS !== 'web' && nativePicker && RNDateTimePicker && (
          <RNDateTimePicker
            value={nativePicker === 'date' ? dateAsValue() : timeAsValue()}
            mode={nativePicker}
            is24Hour
            display="default"
            onChange={handleNativeChange}
          />
        )}

        {/* Ubicación (Maps) */}
        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">UBICACIÓN</Text>
          {coords ? (
            <View style={{ gap: 8 }}>
              <StaticMapPreview
                latitude={coords.lat}
                longitude={coords.lng}
                mapsUrl={mapsUrl}
                label={locationName}
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

        {/* Texto */}
        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">TEXTO</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ej: Bloque de trabajo profundo 2h antes de entrenar / Reunión con el equipo a las 6pm..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Media adjunta */}
        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">
            ARCHIVO MULTIMEDIA (OPCIONAL)
          </Text>
          <TouchableOpacity
            onPress={handlePickMedia}
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
              previewIsVideo ? (
                <>
                  <VideoView
                    player={player}
                    style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT }}
                    contentFit="cover"
                    nativeControls={false}
                  />
                  <View className="absolute inset-0 items-center justify-center">
                    <PlayCircle color="rgba(255,255,255,0.9)" size={36} />
                  </View>
                </>
              ) : (
                <Image
                  source={{ uri: previewUri }}
                  style={{ width: MEDIA_WIDTH, height: MEDIA_HEIGHT }}
                  contentFit="cover"
                />
              )
            ) : (
              <>
                <Camera color="#71717a" size={28} />
                <Text className="text-zinc-500 text-xs font-semibold mt-2">Foto o video</Text>
              </>
            )}
          </TouchableOpacity>
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
