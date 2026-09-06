// ============================================================================
// SPORT EQUIPMENT LOCATION SCREEN — Pantalla Sport para deportes != GYM
// Muestra: título del deporte + slider "Equipo" + slider "Lugares".
// Reemplaza (para MOTO/AUTO/SURF) el contenido del tab Sport (antes Gym).
// ============================================================================

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../app/_layout';
import { supabase } from '../../lib/supabase';
import { useSport } from '../../context/SportContext';
import type { Sport, Equipment, SportLocation } from '../../types/sport';
import type { SportEvent } from '../../types/sport';
import type { Weekday } from '../../lib/weekday';
import { HorizontalCardSlider16x9 } from './HorizontalCardSlider16x9';
import { EquipmentCard } from './EquipmentCard';
import { LocationCard } from './LocationCard';
import { AddEquipmentModal } from './AddEquipmentModal';
import { AddLocationModal } from './AddLocationModal';
import { WeekdayTimePicker } from './WeekdayTimePicker';
import { SportNotesBoard } from './SportNotesBoard';
import { SportEventCard } from './SportEventCard';
import { AddSportEventModal } from './AddSportEventModal';

interface SportEquipmentLocationScreenProps {
  sport: Sport;
}

export function SportEquipmentLocationScreen({ sport }: SportEquipmentLocationScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { userSports } = useSport();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [locations, setLocations] = useState<SportLocation[]>([]);
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [trainingSchedule, setTrainingSchedule] = useState<Partial<Record<Weekday, string>>>({});
  const [boardNote, setBoardNote] = useState('');
  const [boardImages, setBoardImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [equipmentModalVisible, setEquipmentModalVisible] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SportLocation | null>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SportEvent | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [equipmentRes, locationsRes, eventsRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport_id', sport.id)
          .eq('category_code', 'EQUIPMENT')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false }),
        supabase
          .from('sport_locations')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport_id', sport.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('sport_events')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport_id', sport.id)
          .order('event_date', { ascending: true })
          .order('event_time', { ascending: true }),
      ]);

      if (equipmentRes.error) throw equipmentRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setEquipment(equipmentRes.data || []);
      setLocations(locationsRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (error) {
      console.error('Error cargando Equipo/Lugares/Eventos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, sport.id]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Sincroniza el horario (user_sports.sport_profile.training_schedule) cuando
  // cambia el deporte activo o se recarga el contexto de deportes
  useEffect(() => {
    const userSport = userSports.find((us) => us.sport_id === sport.id);
    setTrainingSchedule(userSport?.sport_profile?.training_schedule || {});
    setBoardNote(userSport?.sport_profile?.board_note || '');
    setBoardImages(userSport?.sport_profile?.board_images || []);
  }, [userSports, sport.id]);

  const handleChangeScheduleDay = async (weekday: Weekday, time: string | null) => {
    const updated = { ...trainingSchedule };
    if (time) {
      updated[weekday] = time;
    } else {
      delete updated[weekday];
    }
    setTrainingSchedule(updated);

    if (!user) return;
    try {
      const userSport = userSports.find((us) => us.sport_id === sport.id);
      if (!userSport) return;
      await supabase
        .from('user_sports')
        .update({
          sport_profile: { ...userSport.sport_profile, training_schedule: updated },
        })
        .eq('id', userSport.id);
    } catch (error) {
      console.error('Error guardando horario:', error);
    }
  };

  const persistBoardField = async (patch: Record<string, any>) => {
    if (!user) return;
    try {
      const userSport = userSports.find((us) => us.sport_id === sport.id);
      if (!userSport) return;
      await supabase
        .from('user_sports')
        .update({ sport_profile: { ...userSport.sport_profile, ...patch } })
        .eq('id', userSport.id);
    } catch (error) {
      console.error('Error guardando la pizarra:', error);
    }
  };

  const handleSaveBoardNote = (text: string) => {
    setBoardNote(text);
    persistBoardField({ board_note: text });
  };

  const handleBoardImagesChange = (images: string[]) => {
    setBoardImages(images);
    persistBoardField({ board_images: images });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const accentColor = sport.color_primary || '#DC2626';

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + (Platform.OS === 'web' ? 24 : 64),
          paddingBottom: 140,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={accentColor}
          />
        }
      >
        <View className="px-4 mb-6">
          <Text className="text-white font-bold text-2xl">{sport.name}</Text>
          {!!sport.description && (
            <Text className="text-zinc-500 text-sm mt-1">{sport.description}</Text>
          )}
        </View>

        <HorizontalCardSlider16x9<Equipment>
          title="EQUIPO"
          data={equipment}
          loading={loading}
          keyExtractor={(item) => item.id}
          accentColor={accentColor}
          emptyLabel="Agrega tu primer equipo"
          onAddPress={() => {
            setEditingEquipment(null);
            setEquipmentModalVisible(true);
          }}
          renderCard={(item, cardWidth) => (
            <EquipmentCard
              item={item}
              cardWidth={cardWidth}
              onPress={() => {
                setEditingEquipment(item);
                setEquipmentModalVisible(true);
              }}
            />
          )}
        />

        <HorizontalCardSlider16x9<SportLocation>
          title="LUGARES"
          data={locations}
          loading={loading}
          keyExtractor={(item) => item.id}
          accentColor={accentColor}
          emptyLabel="Agrega tu primer lugar"
          onAddPress={() => {
            setEditingLocation(null);
            setLocationModalVisible(true);
          }}
          renderCard={(item, cardWidth) => (
            <LocationCard
              item={item}
              cardWidth={cardWidth}
              onPress={() => {
                setEditingLocation(item);
                setLocationModalVisible(true);
              }}
            />
          )}
        />

        {/* HORARIO — día por día, toca un botón para abrir el selector de hora nativo */}
        <View className="px-4 mb-7">
          <Text className="text-white font-bold text-base tracking-widest mb-3">HORARIO</Text>
          <WeekdayTimePicker
            value={trainingSchedule}
            onChangeDay={handleChangeScheduleDay}
            accentColor={accentColor}
          />
        </View>

        {/* PIZARRA — notas libres + imágenes del deporte */}
        {user && (
          <SportNotesBoard
            userId={user.id}
            note={boardNote}
            images={boardImages}
            onSaveNote={handleSaveBoardNote}
            onImagesChange={handleBoardImagesChange}
            accentColor={accentColor}
          />
        )}

        {/* EVENTOS — se agendan aquí y aparecen como tarjeta en el timeline de CEO */}
        <HorizontalCardSlider16x9<SportEvent>
          title="EVENTOS"
          data={events}
          loading={loading}
          keyExtractor={(item) => item.id}
          accentColor={accentColor}
          emptyLabel="Agenda tu primer evento"
          onAddPress={() => {
            setEditingEvent(null);
            setEventModalVisible(true);
          }}
          renderCard={(item, cardWidth) => (
            <SportEventCard
              item={item}
              cardWidth={cardWidth}
              onPress={() => {
                setEditingEvent(item);
                setEventModalVisible(true);
              }}
            />
          )}
        />
      </ScrollView>

      {user && (
        <AddEquipmentModal
          visible={equipmentModalVisible}
          onClose={() => setEquipmentModalVisible(false)}
          userId={user.id}
          sportId={sport.id}
          editingItem={editingEquipment}
          accentColor={accentColor}
          onSaved={(item) => {
            setEquipment((prev) => {
              const exists = prev.some((e) => e.id === item.id);
              return exists ? prev.map((e) => (e.id === item.id ? item : e)) : [item, ...prev];
            });
          }}
          onDeleted={(id) => setEquipment((prev) => prev.filter((e) => e.id !== id))}
        />
      )}

      {user && (
        <AddLocationModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
          userId={user.id}
          sportId={sport.id}
          editingItem={editingLocation}
          accentColor={accentColor}
          onSaved={(item) => {
            setLocations((prev) => {
              const exists = prev.some((l) => l.id === item.id);
              return exists ? prev.map((l) => (l.id === item.id ? item : l)) : [item, ...prev];
            });
          }}
          onDeleted={(id) => setLocations((prev) => prev.filter((l) => l.id !== id))}
        />
      )}

      {user && (
        <AddSportEventModal
          visible={eventModalVisible}
          onClose={() => setEventModalVisible(false)}
          userId={user.id}
          sportId={sport.id}
          editingItem={editingEvent}
          accentColor={accentColor}
          onSaved={(item) => {
            setEvents((prev) => {
              const exists = prev.some((e) => e.id === item.id);
              return exists ? prev.map((e) => (e.id === item.id ? item : e)) : [...prev, item];
            });
          }}
          onDeleted={(id) => setEvents((prev) => prev.filter((e) => e.id !== id))}
        />
      )}
    </View>
  );
}
