// ============================================================================
// EQUIPMENT CARD — Tarjeta 16:9 para el slider de "Equipo"
// Muestra foto o video del equipo, nombre y notas/especificaciones.
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { PlayCircle, Dumbbell } from 'lucide-react-native';
import type { Equipment } from '../../types/sport';

interface EquipmentCardProps {
  item: Equipment;
  cardWidth: number;
  onPress: () => void;
}

export function EquipmentCard({ item, cardWidth, onPress }: EquipmentCardProps) {
  const mediaHeight = (cardWidth * 9) / 16;
  const isVideo = item.media_type === 'VIDEO' && !!item.video_url;

  const player = useVideoPlayer(isVideo ? item.video_url! : '', (p) => {
    p.loop = true;
    p.muted = true;
    p.pause();
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ width: cardWidth, borderRadius: 16, overflow: 'hidden', backgroundColor: '#18181b' }}
      className="border border-zinc-800"
    >
      <View style={{ width: cardWidth, height: mediaHeight, backgroundColor: '#27272a' }}>
        {isVideo ? (
          <>
            <VideoView
              player={player}
              style={{ width: cardWidth, height: mediaHeight }}
              contentFit="cover"
              nativeControls={false}
            />
            <View className="absolute inset-0 items-center justify-center">
              <PlayCircle color="rgba(255,255,255,0.9)" size={34} />
            </View>
          </>
        ) : item.photo_url ? (
          <Image
            source={{ uri: item.photo_url }}
            style={{ width: cardWidth, height: mediaHeight }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Dumbbell color="#3f3f46" size={28} />
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>
          {item.name}
        </Text>
        {!!item.notes && (
          <Text className="text-zinc-400 text-xs mt-1" numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
