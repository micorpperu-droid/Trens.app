// ============================================================================
// TASK TIMELINE CARD — Tarea con hora, mostrada en el timeline de CEO
// ============================================================================

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, ListChecks } from 'lucide-react-native';
import { Haptics } from '../../lib/haptics';
import { formatTime12 } from '../notes/taskTypes';

const RED = '#DC2626';

export interface TimelineTaskData {
  id: string;
  content: string;
  due_time: string | null;
  is_done: boolean;
}

interface TaskTimelineCardProps {
  task: TimelineTaskData;
  onToggle: (task: TimelineTaskData) => void;
}

export const TaskTimelineCard: React.FC<TaskTimelineCardProps> = ({ task, onToggle }) => {
  const time = formatTime12(task.due_time);

  return (
    <View className="mb-4 ml-6 relative">
      <View
        className="absolute -left-[14px] top-5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900"
        style={{
          backgroundColor: RED,
          shadowColor: RED,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
        }}
      />

      <View
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.95)',
          borderWidth: 1,
          borderColor: 'rgba(220, 38, 38, 0.35)',
          opacity: task.is_done ? 0.55 : 1,
        }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5">
            <ListChecks size={14} color={RED} />
            <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">TAREA</Text>
          </View>
          {!!time && (
            <View
              className="px-3 py-1 rounded-lg"
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)' }}
            >
              <Text className="text-xs font-bold font-mono" style={{ color: RED }}>
                {time}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center gap-3">
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
          <Text
            className="flex-1 text-white text-sm leading-5"
            style={task.is_done ? { textDecorationLine: 'line-through' } : undefined}
          >
            {task.content}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default TaskTimelineCard;
