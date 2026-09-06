// ============================================================================
// EVENT TIMELINE CARD — Tarjeta genérica/flexible para el timeline de CEO
// Solo recibe: Hora, Ubicación (Maps), Texto y un archivo multimedia adjunto.
// Se alimenta de eventos creados desde la sección Sport (sport_events).
// ============================================================================

import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Haptics } from '../../lib/haptics';
import { MapPin, PlayCircle, CalendarClock } from 'lucide-react-native';
import { StaticMapPreview } from '../sport/StaticMapPreview';

// ============================================================================
// TYPES
// ============================================================================
export interface TimelineEventData {
  id: string;
  event_time?: string | null;
  maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
  notes?: string | null;
  media_url?: string | null;
  media_type?: 'PHOTO' | 'VIDEO' | null;
}

interface EventTimelineCardProps {
  event: TimelineEventData;
  accentColor?: string;
  onDelete?: (id: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================
const formatTimeToAMPM = (time24?: string | null): string | null => {
  if (!time24) return null;
  const [hours, minutes] = time24.split(':').map((s) => parseInt(s, 10));
  const h = hours || 0;
  const m = minutes || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

// ============================================================================
// COMPONENT
// ============================================================================
export const EventTimelineCard: React.FC<EventTimelineCardProps> = ({
  event,
  accentColor = '#0EA5E9',
  onDelete,
}) => {
  const displayTime = formatTimeToAMPM(event.event_time);
  const isVideo = event.media_type === 'VIDEO' && !!event.media_url;

  const player = useVideoPlayer(isVideo ? event.media_url! : '', (p) => {
    p.loop = true;
    p.muted = true;
    p.pause();
  });

  return (
    <Pressable
      onLongPress={() => {
        if (!onDelete) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onDelete(event.id);
      }}
      className="mb-4 ml-6 relative"
    >
      {/* Timeline dot */}
      <View
        className="absolute -left-[14px] top-5 w-3.5 h-3.5 rounded-full border-2 border-zinc-900"
        style={{
          backgroundColor: accentColor,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
        }}
      />

      {/* Card */}
      <View
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.95)',
          borderWidth: 1,
          borderColor: `${accentColor}35`,
          shadowColor: accentColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        }}
      >
        {/* Header: hora */}
        <View className="flex-row items-center justify-between px-4 pt-3">
          <View className="flex-row items-center gap-1.5">
            <CalendarClock size={14} color={accentColor} />
            <Text className="text-zinc-500 text-[10px] font-bold tracking-widest">EVENTO</Text>
          </View>
          {displayTime && (
            <View className="px-3 py-1 rounded-lg" style={{ backgroundColor: `${accentColor}30` }}>
              <Text style={{ color: accentColor }} className="text-xs font-bold font-mono">
                {displayTime}
              </Text>
            </View>
          )}
        </View>

        {/* Texto */}
        {!!event.notes && (
          <Text className="text-white text-sm px-4 pt-2 pb-1 leading-5">{event.notes}</Text>
        )}

        {/* Ubicación (Maps) — vista previa tipo mapa si hay coordenadas */}
        {event.latitude != null && event.longitude != null ? (
          <View className="px-4 pb-3" style={{ gap: 6 }}>
            <StaticMapPreview
              latitude={event.latitude}
              longitude={event.longitude}
              mapsUrl={event.maps_url || undefined}
              label={event.location || undefined}
              aspectRatio={1.85}
            />
          </View>
        ) : (
          !!event.maps_url && (
            <Pressable
              onPress={() => Linking.openURL(event.maps_url!)}
              className="flex-row items-center px-4 pb-2"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <MapPin size={13} color={accentColor} />
              <Text style={{ color: accentColor }} className="text-xs font-semibold ml-1.5">
                Ver ubicación en Maps
              </Text>
            </Pressable>
          )
        )}

        {/* Media adjunta */}
        {!!event.media_url && (
          <View style={{ width: '100%', height: 180, backgroundColor: '#000' }}>
            {isVideo ? (
              <>
                <VideoView
                  player={player}
                  style={{ width: '100%', height: 180 }}
                  contentFit="cover"
                  nativeControls={false}
                />
                <View className="absolute inset-0 items-center justify-center">
                  <PlayCircle color="rgba(255,255,255,0.9)" size={40} />
                </View>
              </>
            ) : (
              <Image
                source={{ uri: event.media_url }}
                style={{ width: '100%', height: 180 }}
                contentFit="cover"
              />
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default EventTimelineCard;
