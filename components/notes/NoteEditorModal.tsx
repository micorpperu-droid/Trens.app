// ============================================================================
// NOTE EDITOR MODAL — Crear/editar nota: título opcional, texto y color de tema
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { NOTE_COLORS, DEFAULT_NOTE_COLOR, withAlpha, UserNote } from './noteTheme';

interface NoteEditorModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  editingNote?: UserNote | null;
  onSaved: (note: UserNote) => void;
  onDeleted: (id: string) => void;
}

export function NoteEditorModal({
  visible,
  onClose,
  userId,
  editingNote,
  onSaved,
  onDeleted,
}: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_NOTE_COLOR);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingNote;

  useEffect(() => {
    if (visible) {
      setTitle(editingNote?.title || '');
      setContent(editingNote?.content || '');
      setColor(editingNote?.color || DEFAULT_NOTE_COLOR);
    }
  }, [visible, editingNote]);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Nota vacía', 'Escribe algo antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        title: title.trim() || null,
        content: content.trim(),
        color,
        updated_at: new Date().toISOString(),
      };

      const query = isEditing
        ? supabase.from('user_notes').update(payload).eq('id', editingNote!.id)
        : supabase.from('user_notes').insert(payload);

      const { data, error } = await query.select().single();
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(data as UserNote);
      onClose();
    } catch (error) {
      console.error('Error guardando nota:', error);
      Alert.alert('Error', 'No se pudo guardar la nota.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingNote) return;
    Alert.alert('Eliminar nota', '¿Seguro que quieres eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('user_notes').delete().eq('id', editingNote.id);
          if (error) {
            Alert.alert('Error', 'No se pudo eliminar la nota.');
            return;
          }
          onDeleted(editingNote.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'EDITAR NOTA' : 'NUEVA NOTA'}
      height="full"
      accentColor={color}
    >
      <View className="flex-1 px-5 pb-6 gap-4">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Título (opcional)"
          placeholderTextColor="#71717A"
          maxLength={80}
          className="text-white text-lg font-bold rounded-xl px-4 py-3"
          style={{
            backgroundColor: withAlpha(color, 0.1),
            borderWidth: 1,
            borderColor: withAlpha(color, 0.4),
          }}
        />

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Escribe tu nota..."
          placeholderTextColor="#71717A"
          multiline
          textAlignVertical="top"
          className="text-white text-base rounded-xl px-4 py-3"
          style={{
            flex: 1,
            minHeight: 160,
            backgroundColor: withAlpha(color, 0.06),
            borderWidth: 1,
            borderColor: withAlpha(color, 0.25),
          }}
        />

        <View>
          <Text className="text-zinc-400 text-[10px] font-bold tracking-widest mb-2">COLOR</Text>
          <View className="flex-row flex-wrap gap-3">
            {NOTE_COLORS.map((c) => {
              const selected = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setColor(c);
                  }}
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: c,
                    borderWidth: selected ? 3 : 0,
                    borderColor: '#FFFFFF',
                  }}
                >
                  {selected && <Check size={16} color="#000000" strokeWidth={3} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-3 mt-2">
          {isEditing && (
            <Pressable
              onPress={handleDelete}
              className="w-12 h-12 rounded-xl items-center justify-center active:scale-95"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.4)',
              }}
            >
              <Trash2 size={18} color="#DC2626" />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="flex-1 h-12 rounded-xl items-center justify-center active:scale-95"
            style={{ backgroundColor: color, opacity: saving ? 0.6 : 1 }}
          >
            <Text className="text-black font-black tracking-widest">
              {saving ? 'GUARDANDO...' : 'GUARDAR'}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}
