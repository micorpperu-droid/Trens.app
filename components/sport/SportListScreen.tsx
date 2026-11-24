// ============================================================================
// SPORT LIST SCREEN — Lista de tarjetas con el resumen de cada deporte activo
// del usuario. Al tocar una tarjeta se abre ese deporte dentro del módulo SPORT.
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Dumbbell,
  Bike,
  Car,
  Waves,
  ChevronRight,
  CalendarClock,
  Clock,
  Zap,
  Plus,
  LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../app/_layout';
import { supabase } from '../../lib/supabase';
import * as Haptics from '../../lib/haptics';
import { localDateISO } from '../notes/taskTypes';
import type { Sport } from '../../types/sport';
import { SavageBackground } from '../ui/SavageBackground';
import { BlurView } from 'expo-blur';
import { ExerciseMiniCard } from '../adn/TodayCards';
import { fetchGymTodaySummary, GymTodaySummary } from './gymTodaySummary';

const SPORT_ICON_MAP: Record<string, LucideIcon> = { Dumbbell, Bike, Car, Waves };

interface NextEvent {
  date: string;
  time: string | null;
  name: string;
}

interface SportSummary {
  equipment: number;
  locations: number;
  events: number;
  nextEvent?: NextEvent;
}

interface SportListScreenProps {
  sports: Sport[];
  onSelect: (sport: Sport) => void;
  onAddSport?: () => void;
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatNextEvent(e: NextEvent): string {
  const today = localDateISO();
  const d = new Date(`${e.date}T00:00:00`);
  const dateLabel =
    e.date === today
      ? 'HOY'
      : d.toLocaleDateString('es', { day: '2-digit', month: 'short' }).toUpperCase();
  return `${dateLabel}${e.time ? ` · ${e.time.slice(0, 5)}` : ''} — ${e.name}`;
}

const formatTime12h = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  return `${(h || 0) % 12 || 12}:${String(m || 0).padStart(2, '0')} ${(h || 0) >= 12 ? 'PM' : 'AM'}`;
};

const formatTimeUntil = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const now = new Date();
  const diff = (h || 0) * 60 + (m || 0) - (now.getHours() * 60 + now.getMinutes());
  if (diff >= -90 && diff <= 0) return 'AHORA';
  if (diff < -90) return 'terminado';
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `en ${hours}h ${mins}m`;
  if (hours > 0) return `en ${hours}h`;
  return `en ${mins}m`;
};

