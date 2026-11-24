// ============================================================================
// EQUIPMENT SUMMARY CARD — Equipo del usuario en todos sus deportes.
// Scroll horizontal interno; tocar un equipo abre ese deporte en SPORT.
// ============================================================================

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Dumbbell, Bike, Car, Waves, Package, ChevronRight, LucideIcon } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { supabase } from '../../lib/supabase';
import { useSport } from '../../context/SportContext';

const ORANGE = '#F97316';
const TILE_W = 132;

const SPORT_ICON_MAP: Record<string, LucideIcon> = { Dumbbell, Bike, Car, Waves };

interface EquipmentRow {
  id: string;
  sport_id: string;
  name: string;
  brand: string | null;
  model: string | null;
  photo_url: string | null;
}

export default function EquipmentSummaryCard({ userId }: { userId: string }) {
  const { allSports, userSports } = useSport();
  const [rows, setRows] = useState<EquipmentRow[] | null>(null);

  const mySports = useMemo(
    () => allSports.filter((s) => userSports.some((us) => us.sport_id === s.id)),
    [allSports, userSports]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('id, sport_id, name, brand, model, photo_url')
          .eq('user_id', userId)
          .eq('category_code', 'EQUIPMENT')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false });
        if (!active) return;
        if (error) console.error('Error cargando equipo:', error);
        else setRows((data as EquipmentRow[]) || []);
      })();
      return () => {
        active = false;
      };
    }, [userId])
  );

  const items = (rows || []).filter((r) => mySports.some((s) => s.id === r.sport_id));

  const openSport = (sportCode?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/(tabs)/gym',
      params: sportCode ? { sport: sportCode } : {},
    } as any);
  };

  return (
    <View
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        backgroundColor: 'rgba(15, 10, 5, 0.92)',
        borderWidth: 1.5,
        borderColor: 'rgba(249, 115, 22, 0.4)',
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openSport()}
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ borderBottomColor: 'rgba(249, 115, 22, 0.25)' }}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)' }}
          >
            <Package size={14} color={ORANGE} />
          </View>
          <View>
            <Text className="text-white text-xs font-black uppercase tracking-widest">Equipo</Text>
            <Text className="text-zinc-500 text-[10px] font-mono">
              {rows === null
                ? 'Cargando...'
                : `${items.length} ${items.length === 1 ? 'equipo' : 'equipos'} en tus deportes`}
            </Text>
          </View>
        </View>
        <ChevronRight size={16} color={ORANGE} />
      </TouchableOpacity>

      {rows !== null && items.length === 0 ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => openSport()} className="p-4 items-center">
          <Package size={26} color="#3f3f46" />
          <Text className="text-zinc-500 text-xs font-mono mt-2 text-center">
            Sin equipo. Agrégalo desde SPORT
          </Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        >
          {items.map((item) => {
            const sport = mySports.find((s) => s.id === item.sport_id);
            const color = sport?.color_primary || ORANGE;
            const Icon = (sport && SPORT_ICON_MAP[sport.icon]) || Package;
            const subtitle = [item.brand, item.model].filter(Boolean).join(' ');

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => openSport(sport?.code)}
                style={{ width: TILE_W }}
              >
                <View
                  className="rounded-xl overflow-hidden items-center justify-center"
                  style={{
                    width: TILE_W,
                    height: (TILE_W * 9) / 16 + 20,
                    backgroundColor: '#0a0a0a',
                    borderWidth: 1,
                    borderColor: `${color}55`,
                  }}
                >
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <Icon size={30} color={color} />
                  )}
                </View>
                <Text className="text-white text-[11px] font-bold mt-1.5" numberOfLines={1}>
                  {item.name}
                </Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <Text className="text-zinc-500 text-[10px] flex-1" numberOfLines={1}>
                    {subtitle || sport?.name || ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
