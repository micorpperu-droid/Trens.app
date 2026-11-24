// ============================================================================
// STACK DAY CARD — Compuestos del stack que tocan en un día (tema morado)
// Al presionarla abre el modal de Stack.
// ============================================================================

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Pill, Syringe, FlaskConical, Droplets, LucideIcon } from 'lucide-react-native';
import { Haptics } from '../../lib/haptics';
import { hankToolsEvent } from '../../lib/hankToolsEvent';

const PURPLE = '#A855F7';

const TYPE_ICON: Record<string, LucideIcon> = {
  pill: Pill,
  syringe: Syringe,
  powder: FlaskConical,
  liquid: Droplets,
};

export interface StackRow {
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

const formatTime12h = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${(h || 0) % 12 || 12}:${String(m || 0).padStart(2, '0')} ${(h || 0) >= 12 ? 'PM' : 'AM'}`;
};

const timesOf = (r: StackRow): string[] =>
  r.times && r.times.length > 0 ? r.times : r.time ? [r.time] : [];

export function StackDayCard({ items }: { items: StackRow[] }) {
  // Con hora primero (ordenados); pre/post entreno y sin hora al final
  const sorted = [...items].sort((a, b) => {
    const ta = timesOf(a)[0];
    const tb = timesOf(b)[0];
    if (!!ta !== !!tb) return ta ? -1 : 1;
    return (ta || '').localeCompare(tb || '');
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        hankToolsEvent.open('stack');
      }}
      className="mb-4 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.4)',
      }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          <Pill size={14} color={PURPLE} />
          <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">STACK</Text>
        </View>
        <Text className="text-[10px] font-mono font-bold" style={{ color: PURPLE }}>
          {sorted.length} {sorted.length === 1 ? 'COMPUESTO' : 'COMPUESTOS'}
        </Text>
      </View>

      <View className="gap-2">
        {sorted.map((r) => {
          const Icon = TYPE_ICON[r.type || 'pill'] || Pill;
          const times = timesOf(r);
          const when = r.is_pre_workout
            ? 'PRE-ENTRENO'
            : r.is_post_workout
              ? 'POST-ENTRENO'
              : times.map(formatTime12h).join(' · ');
          return (
            <View key={r.id} className="flex-row items-center gap-2.5">
              <View
                className="w-7 h-7 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.18)' }}
              >
                <Icon size={13} color={PURPLE} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-bold" numberOfLines={1}>
                  {r.name}
                </Text>
                {!!r.dose && <Text className="text-zinc-500 text-[10px] font-mono">{r.dose}</Text>}
              </View>
              {!!when && (
                <Text className="text-[10px] font-mono font-bold" style={{ color: PURPLE }}>
                  {when}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

export default StackDayCard;
