// ============================================================================
// HORIZONTAL CARD SLIDER 16:9 — Componente reutilizable
// Carrusel horizontal con snap-to-center y botón "+" para agregar.
// Usado en la pantalla Sport para "Equipo" y "Lugares".
// ============================================================================

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';

export interface HorizontalCardSlider16x9Props<T> {
  /** Título de la sección, ej. "EQUIPO" / "LUGARES" */
  title: string;
  data: T[];
  keyExtractor: (item: T) => string;
  /** Recibe el item y el ancho calculado de la tarjeta (16:9 aplica al bloque de media interno) */
  renderCard: (item: T, cardWidth: number) => React.ReactElement;
  onAddPress: () => void;
  accentColor?: string;
  emptyLabel?: string;
  /** Fracción del ancho de pantalla que ocupa cada tarjeta (default 0.72) */
  cardWidthRatio?: number;
  loading?: boolean;
}

export function HorizontalCardSlider16x9<T>({
  title,
  data,
  keyExtractor,
  renderCard,
  onAddPress,
  accentColor = '#DC2626',
  emptyLabel = 'Aún no agregaste nada',
  cardWidthRatio = 0.72,
  loading = false,
}: HorizontalCardSlider16x9Props<T>) {
  const { width: screenWidth } = useWindowDimensions();
  const CARD_WIDTH = Math.min(320, screenWidth * cardWidthRatio);
  const GAP = 12;
  const SIDE_PADDING = Math.max(16, (screenWidth - CARD_WIDTH) / 2);
  const EMPTY_HEIGHT = (CARD_WIDTH * 9) / 16 + 56;

  return (
    <View className="mb-7">
      {/* Header: título + botón "+" a la derecha */}
      <View className="flex-row items-center justify-between px-4 mb-3">
        <Text className="text-white font-bold text-base tracking-widest">{title}</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAddPress();
          }}
          activeOpacity={0.8}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: accentColor }}
        >
          <Plus color="#FFFFFF" size={20} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View
          style={{ height: EMPTY_HEIGHT, marginHorizontal: 16 }}
          className="items-center justify-center"
        >
          <Text className="text-zinc-600 text-xs">Cargando...</Text>
        </View>
      ) : data.length === 0 ? (
        <TouchableOpacity
          onPress={onAddPress}
          activeOpacity={0.8}
          style={{
            marginHorizontal: 16,
            width: CARD_WIDTH,
            height: EMPTY_HEIGHT,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#27272a',
            borderStyle: 'dashed',
          }}
          className="items-center justify-center bg-zinc-950"
        >
          <Plus color="#52525b" size={26} />
          <Text className="text-zinc-600 text-xs font-semibold mt-2 px-4 text-center">
            {emptyLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={data}
          horizontal
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          // Snap-to-center: el padding lateral centra la 1ra/última tarjeta,
          // y cada salto de scroll equivale a exactamente 1 tarjeta + gap.
          snapToInterval={CARD_WIDTH + GAP}
          decelerationRate="fast"
          snapToAlignment="start"
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          renderItem={({ item }) => renderCard(item, CARD_WIDTH)}
        />
      )}
    </View>
  );
}
