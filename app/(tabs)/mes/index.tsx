// ============================================================================
// MES - Calendario del mes: marca los días con tareas o eventos deportivos
// y muestra abajo el detalle del día seleccionado (hoy por defecto)
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pill,
} from 'lucide-react-native';
import { useAuth } from '../../_layout';
import { supabase } from '../../../lib/supabase';
import * as Haptics from '../../../lib/haptics';
import { UserTask, clampMonthlyDate, localDateISO } from '../../../components/notes/taskTypes';
import { toggleTaskDone } from '../../../components/notes/taskActions';
import { SavageBackground } from '../../../components/ui/SavageBackground';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Alert } from '../../../lib/alert';
import { hankToolsEvent } from '../../../lib/hankToolsEvent';
import { useHank } from '../../../context/HankContext';
import { useSport } from '../../../context/SportContext';
import { TaskEditorModal } from '../../../components/notes/TaskEditorModal';
import { AddSportEventModal } from '../../../components/sport/AddSportEventModal';
import { StackDayCard, StackRow } from '../../../components/plan/StackDayCard';
import { EventTimelineCard, TimelineEventData } from '../../../components/plan/EventTimelineCard';
import { TaskTimelineCard, TimelineTaskData } from '../../../components/plan/TaskTimelineCard';

const RED = '#DC2626';
const EVENT_BLUE = '#0EA5E9';
const STACK_PURPLE = '#A855F7';
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

