// ============================================================================
// LOCATION CARD — Tarjeta 16:9 para el slider de "Lugares"
// Muestra foto del lugar, nombre, link a Maps y notas/especificaciones.
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { MapPin, MapPinned } from 'lucide-react-native';
import type { SportLocation } from '../../types/sport';
import { StaticMapPreview } from './StaticMapPreview';

interface LocationCardProps {
  item: SportLocation;
  cardWidth: number;
  onPress: () => void;
}

export function LocationCard({ item, cardWidth, onPress }: LocationCardProps) {
  const mediaHeight = (cardWidth * 9) / 16;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: cardWidth, borderRadius: 16, overflow: 'hidden', backgroundColor: '#18181b' }}
      className="border border-zinc-800"
    >
      <View style={{ width: cardWidth, height: mediaHeight, backgroundColor: '#27272a' }}>
        {item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={{ width: cardWidth, height: mediaHeight }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <MapPinned color="#3f3f46" size={28} />
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>
          {item.name}
        </Text>

        {item.latitude != null && item.longitude != null ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              if (item.maps_url) Linking.openURL(item.maps_url);
            }}
            className="flex-row items-center mt-2"
            style={{ gap: 8 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden' }}>
              <StaticMapPreview latitude={item.latitude} longitude={item.longitude} />
            </View>
            <Text className="text-red-500 text-xs font-semibold">Ver en Maps</Text>
          </TouchableOpacity>
        ) : (
          !!item.maps_url && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(item.maps_url!);
              }}
              className="flex-row items-center mt-1"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <MapPin color="#DC2626" size={12} />
              <Text className="text-red-500 text-xs font-semibold ml-1">Ver en Maps</Text>
            </TouchableOpacity>
          )
        )}

        {!!item.notes && (
          <Text className="text-zinc-400 text-xs mt-1" numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
