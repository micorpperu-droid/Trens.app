// ============================================================================
// ADD EQUIPMENT MODAL — Crear/editar un item de "Equipo" (Sport)
// Foto o video 16:9 + nombre + notas/especificaciones.
// Reutiliza inventory_items (category_code='EQUIPMENT') y Cloudflare R2.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { Camera, PlayCircle, Trash2 } from 'lucide-react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import cloudflareR2 from '../../services/cloudflare/r2';
import { supabase } from '../../lib/supabase';
import type { Equipment } from '../../types/sport';

interface AddEquipmentModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  sportId: string;
  /** Si viene un item, el modal edita; si no, crea uno nuevo */
  editingItem?: Equipment | null;
  onSaved: (item: Equipment) => void;
  onDeleted: (id: string) => void;
  accentColor?: string;
}

export function AddEquipmentModal({
  visible,
  onClose,
  userId,
  sportId,
  editingItem,
  onSaved,
  onDeleted,
  accentColor = '#DC2626',
}: AddEquipmentModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const MEDIA_WIDTH = screenWidth - 40;
  const MEDIA_HEIGHT = (MEDIA_WIDTH * 9) / 16;

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null); // nuevo (local, sin subir)
  const [mediaType, setMediaType] = useState<'PHOTO' | 'VIDEO'>('PHOTO');
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingItem;

  useEffect(() => {
    if (visible) {
      setName(editingItem?.name || '');
      setNotes(editingItem?.notes || '');
      setMediaUri(null);
      setMediaType(editingItem?.media_type || 'PHOTO');
    }
  }, [visible, editingItem]);

  const previewIsVideo =
    mediaType === 'VIDEO' && !!(mediaUri || (isEditing && editingItem?.video_url));
  const previewUri =
    mediaUri || (previewIsVideo ? editingItem?.video_url : editingItem?.photo_url) || null;

  const player = useVideoPlayer(previewIsVideo && previewUri ? previewUri : '', (p) => {
    p.loop = true;
    p.muted = true;
    p.pause();
  });

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
      console.error('Error al elegir media de equipo:', error);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle un nombre al equipo.');
      return;
    }

    setSaving(true);
    try {
      let photo_url = editingItem?.photo_url;
      let video_url = editingItem?.video_url;

      if (mediaUri) {
        const extension = mediaType === 'VIDEO' ? 'mp4' : 'jpg';
        const contentType = mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
        const key = `sport-equipment/${userId}/${Date.now()}.${extension}`;
        const upload = await cloudflareR2.uploadFile(mediaUri, key, contentType);
        if (!upload.success || !upload.url) {
          throw new Error(upload.error || 'Error subiendo la media');
        }
        if (mediaType === 'VIDEO') {
          video_url = upload.url;
          photo_url = undefined;
        } else {
          photo_url = upload.url;
          video_url = undefined;
        }
      }

      const payload = {
        user_id: userId,
        sport_id: sportId,
        category_code: 'EQUIPMENT',
        name: name.trim(),
        notes: notes.trim() || null,
        media_type: mediaUri ? mediaType : editingItem?.media_type || 'PHOTO',
        photo_url: photo_url || null,
        video_url: video_url || null,
        attributes: editingItem?.attributes || {},
        is_primary: editingItem?.is_primary || false,
        status: 'ACTIVE' as const,
      };

      if (isEditing) {
        const { data, error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('id', editingItem!.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as Equipment);
      } else {
        const { data, error } = await supabase
          .from('inventory_items')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        onSaved(data as Equipment);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      console.error('Error guardando equipo:', error);
      Alert.alert('Error', 'No se pudo guardar el equipo. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingItem) return;
    Alert.alert('Eliminar equipo', `¿Quieres eliminar "${editingItem.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const urlToClean = editingItem.video_url || editingItem.photo_url;
            if (urlToClean) {
              const key = cloudflareR2.getKeyFromUrl(urlToClean);
              if (key) await cloudflareR2.deleteFile(key);
            }
            const { error } = await supabase
              .from('inventory_items')
              .delete()
              .eq('id', editingItem.id);
            if (error) throw error;
            onDeleted(editingItem.id);
            onClose();
          } catch (error) {
            console.error('Error eliminando equipo:', error);
            Alert.alert('Error', 'No se pudo eliminar el equipo.');
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
      title={isEditing ? 'Editar Equipo' : 'Nuevo Equipo'}
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
        {/* Selector de media 16:9 */}
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
              <Text className="text-zinc-500 text-xs font-semibold mt-2">Foto o video 16:9</Text>
            </>
          )}
        </TouchableOpacity>

        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">NOMBRE</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ej. Casco integral, Rack de discos..."
            placeholderTextColor="#52525b"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
          />
        </View>

        <View>
          <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">
            NOTAS / ESPECIFICACIONES
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Marca, talla, estado, detalles..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
            style={{ minHeight: 80 }}
          />
        </View>
      </View>
    </BottomSheetModal>
  );
}
