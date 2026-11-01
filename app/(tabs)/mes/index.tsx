// ============================================================================
// MES - Calendario del mes: marca los días con tareas o eventos deportivos
// y muestra abajo el detalle del día seleccionado (hoy por defecto)
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useAuth } from '../../_layout';
import { supabase } from '../../../lib/supabase';
import * as Haptics from '../../../lib/haptics';
import { UserTask, localDateISO } from '../../../components/notes/taskTypes';
import { EventTimelineCard, TimelineEventData } from '../../../components/plan/EventTimelineCard';
import { TaskTimelineCard, TimelineTaskData } from '../../../components/plan/TaskTimelineCard';

const RED = '#DC2626';
const EVENT_BLUE = '#0EA5E9';
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type MonthEvent = TimelineEventData & { event_date: string };

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function MesScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [selected, setSelected] = useState(localDateISO());
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [events, setEvents] = useState<MonthEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const today = localDateISO();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0

  const fetchMonth = useCallback(async () => {
    if (!user) return;
    const start = isoOf(year, month, 1);
    const end = isoOf(year, month, daysInMonth);

    const [tasksRes, eventsRes] = await Promise.all([
      supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('task_date', start)
        .lte('task_date', end),
      supabase
        .from('sport_events')
        .select(
          'id, event_date, event_time, maps_url, latitude, longitude, location, notes, media_url, media_type'
        )
        .eq('user_id', user.id)
        .gte('event_date', start)
        .lte('event_date', end),
    ]);

    if (tasksRes.error) console.error('Error cargando tareas del mes:', tasksRes.error);
    else setTasks((tasksRes.data as UserTask[]) || []);
    if (eventsRes.error) console.error('Error cargando eventos del mes:', eventsRes.error);
    else setEvents((eventsRes.data as MonthEvent[]) || []);
  }, [user, year, month, daysInMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchMonth();
    }, [fetchMonth])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMonth();
    setRefreshing(false);
  };

  const tasksByDate = useMemo(() => {
    const map: Record<string, UserTask[]> = {};
    tasks.forEach((t) => (map[t.task_date] ||= []).push(t));
    return map;
  }, [tasks]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, MonthEvent[]> = {};
    events.forEach((e) => (map[e.event_date] ||= []).push(e));
    return map;
  }, [events]);

  const changeMonth = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    const isCurrent = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    setSelected(isCurrent ? today : isoOf(d.getFullYear(), d.getMonth(), 1));
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelected(today);
  };

  const toggleTask = async (task: TimelineTaskData) => {
    const next = !task.is_done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)));
    const { error } = await supabase
      .from('user_tasks')
      .update({ is_done: next, updated_at: new Date().toISOString() })
      .eq('id', task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: task.is_done } : t)));
    }
  };

  if (!user) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <CalendarDays size={40} color={RED} />
        <Text className="text-white font-bold text-lg mt-4">Inicia sesión para ver tu mes</Text>
      </View>
    );
  }

  const monthTitle = new Date(year, month, 1)
    .toLocaleDateString('es', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const cells: (number | null)[] = [
    ...Array(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTasks = [...(tasksByDate[selected] || [])];
  const selectedEvents = [...(eventsByDate[selected] || [])];
  const dayItems = [
    ...selectedTasks.map((t) => ({ kind: 'task' as const, time: t.due_time || '', task: t })),
    ...selectedEvents.map((e) => ({ kind: 'event' as const, time: e.event_time || '', event: e })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const selectedTitle = new Date(`${selected}T00:00:00`)
    .toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const monthTaskCount = tasks.length;
  const monthEventCount = events.length;

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
            <Text className="text-white text-2xl font-black tracking-tight uppercase">MES</Text>
          </View>
          <Pressable
            onPress={goToToday}
            className="px-3 py-1.5 rounded-lg active:scale-95"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}
          >
            <Text className="text-xs font-black tracking-widest" style={{ color: RED }}>
              HOY
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />
        }
      >
        {/* Calendario */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center justify-between mb-1">
            <Pressable onPress={() => changeMonth(-1)} hitSlop={10} className="p-2 active:opacity-60">
              <ChevronLeft size={22} color="#A1A1AA" />
            </Pressable>
            <View className="items-center">
              <Text className="text-white font-black tracking-widest">{monthTitle}</Text>
              <Text className="text-zinc-500 text-[10px] font-mono mt-0.5">
                {monthTaskCount} {monthTaskCount === 1 ? 'TAREA' : 'TAREAS'} · {monthEventCount}{' '}
                {monthEventCount === 1 ? 'EVENTO' : 'EVENTOS'}
              </Text>
            </View>
            <Pressable onPress={() => changeMonth(1)} hitSlop={10} className="p-2 active:opacity-60">
              <ChevronRight size={22} color="#A1A1AA" />
            </Pressable>
          </View>

          <View className="flex-row mt-3">
            {WEEKDAYS.map((w) => (
              <View key={w} style={{ width: `${100 / 7}%` }} className="items-center pb-2">
                <Text className="text-zinc-600 text-[10px] font-bold">{w}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {cells.map((day, idx) => {
              if (day === null) return <View key={`e${idx}`} style={{ width: `${100 / 7}%`, height: 54 }} />;

              const iso = isoOf(year, month, day);
              const dayTasks = tasksByDate[iso] || [];
              const dayEvents = eventsByDate[iso] || [];
              const total = dayTasks.length + dayEvents.length;
              const allTasksDone = dayTasks.length > 0 && dayTasks.every((t) => t.is_done);
              const isSelected = iso === selected;
              const isToday = iso === today;

              return (
                <Pressable
                  key={iso}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelected(iso);
                  }}
                  style={{ width: `${100 / 7}%`, height: 54 }}
                  className="items-center justify-center"
                >
                  <View
                    className="w-11 h-12 rounded-xl items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? RED : 'transparent',
                      borderWidth: isToday && !isSelected ? 1.5 : 0,
                      borderColor: RED,
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: isSelected ? '#FFFFFF' : isToday ? RED : '#E4E4E7' }}
                    >
                      {day}
                    </Text>
                    <View className="flex-row gap-0.5 mt-1 h-1.5">
                      {dayTasks.length > 0 && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: isSelected ? '#FFFFFF' : RED,
                            opacity: allTasksDone ? 0.35 : 1,
                          }}
                        />
                      )}
                      {dayEvents.length > 0 && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : EVENT_BLUE }}
                        />
                      )}
                    </View>
                  </View>
                  {total > 1 && (
                    <View
                      className="absolute top-0.5 right-1 min-w-[14px] h-[14px] rounded-full items-center justify-center px-0.5"
                      style={{ backgroundColor: '#27272A' }}
                    >
                      <Text className="text-white text-[8px] font-bold">{total}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row gap-4 mt-3">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: RED }} />
              <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">TAREAS</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_BLUE }} />
              <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">EVENTOS</Text>
            </View>
          </View>
        </View>

        {/* Detalle del día */}
        <View className="px-5 pt-6">
          <Text className="text-white font-black tracking-widest text-sm">{selectedTitle}</Text>
          <Text className="text-zinc-500 text-[10px] font-mono mt-0.5 mb-4">
            {selectedTasks.length} {selectedTasks.length === 1 ? 'TAREA' : 'TAREAS'} ·{' '}
            {selectedEvents.length} {selectedEvents.length === 1 ? 'EVENTO' : 'EVENTOS'}
          </Text>

          {dayItems.length === 0 ? (
            <View className="items-center py-10">
              <CalendarDays size={32} color="#3F3F46" />
              <Text className="text-zinc-500 text-sm font-mono mt-3">
                Sin tareas ni eventos este día
              </Text>
            </View>
          ) : (
            dayItems.map((item) =>
              item.kind === 'task' ? (
                <TaskTimelineCard
                  key={`t-${item.task.id}`}
                  task={item.task}
                  onToggle={toggleTask}
                />
              ) : (
                <EventTimelineCard key={`e-${item.event.id}`} event={item.event} />
              )
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}
