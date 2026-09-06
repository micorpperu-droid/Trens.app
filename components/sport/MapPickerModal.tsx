// ============================================================================
// MAP PICKER MODAL — Buscador de lugares estilo Google Maps (sin API key)
// Usa Nominatim/OpenStreetMap para buscar por texto. Al elegir un resultado,
// pide confirmar/editar el NOMBRE del pin antes de devolver
// { name, address, latitude, longitude, mapsUrl } — ese nombre se muestra
// luego sobre el pin en la vista previa (StaticMapPreview).
// ============================================================================

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { MapPin, Search, X, ChevronLeft, Check, LocateFixed } from 'lucide-react-native';
import * as Location from 'expo-location';
import { BottomSheetModal } from '../ui/BottomSheetModal';
import * as Haptics from '../../lib/haptics';
import { StaticMapPreview } from './StaticMapPreview';

export interface PickedPlace {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  mapsUrl: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: PickedPlace) => void;
  accentColor?: string;
}

export function MapPickerModal({
  visible,
  onClose,
  onSelect,
  accentColor = '#DC2626',
}: MapPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingResult, setPendingResult] = useState<NominatimResult | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al abrir el modal: resetear estado y pedir la ubicación actual del usuario
  // para mostrarla automáticamente con un pin, antes de buscar nada.
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setPendingResult(null);
      setPendingName('');
      setCurrentCoords(null);
      return;
    }

    (async () => {
      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentCoords(null);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setCurrentCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch (error) {
        console.error('Error obteniendo ubicación actual:', error);
        setCurrentCoords(null);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=8&addressdetails=0`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await response.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error buscando lugar:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Paso 1: elegir un resultado de la búsqueda → pasa al paso de nombrar el pin
  const handlePickResult = (result: NominatimResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPendingResult(result);
    setPendingName(result.display_name.split(',')[0].trim());
  };

  // Alternativa al paso 1: usar la ubicación actual mostrada automáticamente
  const handlePickCurrentLocation = async () => {
    if (!currentCoords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let displayName = 'Mi ubicación actual';
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${currentCoords.lat}&lon=${currentCoords.lon}&format=json`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await response.json();
      if (data?.display_name) displayName = data.display_name;
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
    }
    setPendingResult({
      place_id: -1,
      display_name: displayName,
      lat: String(currentCoords.lat),
      lon: String(currentCoords.lon),
    });
    setPendingName(displayName.split(',')[0].trim());
  };

  // Paso 2: confirmar el nombre del pin → devuelve el lugar final
  const handleConfirmName = () => {
    if (!pendingResult) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const latitude = parseFloat(pendingResult.lat);
    const longitude = parseFloat(pendingResult.lon);
    onSelect({
      name: pendingName.trim() || pendingResult.display_name.split(',')[0].trim(),
      address: pendingResult.display_name,
      latitude,
      longitude,
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });
    onClose();
  };

  // ==========================================================================
  // PASO 2 — Nombrar el pin del lugar seleccionado
  // ==========================================================================
  if (pendingResult) {
    const latitude = parseFloat(pendingResult.lat);
    const longitude = parseFloat(pendingResult.lon);

    return (
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title="Nombra el lugar"
        titleIcon={<MapPin size={18} color={accentColor} />}
        showCloseButton
        height="auto"
        accentColor={accentColor}
        footer={
          <View className="px-5 pt-4 flex-row" style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={() => setPendingResult(null)}
              className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 items-center justify-center"
            >
              <ChevronLeft color="#A1A1AA" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmName}
              style={{ backgroundColor: accentColor }}
              className="flex-1 h-12 rounded-xl items-center justify-center flex-row"
            >
              <Check color="#FFFFFF" size={18} />
              <Text className="text-white font-bold ml-2">CONFIRMAR UBICACIÓN</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View className="px-5 pb-4" style={{ gap: 14 }}>
          <StaticMapPreview
            latitude={latitude}
            longitude={longitude}
            label={pendingName}
            aspectRatio={1.85}
          />

          <Text className="text-zinc-500 text-xs" numberOfLines={2}>
            {pendingResult.display_name}
          </Text>

          <View>
            <Text className="text-zinc-500 text-xs font-bold mb-1.5 tracking-wide">
              NOMBRE DEL PIN
            </Text>
            <TextInput
              value={pendingName}
              onChangeText={setPendingName}
              placeholder="Ej. Smart Fit - San Isidro"
              placeholderTextColor="#52525b"
              autoFocus
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white"
            />
          </View>
        </View>
      </BottomSheetModal>
    );
  }

  // ==========================================================================
  // PASO 1 — Buscador
  // ==========================================================================
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Buscar ubicación"
      titleIcon={<MapPin size={18} color={accentColor} />}
      showCloseButton
      height="full"
      accentColor={accentColor}
      scrollable={false}
      contentContainerClassName="px-0"
    >
      <View className="px-5 pt-2 pb-3">
        <View className="flex-row items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <Search color="#71717a" size={16} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Busca un lugar, dirección o negocio..."
            placeholderTextColor="#52525b"
            autoFocus
            autoCapitalize="none"
            className="flex-1 py-3 px-2 text-white"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
              <X color="#71717a" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Vista automática de la ubicación actual (antes de buscar nada) */}
      {query.trim().length < 3 && (
        <View className="px-5 pb-3">
          {locationLoading ? (
            <View className="items-center py-6">
              <ActivityIndicator color={accentColor} />
            </View>
          ) : currentCoords ? (
            <TouchableOpacity onPress={handlePickCurrentLocation} activeOpacity={0.85}>
              <StaticMapPreview
                latitude={currentCoords.lat}
                longitude={currentCoords.lon}
                label="Mi ubicación actual"
                aspectRatio={1.85}
              />
              <View className="flex-row items-center mt-2">
                <LocateFixed size={14} color={accentColor} />
                <Text style={{ color: accentColor }} className="text-xs font-semibold ml-1.5">
                  Usar mi ubicación actual
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text className="text-zinc-600 text-xs text-center py-2">
              Activa el permiso de ubicación para ver tu posición en el mapa
            </Text>
          )}
        </View>
      )}

      {loading && (
        <View className="items-center py-6">
          <ActivityIndicator color={accentColor} />
        </View>
      )}

      {!loading && query.trim().length >= 3 && results.length === 0 && (
        <View className="items-center py-10 px-6">
          <Text className="text-zinc-500 text-sm text-center">
            No encontramos lugares para "{query}"
          </Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.place_id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePickResult(item)}
            activeOpacity={0.7}
            className="flex-row items-start px-5 py-3 border-b border-zinc-900"
          >
            <MapPin color={accentColor} size={18} style={{ marginTop: 2 }} />
            <Text className="text-white text-sm ml-3 flex-1 leading-5">{item.display_name}</Text>
          </TouchableOpacity>
        )}
      />
    </BottomSheetModal>
  );
}
