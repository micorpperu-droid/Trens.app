// ============================================================================
// SPORT NOTES BOARD ("Pizarra") — Notas libres + imágenes para el deporte activo
// Texto libre (se guarda al perder foco) + fotos adjuntas (agregar/eliminar).
// Persiste en user_sports.sport_profile.board_note / board_images (JSONB).
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Plus, X, StickyNote } from 'lucide-react-native';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import cloudflareR2 from '../../services/cloudflare/r2';

export interface SportNotesBoardProps {
  userId: string;
  note: string;
  images: string[];
  onSaveNote: (text: string) => void;
  onImagesChange: (images: string[]) => void;
  accentColor?: string;
}

export function SportNotesBoard({
  userId,
  note,
  images,
  onSaveNote,
  onImagesChange,
  accentColor = '#DC2626',
}: SportNotesBoardProps) {
  const [draftNote, setDraftNote] = useState(note);
  const [uploading, setUploading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Sincronizar el borrador si la nota cambia desde afuera (ej. cambio de deporte)
  useEffect(() => {
    setDraftNote(note);
  }, [note]);

  const handleBlur = () => {
    if (draftNote === note) return;
    onSaveNote(draftNote);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para elegir la foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets[0]) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUploading(true);

      const key = `sport-notes/${userId}/${Date.now()}.jpg`;
      const upload = await cloudflareR2.uploadFile(result.assets[0].uri, key, 'image/jpeg');
      if (!upload.success || !upload.url) {
        throw new Error(upload.error || 'Error subiendo la imagen');
      }

      onImagesChange([...images, upload.url]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error agregando imagen a la pizarra:', error);
      Alert.alert('Error', 'No se pudo agregar la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url: string) => {
    Alert.alert('Eliminar imagen', '¿Quieres quitar esta imagen de la pizarra?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const key = cloudflareR2.getKeyFromUrl(url);
          if (key) await cloudflareR2.deleteFile(key);
          onImagesChange(images.filter((u) => u !== url));
        },
      },
    ]);
  };

  return (
    <View className="px-4 mb-7">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white font-bold text-base tracking-widest">PIZARRA</Text>
        {savedFlash && <Text className="text-zinc-500 text-[10px] font-semibold">Guardado ✓</Text>}
      </View>

      <View
        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
        style={{ borderStyle: 'dashed' }}
      >
        <View className="flex-row items-center mb-2">
          <StickyNote size={14} color="#71717a" />
          <Text className="text-zinc-500 text-[10px] font-bold ml-1.5 tracking-wide">
            NOTAS LIBRES
          </Text>
        </View>

        <TextInput
          value={draftNote}
          onChangeText={setDraftNote}
          onBlur={handleBlur}
          placeholder="Escribe cualquier nota sobre este deporte: rutina, ideas, recordatorios..."
          placeholderTextColor="#52525b"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          className="text-white text-sm"
          style={{ minHeight: 110 }}
        />

        {/* Imágenes adjuntas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row" style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={handleAddImage}
              disabled={uploading}
              activeOpacity={0.8}
              className="w-16 h-16 rounded-xl items-center justify-center border border-dashed"
              style={{ borderColor: accentColor, opacity: uploading ? 0.5 : 1 }}
            >
              <Plus color={accentColor} size={22} />
            </TouchableOpacity>

            {images.map((url) => (
              <View key={url} className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900">
                <Image source={{ uri: url }} style={{ width: 64, height: 64 }} contentFit="cover" />
                <TouchableOpacity
                  onPress={() => handleRemoveImage(url)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 items-center justify-center"
                >
                  <X color="#FFFFFF" size={12} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
