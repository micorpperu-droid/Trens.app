// ============================================================================
// SPORT SELECTOR BAR — Selector tipo botón para alternar entre los deportes
// que el usuario agregó en su perfil (Prime). Overlay flotante global,
// solo visible dentro de la pantalla Sport (antes "Gym").
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Dumbbell, Bike, Car, Waves, LucideIcon } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { useSport } from '../../context/SportContext';

const SPORT_ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Bike,
  Car,
  Waves,
};

export function SportSelectorBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { allSports, userSports, activeSport, setActiveSport, loading } = useSport();

  const isOnSportTab = !!pathname && pathname.includes('/gym');

  if (!isOnSportTab || loading) return null;

  const mySportIds = userSports.map((us) => us.sport_id);
  const mySports = allSports.filter((s) => mySportIds.includes(s.id));

  // Con un solo deporte no hay nada que alternar — no molestar la vista de GYM
  if (mySports.length <= 1) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 6,
        left: 0,
        right: 0,
        zIndex: 50,
        alignItems: 'center',
      }}
    >
      <View
        pointerEvents="auto"
        className="flex-row bg-black/85 border border-zinc-800 rounded-full p-1.5"
        style={{ gap: 4 }}
      >
        {mySports.map((sport) => {
          const Icon = SPORT_ICON_MAP[sport.icon] || Dumbbell;
          const isActive = activeSport?.id === sport.id;
          const color = sport.color_primary || '#DC2626';

          return (
            <TouchableOpacity
              key={sport.id}
              onPress={() => {
                if (isActive) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setActiveSport(sport.code);
              }}
              activeOpacity={0.8}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: isActive ? color : 'transparent' }}
            >
              <Icon color={isActive ? '#FFFFFF' : '#71717a'} size={15} />
              <Text
                className="ml-1.5 text-xs font-bold"
                style={{ color: isActive ? '#FFFFFF' : '#71717a' }}
              >
                {sport.tab_4_name || sport.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
