// ============================================================================
// STACK SUMMARY CARD — Resumen del stack de suplementos (tema morado).
// Al presionarla abre el modal de Stack (QuickStackModal, montado en HankOverlay).
// ============================================================================

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Pill,
  Syringe,
  FlaskConical,
  Droplets,
  ChevronRight,
  Clock,
  LucideIcon,
} from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { hankToolsEvent } from '../../lib/hankToolsEvent';
import { supabase } from '../../lib/supabase';

const PURPLE = '#A855F7';

const TYPE_ICON: Record<string, LucideIcon> = {
  pill: Pill,
  syringe: Syringe,
  powder: FlaskConical,
  liquid: Droplets,
};

interface StackRow {
  id: string;
  name: string;
  dose: string | null;
  type: string | null;
  time: string | null;
  times: string[] | null;
  days_of_week: number[] | null;
  is_pre_workout: boolean | null;
  is_post_workout: boolean | null;
}

const toMinutes = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime12h = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${(h || 0) % 12 || 12}:${String(m || 0).padStart(2, '0')} ${(h || 0) >= 12 ? 'PM' : 'AM'}`;
};

export default function StackSummaryCard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<StackRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data, error } = await supabase
          .from('supplement_stack')
          .select('id, name, dose, type, time, times, days_of_week, is_pre_workout, is_post_workout')
          .eq('user_id', userId)
          .eq('is_active', true);
        if (!active) return;
        if (error) console.error('Error cargando stack:', error);
        else setRows((data as StackRow[]) || []);
      })();
      return () => {
        active = false;
      };
    }, [userId])
  );

  const today = new Date().getDay();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const list = rows || [];
  const todayRows = list.filter((r) => r.days_of_week?.includes(today) ?? true);

  // Próxima toma de hoy (los pre/post entreno dependen del entreno, no tienen hora fija)
  const slots: { minutes: number; time: string; names: string[] }[] = [];
  todayRows
    .filter((r) => !r.is_pre_workout && !r.is_post_workout)
    .forEach((r) => {
      const times = r.times && r.times.length > 0 ? r.times : r.time ? [r.time] : [];
      times.forEach((t) => {
        const minutes = toMinutes(t);
        const slot = slots.find((s) => s.minutes === minutes);
        if (slot) slot.names.push(r.name);
        else slots.push({ minutes, time: t.slice(0, 5), names: [r.name] });
      });
    });
  slots.sort((a, b) => a.minutes - b.minutes);
  const nextSlot = slots.find((s) => s.minutes >= nowMinutes);

  const typeCounts = list.reduce<Record<string, number>>((acc, r) => {
    const key = r.type && TYPE_ICON[r.type] ? r.type : 'pill';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        hankToolsEvent.open('stack');
      }}
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'rgba(10, 5, 15, 0.92)',
        borderWidth: 1.5,
        borderColor: 'rgba(168, 85, 247, 0.4)',
        shadowColor: PURPLE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      <View
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderBottomColor: 'rgba(168, 85, 247, 0.25)' }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)' }}
          >
            <Pill size={14} color={PURPLE} />
          </View>
          <View>
            <Text className="text-white text-xs font-black uppercase tracking-widest">Stack</Text>
            <Text className="text-zinc-500 text-[10px] font-mono">Suplementos y compuestos</Text>
          </View>
        </View>
        <ChevronRight size={16} color={PURPLE} />
      </View>

      <View className="p-4">
        {rows !== null && list.length === 0 ? (
          <View className="items-center py-3">
            <Pill size={26} color="#3f3f46" />
            <Text className="text-zinc-500 text-xs font-mono mt-2">
              Sin compuestos. Toca para agregar el primero
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row gap-2">
              <View
                className="flex-1 rounded-xl py-2.5 items-center"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
              >
                <Text className="font-black text-lg font-mono" style={{ color: PURPLE }}>
                  {rows === null ? '-' : list.length}
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold tracking-widest mt-0.5">
                  COMPUESTOS
                </Text>
              </View>
              <View
                className="flex-1 rounded-xl py-2.5 items-center"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
              >
                <Text className="font-black text-lg font-mono" style={{ color: PURPLE }}>
                  {rows === null ? '-' : todayRows.length}
                </Text>
                <Text className="text-zinc-500 text-[9px] font-bold tracking-widest mt-0.5">
                  HOY
                </Text>
              </View>
              {Object.entries(typeCounts).map(([type, count]) => {
                const Icon = TYPE_ICON[type];
                return (
                  <View
                    key={type}
                    className="flex-1 rounded-xl py-2.5 items-center"
                    style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                  >
                    <Icon size={16} color={PURPLE} />
                    <Text className="text-zinc-400 text-[11px] font-mono font-bold mt-1">
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>

            {list.length > 0 && (
              <View className="flex-row flex-wrap gap-1.5 mt-3">
                {list.slice(0, 5).map((r) => {
                  const Icon = TYPE_ICON[r.type || 'pill'] || Pill;
                  return (
                    <View
                      key={r.id}
                      className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: 'rgba(168, 85, 247, 0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.25)',
                      }}
                    >
                      <Icon size={10} color={PURPLE} />
                      <Text className="text-purple-300 text-[10px] font-bold" numberOfLines={1}>
                        {r.name}
                      </Text>
                    </View>
                  );
                })}
                {list.length > 5 && (
                  <Text className="text-zinc-600 text-[10px] self-center ml-1">
                    +{list.length - 5}
                  </Text>
                )}
              </View>
            )}

            {nextSlot && (
              <View className="flex-row items-center gap-2 mt-3">
                <Clock size={12} color={PURPLE} />
                <Text className="flex-1 text-zinc-400 text-[11px] font-mono" numberOfLines={1}>
                  PRÓXIMA TOMA {formatTime12h(nextSlot.time)} · {nextSlot.names.join(', ')}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