// Misma información que la tarjeta ENTRENO del módulo CEO
function GymWorkoutInfo({ summary, color }: { summary: GymTodaySummary | null; color: string }) {
  if (!summary) {
    return <Text className="text-zinc-500 text-xs font-mono mt-4">Sin entreno configurado</Text>;
  }

  return (
    <View className="mt-4 gap-3">
      {summary.sessions.map((session, idx) => (
        <View
          key={idx}
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', borderWidth: 1, borderColor: `${color}40` }}
        >
          <View className="flex-row items-center justify-between px-3 py-3">
            <View className="flex-row items-center gap-2.5 flex-1">
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                {summary.isRestDay ? (
                  <Zap size={13} color="#71717a" />
                ) : (
                  <Dumbbell size={13} color={color} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
                  {session.label || 'ENTRENO'}
                </Text>
                <Text
                  className="font-bold text-sm uppercase tracking-tight"
                  style={{ color: summary.isRestDay ? '#71717a' : '#ffffff' }}
                  numberOfLines={1}
                >
                  {summary.isRestDay ? 'DÍA DE DESCANSO' : summary.routineName}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              {!!session.time && (
                <View className="items-end">
                  <View className="flex-row items-center gap-1">
                    <Clock size={9} color={color} />
                    <Text className="text-[10px] font-mono font-bold" style={{ color }}>
                      {formatTime12h(session.time)}
                    </Text>
                  </View>
                  <Text className="text-[9px] font-bold text-zinc-500">
                    {formatTimeUntil(session.time)}
                  </Text>
                </View>
              )}
              {!summary.isRestDay && session.exercises.length > 0 && (
                <View className="px-2 py-1 rounded-md" style={{ backgroundColor: `${color}15` }}>
                  <Text className="text-[9px] font-mono font-bold" style={{ color }}>
                    {session.exercises.length} EJ
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!summary.isRestDay && session.exercises.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="pb-3"
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              {session.exercises.slice(0, 8).map((ex) => (
                <ExerciseMiniCard key={ex.id} exercise={ex} />
              ))}
            </ScrollView>
          )}
        </View>
      ))}
    </View>
  );
}

export function SportListScreen({ sports, onSelect, onAddSport }: SportListScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [summaries, setSummaries] = useState<Record<string, SportSummary>>({});
  const [gymSummary, setGymSummary] = useState<GymTodaySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [equipmentRes, locationsRes, eventsRes, gymRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('sport_id')
          .eq('user_id', user.id)
          .eq('category_code', 'EQUIPMENT')
          .eq('status', 'ACTIVE'),
        supabase.from('sport_locations').select('sport_id').eq('user_id', user.id),
        supabase
          .from('sport_events')
          .select('sport_id, name, event_date, event_time')
          .eq('user_id', user.id)
          .gte('event_date', localDateISO())
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true }),
        sports.some((sp) => sp.code === 'GYM')
          ? fetchGymTodaySummary(user.id)
          : Promise.resolve(null),
      ]);

      const next: Record<string, SportSummary> = {};
      const bucket = (id: string) => (next[id] ||= { equipment: 0, locations: 0, events: 0 });

      (equipmentRes.data || []).forEach((r: any) => (bucket(r.sport_id).equipment += 1));
      (locationsRes.data || []).forEach((r: any) => (bucket(r.sport_id).locations += 1));
      (eventsRes.data || []).forEach((r: any) => {
        const b = bucket(r.sport_id);
        b.events += 1;
        if (!b.nextEvent) {
          b.nextEvent = { date: r.event_date, time: r.event_time, name: r.name || 'Evento' };
        }
      });

      setSummaries(next);
      setGymSummary(gymRes);
    } catch (error) {
      console.error('Error cargando resumen de deportes:', error);
    }
  }, [user, sports]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderStat = (label: string, value: string | number, color: string) => (
    <View
      key={label}
      className="flex-1 rounded-xl py-2.5 items-center"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
    >
      <Text className="font-black text-lg font-mono" style={{ color }}>
        {value}
      </Text>
      <Text className="text-zinc-500 text-[9px] font-bold tracking-widest mt-0.5">{label}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <SavageBackground variant="screen" tone="mono" />

      <View
        className="px-5 pb-4"
        style={{
          paddingTop: insets.top + (Platform.OS === 'web' ? 56 : 12),
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(220, 38, 38, 0.3)',
        }}
      >
        <View className="absolute top-0 left-0 right-0 h-[2px] bg-red-600" />
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-red-600" />
            <Text className="text-white text-2xl font-black tracking-tight uppercase">SPORT</Text>
          </View>
          {onAddSport && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onAddSport();
              }}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-full active:scale-95"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(220, 38, 38, 0.5)',
              }}
            >
              <Plus size={13} color="#DC2626" strokeWidth={3} />
              <Text className="text-[10px] font-black tracking-widest" style={{ color: '#DC2626' }}>
                AGREGAR DEPORTE
              </Text>
            </Pressable>
          )}
        </View>
        <Text className="text-zinc-500 text-xs font-mono mt-1">
          Elige el deporte que practicarás
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />
        }
      >
        {sports.map((sport) => {
          const color = sport.color_primary || '#DC2626';
          const Icon = SPORT_ICON_MAP[sport.icon] || Dumbbell;
          const summary = summaries[sport.id] || { equipment: 0, locations: 0, events: 0 };
          const isGym = sport.code === 'GYM';

          return (
            <Pressable
              key={sport.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSelect(sport);
              }}
              className="rounded-3xl p-5 mb-4 active:scale-[0.98]"
              style={{
                backgroundColor: withAlpha(color, 0.08),
                borderWidth: 1.5,
                borderColor: withAlpha(color, 0.5),
                overflow: 'hidden',
              }}
            >
              <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
              <View className="flex-row items-center gap-4">
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: withAlpha(color, 0.2) }}
                >
                  <Icon size={28} color={color} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-black text-xl" numberOfLines={1}>
                    {sport.name}
                  </Text>
                  {!!sport.description && (
                    <Text className="text-zinc-500 text-xs mt-0.5" numberOfLines={1}>
                      {sport.description}
                    </Text>
                  )}
                </View>
                <ChevronRight size={20} color={color} />
              </View>

              {isGym ? (
                <GymWorkoutInfo summary={gymSummary} color={color} />
              ) : (
                <>
                  <View className="flex-row gap-2 mt-4">
                    {renderStat('EQUIPO', summary.equipment, color)}
                    {renderStat('LUGARES', summary.locations, color)}
                    {renderStat('EVENTOS', summary.events, color)}
                  </View>

                  {summary.nextEvent && (
                    <View className="flex-row items-center gap-2 mt-3">
                      <CalendarClock size={13} color={color} />
                      <Text
                        className="flex-1 text-zinc-400 text-[11px] font-mono"
                        numberOfLines={1}
                      >
                        {formatNextEvent(summary.nextEvent)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
