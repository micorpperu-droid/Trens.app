// ============================================================================
// NOTAS - Notas (título opcional + color) y Tareas (texto + día + hora opcional)
// ============================================================================

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ListChecks, Plus, StickyNote } from 'lucide-react-native';
import { useAuth } from '../../_layout';
import { supabase } from '../../../lib/supabase';
import * as Haptics from '../../../lib/haptics';
import { NoteEditorModal } from '../../../components/notes/NoteEditorModal';
import { TaskEditorModal } from '../../../components/notes/TaskEditorModal';
import { TasksList } from '../../../components/notes/TasksList';
import { useUserTasks } from '../../../components/notes/useUserTasks';
import { UserTask } from '../../../components/notes/taskTypes';
import { UserNote, withAlpha } from '../../../components/notes/noteTheme';

const RED = '#DC2626';

type Mode = 'notes' | 'tasks';

export default function NotasScreen() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('notes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Notas
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  // Tareas
  const { tasks, reload, upsertLocal, removeLocal, toggleDone, clearDone } = useUserTasks(
    user?.id
  );
  const [taskEditorVisible, setTaskEditorVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<UserTask | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) console.error('Error cargando notas:', error);
    else setNotes((data as UserNote[]) || []);
  }, [user]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchNotes(), reload()]);
    setLoading(false);
  }, [fetchNotes, reload]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(next);
  };

  const openNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === 'notes') {
      setEditingNote(null);
      setNoteEditorVisible(true);
    } else {
      setEditingTask(null);
      setTaskEditorVisible(true);
    }
  };

  const openEditNote = (note: UserNote) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingNote(note);
    setNoteEditorVisible(true);
  };

  const openEditTask = (task: UserTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTask(task);
    setTaskEditorVisible(true);
  };

  if (!user) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <StickyNote size={40} color={RED} />
        <Text className="text-white font-bold text-lg mt-4">Inicia sesión para usar NOTAS</Text>
      </View>
    );
  }

  const renderNote = (note: UserNote) => (
    <Pressable
      key={note.id}
      onPress={() => openEditNote(note)}
      className="rounded-2xl p-4 mb-3 active:scale-[0.98]"
      style={{
        backgroundColor: withAlpha(note.color, 0.12),
        borderWidth: 1.5,
        borderColor: withAlpha(note.color, 0.5),
      }}
    >
      {!!note.title && (
        <Text className="text-white font-bold text-base mb-1" numberOfLines={2}>
          {note.title}
        </Text>
      )}
      {!!note.content && (
        <Text className="text-zinc-300 text-sm" numberOfLines={4}>
          {note.content}
        </Text>
      )}
      <Text className="font-mono text-[10px] mt-3" style={{ color: note.color }}>
        {new Date(note.updated_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
      </Text>
    </Pressable>
  );

  const renderEmpty = (title: string, hint: string, Icon: typeof StickyNote) => (
    <View className="items-center justify-center py-20">
      <View
        className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
        style={{
          backgroundColor: 'rgba(220, 38, 38, 0.12)',
          borderWidth: 1,
          borderColor: 'rgba(220, 38, 38, 0.25)',
        }}
      >
        <Icon size={32} color={RED} />
      </View>
      <Text className="text-white font-bold text-lg mb-1">{title}</Text>
      <Text className="text-zinc-400 text-sm text-center font-mono">{hint}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <View
        className="px-5 pt-14 pb-4"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(220, 38, 38, 0.3)',
          shadowColor: RED,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        }}
      >
        <View className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: RED }} />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: RED }} />
            <Text className="text-white text-2xl font-black tracking-tight uppercase">
              {mode === 'notes' ? 'NOTAS' : 'TAREAS'}
            </Text>
          </View>
          <Pressable
            onPress={openNew}
            className="w-10 h-10 rounded-full items-center justify-center active:scale-95"
            style={{ backgroundColor: RED }}
          >
            <Plus size={22} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        </View>

        {/* Toggle Notas / Tareas */}
        <View
          className="flex-row mt-4 p-1 rounded-xl"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}
        >
          {(
            [
              { key: 'notes', label: 'NOTAS', Icon: StickyNote },
              { key: 'tasks', label: 'TAREAS', Icon: ListChecks },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                onPress={() => changeMode(key)}
                className="flex-1 flex-row items-center justify-center gap-2 py-2 rounded-lg"
                style={{ backgroundColor: active ? RED : 'transparent' }}
              >
                <Icon size={14} color={active ? '#FFFFFF' : '#A1A1AA'} />
                <Text
                  className="text-xs font-black tracking-widest"
                  style={{ color: active ? '#FFFFFF' : '#A1A1AA' }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />
        }
      >
        {mode === 'notes' ? (
          !loading && notes.length === 0 ? (
            renderEmpty('Sin notas', 'Toca + para crear tu primera nota', StickyNote)
          ) : (
            <View>{notes.map(renderNote)}</View>
          )
        ) : !loading && tasks.length === 0 ? (
          renderEmpty('Sin tareas', 'Toca + para agregar una tarea', ListChecks)
        ) : (
          <TasksList
            tasks={tasks}
            onToggle={toggleDone}
            onEdit={openEditTask}
            onClearDone={clearDone}
          />
        )}
      </ScrollView>

      <NoteEditorModal
        visible={noteEditorVisible}
        onClose={() => setNoteEditorVisible(false)}
        userId={user.id}
        editingNote={editingNote}
        onSaved={(saved) => setNotes((prev) => [saved, ...prev.filter((n) => n.id !== saved.id)])}
        onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
      />

      <TaskEditorModal
        visible={taskEditorVisible}
        onClose={() => setTaskEditorVisible(false)}
        userId={user.id}
        editingTask={editingTask}
        onSaved={upsertLocal}
        onDeleted={removeLocal}
      />
    </View>
  );
}
