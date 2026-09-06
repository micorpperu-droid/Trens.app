// ============================================================================
// SPORT EVENT CARD — Tarjeta 16:9 para el slider de "Eventos" (Sport)
// Muestra fecha/hora, texto y media del evento agendado.
// ============================================================================

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { PlayCircle, CalendarClock } from 'lucide-react-native';
import type { SportEvent } from '../../types/sport';

interface SportEventCardProps {
  item: SportEvent;
  cardWidth: number;
  onPress: () => void;
}

function formatDateShort(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function SportEventCard({ item, cardWidth, onPress }: SportEventCardProps) {
  const mediaHeight = (cardWidth * 9) / 16;
  const isVideo = item.media_type === 'VIDEO' && !!item.media_url;

  const player = useVideoPlayer(isVideo ? item.media_url! : '', (p) => {
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
        ) : item.media_url ? (
          <Image
            source={{ uri: item.media_url }}
            style={{ width: cardWidth, height: mediaHeight }}
            contentFit="cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <CalendarClock color="#3f3f46" size={28} />
          </View>
        )}
      </View>

      <View className="p-3">
        <Text className="text-white font-bold text-sm">
          {formatDateShort(item.event_date)}
          {item.event_time ? ` · ${item.event_time}` : ''}
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