type MonthEvent = TimelineEventData & { event_date: string };

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function MesScreen() {
  const { user } = useAuth();
  const { activeSport } = useSport();
  const { refreshTrigger } = useHank();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [selected, setSelected] = useState(localDateISO());
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [recurring, setRecurring] = useState<UserTask[]>([]);
  const [events, setEvents] = useState<MonthEvent[]>([]);
  const [stackRows, setStackRows] = useState<StackRow[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = localDateISO();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0

  const fetchMonth = useCallback(async () => {
    if (!user) return;
    const start = isoOf(year, month, 1);
    const end = isoOf(year, month, daysInMonth);

    const [tasksRes, eventsRes, recurringRes, stackRes] = await Promise.all([
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
      supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('recurrence', 'monthly'),
      supabase
        .from('supplement_stack')
        .select(
          'id, name, dose, type, time, times, days_of_week, is_pre_workout, is_post_workout'
        )
        .eq('user_id', user.id)
        .eq('is_active', true),
    ]);

    if (tasksRes.error) console.error('Error cargando tareas del mes:', tasksRes.error);
    else setTasks((tasksRes.data as UserTask[]) || []);
    if (!recurringRes.error) setRecurring((recurringRes.data as UserTask[]) || []);
    if (!stackRes.error) setStackRows((stackRes.data as StackRow[]) || []);
    if (eventsRes.error) console.error('Error cargando eventos del mes:', eventsRes.error);
    else setEvents((eventsRes.data as MonthEvent[]) || []);
  }, [user, year, month, daysInMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchMonth();
    }, [fetchMonth])
  );

  // Se actualiza cuando HOY/Stack/Hank modifican datos
  useEffect(() => {
    if (refreshTrigger > 0) fetchMonth();
  }, [refreshTrigger, fetchMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMonth();
    setRefreshing(false);
  };

  // Tareas del mes + ocurrencias futuras de las recurrentes (solo la actual se puede completar)
  const monthTasks = useMemo(() => {
    const realIds = new Set(tasks.map((t) => t.id));
    const virtual: UserTask[] = [];
    recurring.forEach((r) => {
      if (realIds.has(r.id)) return;
      const day = r.recur_day || Number(r.task_date.slice(8, 10));
      const date = clampMonthlyDate(year, month, day);
      if (date >= r.task_date) {
        virtual.push({ ...r, id: `${r.id}@${date}`, task_date: date, is_done: false });
      }
    });
    return [...tasks, ...virtual];
  }, [tasks, recurring, year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, UserTask[]> = {};
    monthTasks.forEach((t) => (map[t.task_date] ||= []).push(t));
    return map;
  }, [monthTasks]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, MonthEvent[]> = {};
    events.forEach((e) => (map[e.event_date] ||= []).push(e));
    return map;
  }, [events]);

  // Compuestos del stack que tocan cada día del mes (según los días de la semana configurados)
  const stackByDate = useMemo(() => {
    const map: Record<string, StackRow[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const weekday = new Date(year, month, d).getDay();
      const items = stackRows.filter((r) => r.days_of_week?.includes(weekday) ?? true);
      if (items.length > 0) map[isoOf(year, month, d)] = items;
    }
    return map;
  }, [stackRows, year, month, daysInMonth]);

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
    // Las ocurrencias futuras de tareas recurrentes no se completan desde aquí
    if (String(task.id).includes('@')) return;
    const row = tasks.find((t) => t.id === task.id);
    if (!row) return;
    const res = await toggleTaskDone(row);
    if (!res) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === row.id ? { ...t, task_date: res.task_date, is_done: res.is_done } : t
      )
    );
    if (res.rolled) fetchMonth();
  };

  const openAddTask = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddTask(true);
  };

  const openAddEvent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!activeSport?.id) {
      Alert.alert('Sin deporte activo', 'Selecciona un deporte para agendar un evento.');
      return;
    }
    setShowAddEvent(true);
  };

  const openAddStack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    hankToolsEvent.open('stack', { view: 'add' });
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
  const selectedStack = stackByDate[selected] || [];
  const dayItems = [
    ...selectedTasks.map((t) => ({ kind: 'task' as const, time: t.due_time || '', task: t })),
    ...selectedEvents.map((e) => ({ kind: 'event' as const, time: e.event_time || '', event: e })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const selectedTitle = new Date(`${selected}T00:00:00`)
    .toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const monthTaskCount = monthTasks.length;
  const monthEventCount = events.length;

  return (
    <View className="flex-1 bg-black">
      <SavageBackground variant="screen" tone="mono" />

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
        <GlassCard className="mx-5 mt-5 px-3 pt-3 pb-3">
          <View className="flex-row items-center justify-between mb-1">
            <Pressable
              onPress={() => changeMonth(-1)}
              hitSlop={10}
              className="p-2 active:opacity-60"
            >
              <ChevronLeft size={22} color="#A1A1AA" />
            </Pressable>
            <View className="items-center">
              <Text className="text-white font-black tracking-widest">{monthTitle}</Text>
              <Text className="text-zinc-500 text-[10px] font-mono mt-0.5">
                {monthTaskCount} {monthTaskCount === 1 ? 'TAREA' : 'TAREAS'} · {monthEventCount}{' '}
                {monthEventCount === 1 ? 'EVENTO' : 'EVENTOS'} · {stackRows.length} STACK
              </Text>
            </View>
            <Pressable
              onPress={() => changeMonth(1)}
              hitSlop={10}
              className="p-2 active:opacity-60"
            >
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
              if (day === null)
                return <View key={`e${idx}`} style={{ width: `${100 / 7}%`, height: 54 }} />;

              const iso = isoOf(year, month, day);
              const dayTasks = tasksByDate[iso] || [];
              const dayEvents = eventsByDate[iso] || [];
              const dayStack = stackByDate[iso];
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
                      {!!dayStack && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? '#FFFFFF' : STACK_PURPLE }}
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
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: STACK_PURPLE }} />
              <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">STACK</Text>
            </View>
          </View>

          {/* Agregar al día seleccionado */}
          <View className="flex-row gap-2 mt-4">
            {[
              { key: 'task', label: 'TAREA', color: RED, Icon: ListChecks, onPress: openAddTask },
              {
                key: 'event',
                label: 'EVENTO',
                color: EVENT_BLUE,
                Icon: CalendarClock,
                onPress: openAddEvent,
              },
              { key: 'stack', label: 'STACK', color: STACK_PURPLE, Icon: Pill, onPress: openAddStack },
            ].map(({ key, label, color, Icon, onPress }) => (
              <Pressable
                key={key}
                onPress={onPress}
                className="flex-1 items-center py-3 rounded-2xl active:scale-95"
                style={{
                  backgroundColor: `${color}14`,
                  borderWidth: 1,
                  borderColor: `${color}55`,
                }}
              >
                <Icon size={18} color={color} />
                <Text className="text-zinc-500 text-[8px] font-bold tracking-widest mt-1.5">
                  AGREGAR
                </Text>
                <Text className="text-xs font-black tracking-widest" style={{ color }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </GlassCard>

        {/* Detalle del día */}
        <View className="px-5 pt-6">
          <Text className="text-white font-black tracking-widest text-sm">{selectedTitle}</Text>
          <Text className="text-zinc-500 text-[10px] font-mono mt-0.5 mb-4">
            {selectedTasks.length} {selectedTasks.length === 1 ? 'TAREA' : 'TAREAS'} ·{' '}
            {selectedEvents.length} {selectedEvents.length === 1 ? 'EVENTO' : 'EVENTOS'} ·{' '}
            {selectedStack.length} STACK
          </Text>

          {dayItems.length === 0 && selectedStack.length === 0 ? (
            <View className="items-center py-10">
              <CalendarDays size={32} color="#3F3F46" />
              <Text className="text-zinc-500 text-sm font-mono mt-3">
                Sin tareas, eventos ni stack este día
              </Text>
            </View>
          ) : (
            <>
              {dayItems.map((item) =>
                item.kind === 'task' ? (
                  <TaskTimelineCard
                    key={`t-${item.task.id}`}
                    task={item.task}
                    onToggle={toggleTask}
                  />
                ) : (
                  <EventTimelineCard key={`e-${item.event.id}`} event={item.event} />
                )
              )}
              {selectedStack.length > 0 && <StackDayCard items={selectedStack} />}
            </>
          )}
        </View>
      </ScrollView>

      <TaskEditorModal
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        userId={user.id}
        defaultDate={selected}
        onSaved={() => fetchMonth()}
        onDeleted={() => {}}
      />

      {activeSport && (
        <AddSportEventModal
          visible={showAddEvent}
          onClose={() => setShowAddEvent(false)}
          userId={user.id}
          sportId={activeSport.id}
          defaultDate={selected}
          onSaved={() => fetchMonth()}
          onDeleted={() => {}}
        />
      )}
    </View>
  );
}
