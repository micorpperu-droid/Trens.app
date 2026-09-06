// ============================================================================
// WEEKDAY TIME PICKER — Botones interactivos Lunes a Domingo (orden horizontal)
// Al tocar un día, abre el selector de hora NATIVO del sistema:
//  - iOS/Android: @react-native-community/datetimepicker
//  - Web/PWA: <input type="time"> real superpuesto (opacidad 0) sobre el botón,
//    así el navegador abre su propio picker nativo con el click real del
//    usuario (más confiable que disparar showPicker()/click() por JS).
// ============================================================================

import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import * as Haptics from '../../lib/haptics';
import { VISUAL_ORDER, SHORT_LABEL, type Weekday } from '../../lib/weekday';
import { BottomSheetModal } from '../ui/BottomSheetModal';

// DateTimePicker solo existe en nativo — import diferido para no romper web
let RNDateTimePicker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNDateTimePicker = require('@react-native-community/datetimepicker').default;
}

export interface WeekdayTimePickerProps {
  /** Hora configurada por día ("HH:MM"), indexada por weekday 0=Dom..6=Sáb */
  value: Partial<Record<Weekday, string>>;
  onChangeDay: (weekday: Weekday, time: string | null) => void;
  accentColor?: string;
}

function timeStringToDate(time?: string): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  if (time) {
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 0, m || 0);
  } else {
    d.setHours(7, 0);
  }
  return d;
}

function dateToTimeString(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function WeekdayTimePicker({
  value,
  onChangeDay,
  accentColor = '#DC2626',
}: WeekdayTimePickerProps) {
  const [activeDay, setActiveDay] = useState<Weekday | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());
  const activeDayRef = useRef<Weekday | null>(null);

  const openPickerForDay = (weekday: Weekday) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    activeDayRef.current = weekday;
    setDraftDate(timeStringToDate(value[weekday]));
    setActiveDay(weekday);
  };

  // Android: el diálogo nativo se auto-cierra y dispara 'set' o 'dismissed'
  const handleAndroidChange = (event: any, selectedDate?: Date) => {
    const weekday = activeDayRef.current;
    setActiveDay(null);
    if (event?.type === 'set' && selectedDate && weekday !== null) {
      onChangeDay(weekday, dateToTimeString(selectedDate));
    }
  };

  // iOS: el picker es un spinner inline — se confirma con el botón "Listo"
  const handleIosChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) setDraftDate(selectedDate);
  };

  const confirmIosPick = () => {
    if (activeDay !== null) {
      onChangeDay(activeDay, dateToTimeString(draftDate));
    }
    setActiveDay(null);
  };

  return (
    <>
      <View className="flex-row" style={{ gap: 6 }}>
        {VISUAL_ORDER.map((weekday) => {
          const time = value[weekday];
          const isSet = !!time;
          return (
            <TouchableOpacity
              key={weekday}
              onPress={() => {
                // En web el <input type="time"> real (overlay) maneja el tap
                if (Platform.OS !== 'web') openPickerForDay(weekday);
              }}
              activeOpacity={0.8}
              className="flex-1 items-center py-2.5 rounded-xl"
              style={{
                backgroundColor: isSet ? `${accentColor}22` : '#18181b',
                borderWidth: 1,
                borderColor: isSet ? accentColor : '#27272a',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Text
                className="text-[10px] font-bold tracking-wide"
                style={{ color: isSet ? accentColor : '#71717a' }}
              >
                {SHORT_LABEL[weekday].toUpperCase().slice(0, 3)}
              </Text>
              <View className="flex-row items-center mt-1.5">
                <Clock size={10} color={isSet ? accentColor : '#52525b'} />
                <Text
                  className="text-[10px] font-mono font-bold ml-1"
                  style={{ color: isSet ? '#FFFFFF' : '#52525b' }}
                >
                  {time || '--:--'}
                </Text>
              </View>

              {Platform.OS === 'web' &&
                React.createElement('input', {
                  type: 'time',
                  value: time || '',
                  'aria-label': `Hora ${SHORT_LABEL[weekday]}`,
                  onChange: (e: any) => onChangeDay(weekday, e.target.value || null),
                  style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                  },
                })}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ANDROID: diálogo nativo imperativo (no renderiza UI propia) */}
      {Platform.OS === 'android' && activeDay !== null && RNDateTimePicker && (
        <RNDateTimePicker
          value={draftDate}
          mode="time"
          is24Hour
          display="default"
          onChange={handleAndroidChange}
        />
      )}

      {/* iOS: spinner dentro de un bottom sheet con botón de confirmar */}
      {Platform.OS === 'ios' && (
        <BottomSheetModal
          visible={activeDay !== null}
          onClose={() => setActiveDay(null)}
          title={activeDay !== null ? `Hora — ${SHORT_LABEL[activeDay]}` : ''}
          titleIcon={<Clock size={18} color={accentColor} />}
          accentColor={accentColor}
          height="auto"
          scrollable={false}
          footer={
            <View className="px-5 pt-4">
              <TouchableOpacity
                onPress={confirmIosPick}
                style={{ backgroundColor: accentColor }}
                className="h-12 rounded-xl items-center justify-center flex-row"
              >
                <Check color="#FFFFFF" size={18} />
                <Text className="text-white font-bold ml-2">LISTO</Text>
              </TouchableOpacity>
            </View>
          }
        >
          {activeDay !== null && RNDateTimePicker && (
            <View className="items-center py-2">
              <RNDateTimePicker
                value={draftDate}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleIosChange}
              />
            </View>
          )}
        </BottomSheetModal>
      )}
    </>
  );
}
