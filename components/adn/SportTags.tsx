// ============================================================================
// SPORT TAGS — Deportes del usuario en versión mínima (solo lectura),
// pensados para ir debajo de las etiquetas PRO / ÉLITE en CEO.
// ============================================================================

import React from 'react';
import { View, Text } from 'react-native';
import { Dumbbell, Bike, Car, Waves, LucideIcon } from 'lucide-react-native';
import { useSport } from '../../context/SportContext';

const SPORT_ICON_MAP: Record<string, LucideIcon> = { Dumbbell, Bike, Car, Waves };

export function SportTags() {
  const { allSports, userSports } = useSport();
  const mySports = allSports.filter((s) => userSports.some((us) => us.sport_id === s.id));

  if (mySports.length === 0) return null;

  return (
    <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
      {mySports.map((sport) => {
        const Icon = SPORT_ICON_MAP[sport.icon] || Dumbbell;
        return (
          <View key={sport.id} className="flex-row items-center gap-1">
            <Icon size={11} color={sport.color_primary || '#71717a'} />
            <Text className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase">
              {sport.code}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default SportTags;
