// ============================================================================
// TASKS LIST — Lista de tareas con checkbox, día, hora opcional y limpieza de completadas
// ============================================================================

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, Clock } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { UserTask, formatDateLabel, formatTime12, localDateISO } from './taskTypes';

const RED = '#DC2626';

interface TasksListProps {
  tasks: UserTask[];
  onToggle: (task: UserTask) => void;
  onEdit: (task: UserTask) => void;
  onClearDone: () => void;
}

export function TasksList({ tasks, onToggle, onEdit, onClearDone }: TasksListProps) {
  const today = localDateISO();
  const hasDone = tasks.some((t) => t.is_done);

  return (
    <View className="gap-2">
      {tasks.map((task) => {
        const time = formatTime12(task.due_time);
        const showDate = task.task_date !== today;
        const overdue = task.task_date < today && !task.is_done;
        return (
          <Pressable
            key={task.id}
            onPress={() => onEdit(task)}
            className="flex-row items-center gap-3 rounded-2xl px-4 py-3 active:scale-[0.99]"
            style={{
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              borderWidth: 1,
              borderColor: task.is_done ? 'rgba(255,255,255,0.06)' : 'rgba(220, 38, 38, 0.35)',
              opacity: task.is_done ? 0.55 : 1,
            }}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(task);
              }}
              hitSlop={10}
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{
                borderWidth: 2,
                borderColor: RED,
                backgroundColor: task.is_done ? RED : 'transparent',
              }}
            >
              {task.is_done && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </Pressable>

            <View className="flex-1">
              <Text
                className="text-white text-base"
                style={task.is_done ? { textDecorationLine: 'line-through' } : undefined}
              >
                {task.content}
              </Text>
              {showDate && (
                <Text
                  className="text-[10px] font-mono mt-0.5"
                  style={{ color: overdue ? RED : '#71717A' }}
                >
                  {formatDateLabel(task.task_date)}
                </Text>
              )}
            </View>

            {!!time && (
              <View
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(220, 38, 38, 0.18)' }}
              >
                <Clock size={11} color={RED} />
                <Text className="text-xs font-bold font-mono" style={{ color: RED }}>
                  {time}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}

      {hasDone && (
        <Pressable onPress={onClearDone} className="items-center py-3 active:opacity-70">
          <Text className="text-zinc-500 text-[11px] font-bold tracking-widest">
            BORRAR COMPLETADAS
          </Text>
        </Pressable>
      )}
    </View>
  );
}
