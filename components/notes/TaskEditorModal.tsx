// ============================================================================
// TASK EDITOR MODAL — Crear/editar tarea: texto + día + hora opcional.
// La tarea aparece en el timeline de HOY el día asignado.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import { Calendar, Clock, Trash2, X } from 'lucide-react-native';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import { TimePickerModal } from '../plan/TimePickerModal';
import { Alert } from '../../lib/alert';
import * as Haptics from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { UserTask, addDaysISO, formatDateLabel, formatTime12, localDateISO } from './taskTypes';

// DateTimePicker solo existe en nativo
let RNDateTimePicker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
}

const RED = '#DC2626';

interface TaskEditorModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  editingTask?: UserTask | null;
  onSaved: (task: UserTask) => void;
  onDeleted: (id: string) => void;
}

export function TaskEditorModal({
  visible,
  onClose,
  userId,
  editingTask,
  onSaved,
  onDeleted,
}: TaskEditorModalProps) {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(localDateISO());
  const [time, setTime] = useState<string | null>(null);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [nativeDatePicker, setNativeDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingTask;
  const today = localDateISO();
  const tomorrow = addDaysISO(today, 1);

  useEffect(() => {
    if (visible) {
      setContent(editingTask?.content || '');
      setDate(editingTask?.task_date || localDateISO());
      setTime(editingTask?.due_time || null);
    }
  }, [visible, editingTask]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Tarea vacía', 'Escribe qué tienes que hacer.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_id: userId,
        content: content.trim(),
        due_time: time,
        task_date: date,
        updated_at: new Date().toISOString(),
      };

      const query = isEditing
        ? supabase.from('user_tasks').update(payload).eq('id', editingTask!.id)
        : supabase.from('user_tasks').insert(payload);

      const { data, error } = await query.select().single();
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved(data as UserTask);
      onClose();
    } catch (error) {
      console.error('Error guardando tarea:', error);
      Alert.alert('Error', 'No se pudo guardar la tarea.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editingTask) return;
    Alert.alert('Eliminar tarea', '¿Seguro que quieres eliminar esta tarea?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('user_tasks').delete().eq('id', editingTask.id);
          if (error) {
            Alert.alert('Error', 'No se pudo eliminar la tarea.');
            return;
          }
          onDeleted(editingTask.id);
          onClose();
        },
      },
    ]);
  };

  const dateAsValue = () => {
    const d = new Date(`${date}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const handleNativeDateChange = (event: any, selected?: Date) => {
    setNativeDatePicker(false);
    if (event?.type !== 'set' || !selected) return;
    setDate(localDateISO(selected));
  };

  const chip = (label: string, value: string) => {
    const active = date === value;
    return (
      <Pressable
        key={label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setDate(value);
        }}
        className="px-4 py-3 rounded-xl active:scale-95"
        style={{
          backgroundColor: active ? RED : 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: active ? RED : 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <Text
          className="text-xs font-black tracking-widest"
          style={{ color: active ? '#FFFFFF' : '#A1A1AA' }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const customDateActive = date !== today && date !== tomorrow;

  return (
    <>
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title={isEditing ? 'EDITAR TAREA' : 'NUEVA TAREA'}
        height={80}
        accentColor={RED}
      >
        <View className="flex-1 px-5 pb-6 gap-4">
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="¿Qué tienes que hacer?"
            placeholderTextColor="#71717A"
            multiline
            textAlignVertical="top"
            className="text-white text-base rounded-xl px-4 py-3"
            style={{
              flex: 1,
              minHeight: 100,
              backgroundColor: 'rgba(220, 38, 38, 0.06)',
              borderWidth: 1,
              borderColor: 'rgba(220, 38, 38, 0.3)',
            }}
          />

          {/* Día */}
          <View>
            <Text className="text-zinc-400 text-[10px] font-bold tracking-widest mb-2">DÍA</Text>
            <View className="flex-row items-center gap-2">
              {chip('HOY', today)}
              {chip('MAÑANA', tomorrow)}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (Platform.OS !== 'web') setNativeDatePicker(true);
                }}
                className="flex-1 flex-row items-center gap-2 rounded-xl px-4 py-3 active:scale-[0.98]"
                style={{
                  backgroundColor: customDateActive ? RED : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: customDateActive ? RED : 'rgba(255, 255, 255, 0.1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Calendar size={16} color={customDateActive ? '#FFFFFF' : '#A1A1AA'} />
                <Text
                  className="text-xs font-black tracking-widest"
                  style={{ color: customDateActive ? '#FFFFFF' : '#A1A1AA' }}
                >
                  {customDateActive ? formatDateLabel(date).toUpperCase() : 'OTRO DÍA'}
                </Text>
                {Platform.OS === 'web' &&
                  React.createElement('input', {
                    type: 'date',
                    value: date,
                    min: today,
                    onChange: (e: any) => e.target.value && setDate(e.target.value),
                    style: {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      border: 'none',
                    },
                  })}
              </Pressable>
            </View>
          </View>

          {Platform.OS !== 'web' && nativeDatePicker && RNDateTimePicker && (
            <RNDateTimePicker
              value={dateAsValue()}
              mode="date"
              minimumDate={new Date()}
              display="default"
              onChange={handleNativeDateChange}
            />
          )}

          {/* Hora */}
          <View>
            <Text className="text-zinc-400 text-[10px] font-bold tracking-widest mb-2">
              HORA (OPCIONAL)
            </Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setTimePickerVisible(true)}
                className="flex-1 flex-row items-center gap-2 rounded-xl px-4 py-3 active:scale-[0.98]"
                style={{
                  backgroundColor: time ? 'rgba(220, 38, 38, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  borderWidth: 1,
                  borderColor: time ? 'rgba(220, 38, 38, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Clock size={16} color={time ? RED : '#A1A1AA'} />
                <Text className={time ? 'text-white font-bold font-mono' : 'text-zinc-400'}>
                  {time ? formatTime12(time) : 'Sin hora'}
                </Text>
              </Pressable>
              {!!time && (
                <Pressable
                  onPress={() => setTime(null)}
                  className="w-11 h-11 rounded-xl items-center justify-center bg-zinc-800 active:scale-95"
                >
                  <X size={18} color="#A1A1AA" />
                </Pressable>
              )}
            </View>
            <Text className="text-zinc-500 text-[11px] mt-2">
              {date === today && !time
                ? 'Sin hora, hoy: solo aparece en NOTAS. Con hora o en otro día, también en HOY.'
                : `Aparecerá en tu timeline de HOY el día ${formatDateLabel(date).toLowerCase()}.`}
            </Text>
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
                <Trash2 size={18} color={RED} />
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="flex-1 h-12 rounded-xl items-center justify-center active:scale-95"
              style={{ backgroundColor: RED, opacity: saving ? 0.6 : 1 }}
            >
              <Text className="text-white font-black tracking-widest">
                {saving ? 'GUARDANDO...' : 'GUARDAR'}
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheetModal>

      <TimePickerModal
        visible={timePickerVisible}
        currentTime={time || '09:00'}
        onClose={() => setTimePickerVisible(false)}
        onSave={(t) => setTime(t)}
      />
    </>
  );
}
