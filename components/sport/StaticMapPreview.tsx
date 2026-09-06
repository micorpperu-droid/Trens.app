// ============================================================================
// STATIC MAP PREVIEW — Vista previa tipo mapa (sin API key, tiles de OSM)
// Muestra el tile que contiene el punto + un pin en su posición exacta.
// Soporta relación de aspecto rectangular (ej. 1.85:1) recortando el tile
// (contentFit="cover") y recalculando la posición del pin en consecuencia.
// Tocar abre el link real de Maps (mapsUrl) en la app/navegador del sistema.
// ============================================================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { MapPin } from 'lucide-react-native';

interface StaticMapPreviewProps {
  latitude: number;
  longitude: number;
  mapsUrl?: string;
  /** Nombre del lugar, se muestra como etiqueta sobre el pin */
  label?: string;
  zoom?: number;
  borderRadius?: number;
  /** Ancho/alto del recuadro. Default 1 (cuadrado). Ej. 1.85 = horizontal 1.85:1 */
  aspectRatio?: number;
}

/** Matemática estándar de slippy map (OSM/Google) para ubicar un punto dentro de un tile */
function tileInfo(lon: number, lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  return {
    tileX,
    tileY,
    // Posición fraccional del punto dentro del tile (0-256px)
    pixelX: (x - tileX) * 256,
    pixelY: (y - tileY) * 256,
  };
}

export function StaticMapPreview({
  latitude,
  longitude,
  mapsUrl,
  label,
  zoom = 16,
  borderRadius = 12,
  aspectRatio = 1,
}: StaticMapPreviewProps) {
  const [width, setWidth] = useState(0);
  const height = width / aspectRatio;

  const { tileX, tileY, pixelX, pixelY } = useMemo(
    () => tileInfo(longitude, latitude, zoom),
    [latitude, longitude, zoom]
  );
  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  // El tile fuente es siempre cuadrado (256x256). Con contentFit="cover" sobre
  // un recuadro width x height, la escala real = max(width, height) / 256, y el
  // recorte (si el recuadro es más ancho que alto) se hace parejo arriba/abajo.
  const scale = width > 0 ? Math.max(width, height) / 256 : 0;
  const cropX = scale > 0 ? (scale * 256 - width) / 2 : 0;
  const cropY = scale > 0 ? (scale * 256 - height) / 2 : 0;
  const markerX = pixelX * scale - cropX;
  const markerY = pixelY * scale - cropY;

  const content = (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: '100%',
        aspectRatio,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: '#18181b',
      }}
    >
      {width > 0 && (
        <>
          <Image
            source={{ uri: tileUrl }}
            style={{
              width: scale * 256,
              height: scale * 256,
              marginLeft: -cropX,
              marginTop: -cropY,
            }}
            contentFit="cover"
          />
          <View
            style={{
              position: 'absolute',
              left: markerX - 12,
              top: markerY - 24,
              alignItems: 'center',
            }}
          >
            {!!label && (
              <View
                style={{
                  backgroundColor: '#18181b',
                  borderWidth: 1,
                  borderColor: '#DC2626',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginBottom: 2,
                  maxWidth: Math.max(width - 16, 80),
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}
                >
                  {label}
                </Text>
              </View>
            )}
            <MapPin color="#DC2626" size={24} fill="#DC2626" />
          </View>
        </>
      )}
    </View>
  );

  if (!mapsUrl) return content;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL(mapsUrl)}>
      {content}
    </TouchableOpacity>
  );
}
