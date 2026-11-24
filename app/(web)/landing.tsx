// ============================================================================
// LANDING PAGE - TRENS
// Sistema de alto rendimiento: productividad + deportes extremos.
// Lenguaje visual angular / HUD (esquinas cortadas, diagonales, líneas técnicas).
// Solo visible desde web (no PWA). Página de venta y suscripción.
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import PromoPill from '../../components/ui/PromoPill';
import CoachingModal from '../../components/ui/CoachingModal';
import shopService from '../../services/shop';
import {
  ArrowRight,
  Bike,
  CalendarDays,
  Car,
  Check,
  CreditCard,
  Crosshair,
  Dumbbell,
  Eye,
  EyeOff,
  ListChecks,
  Lock,
  Mail,
  Plus,
  Shield,
  ShieldUser,
  Smartphone,
  StickyNote,
  Truck,
  User,
  Waves,
  Zap,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeInDown,
  FadeInUp,
  FadeInLeft,
} from 'react-native-reanimated';
import openpay, {
  formatCardNumber,
  formatExpiry,
  validateCardNumber,
  getCardBrand,
  getPlanDetails,
  getFormattedPrice,
} from '../../lib/openpay';
import { supabase } from '../../lib/supabase';
import * as Haptics from '../../lib/haptics';
import {
  PhoneInput,
  getDefaultCountry,
  getFullPhoneNumber,
  Country,
} from '../../components/ui/PhoneInput';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_SMALL = SCREEN_WIDTH < 640;
const IS_MOBILE = SCREEN_WIDTH < 1000;
const MAX_W = 1180;
const PAD_X = IS_SMALL ? 18 : 32;
const SLANT = IS_SMALL ? 24 : 48;
// Tamaño del titular: se calcula con el ancho disponible de su columna. "TU DÍA ES UNA" ≈ 8.4em y
// "COMPETENCIA." ≈ 8.5em en una fuente ancha (peor caso), con letterSpacing -2px por letra.
const HERO_COL_W = IS_MOBILE
  ? SCREEN_WIDTH - PAD_X * 2
  : ((Math.min(MAX_W, SCREEN_WIDTH - PAD_X * 2) - 64) * 1.1) / 2.05;
const H1_SIZE = Math.max(28, Math.min(IS_MOBILE ? 64 : 72, Math.floor((HERO_COL_W + 24) / 8.6)));

// ============================================================================
// PALETA
// ============================================================================
const C = {
  red: '#DC2626',
  redDeep: '#991B1B',
  orange: '#F97316',
  yellow: '#FBBF24',
  green: '#22C55E',
  blue: '#38BDF8',
  violet: '#A78BFA',
  panel: '#0B0B0D',
  field: '#101012',
  line: 'rgba(255, 255, 255, 0.12)',
  lineRed: 'rgba(220, 38, 38, 0.6)',
  glowRed: 'rgba(220, 38, 38, 0.6)',
};

// ============================================================================
// FORMAS ANGULARES (clip-path, solo web)
// ============================================================================
/** Esquinas cortadas arriba-izquierda y abajo-derecha. */
const chamfer = (c: number) =>
  `polygon(${c}px 0, 100% 0, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, 0 100%, 0 ${c}px)`;
/** Paralelogramo inclinado (botones, etiquetas). */
const slant = (c: number) => `polygon(${c}px 0, 100% 0, calc(100% - ${c}px) 100%, 0 100%)`;
const clip = (path: string): ViewStyle => ({ clipPath: path }) as any;

const FILL: ViewStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
/** Capa de relleno que queda DETRÁS del contenido (iconos SVG incluidos) dentro de un panel recortado. */
const BEHIND: ViewStyle = { ...FILL, zIndex: -1 };

/** Panel con borde de 1px y esquinas cortadas (borde = capa exterior + capa interior recortada). */
const AngularPanel = ({
  children,
  cut = 16,
  border = C.line,
  bg = C.panel,
  style,
  innerStyle,
}: {
  children?: React.ReactNode;
  cut?: number;
  border?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}) => (
  <View style={[{ padding: 1, backgroundColor: border }, clip(chamfer(cut)), style]}>
    <View
      style={[
        { backgroundColor: '#050506', flexGrow: 1 },
        clip(chamfer(Math.max(cut - 0.6, 1))),
        innerStyle,
      ]}
    >
      <View pointerEvents="none" style={[BEHIND, { backgroundColor: bg }]} />
      {children}
    </View>
  </View>
);

/** Esquinas de mira (HUD) alrededor de un contenedor relativo. */
const Brackets = ({
  color = C.red,
  size = 16,
  inset = 0,
}: {
  color?: string;
  size?: number;
  inset?: number;
}) => (
  <>
    {[
      { top: inset, left: inset, borderTopWidth: 2, borderLeftWidth: 2 },
      { top: inset, right: inset, borderTopWidth: 2, borderRightWidth: 2 },
      { bottom: inset, left: inset, borderBottomWidth: 2, borderLeftWidth: 2 },
      { bottom: inset, right: inset, borderBottomWidth: 2, borderRightWidth: 2 },
    ].map((pos, i) => (
      <View
        key={i}
        pointerEvents="none"
        style={[{ position: 'absolute', width: size, height: size, borderColor: color }, pos]}
      />
    ))}
  </>
);

// ============================================================================
// FONDOS Y EFECTOS
// ============================================================================
/** Cuadrícula técnica con desvanecido hacia abajo. */
const GridBackdrop = ({ opacity = 1 }: { opacity?: number }) => (
  <View
    pointerEvents="none"
    style={
      {
        ...FILL,
        opacity,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 30%, transparent 95%)',
        maskImage: 'linear-gradient(to bottom, #000 30%, transparent 95%)',
      } as any
    }
  />
);

/** Haz de luz diagonal animado. */
const LightBeam = ({
  left,
  color = C.red,
  delay = 0,
  rotate = '24deg',
  width = 150,
}: {
  left: string;
  color?: string;
  delay?: number;
  rotate?: string;
  width?: number;
}) => {
  const o = useSharedValue(0.08);

  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.08, { duration: 3200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, o]);

  const beamStyle = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -160,
          left: left as any,
          width,
          height: 1100,
          transform: [{ rotate }],
        },
        beamStyle,
      ]}
    >
      <LinearGradient
        colors={['transparent', color, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

/** Chispa cuadrada que asciende (brasa angular). */
const FloatingParticle = ({
  delay = 0,
  left = 50,
  color = C.orange,
}: {
  delay?: number;
  left?: number;
  color?: string;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-SCREEN_HEIGHT * 0.85, {
            duration: 7000 + Math.random() * 4000,
            easing: Easing.linear,
          }),
          withTiming(0, { duration: 0 })
        ),
        -1
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.35, { duration: 5000 }),
          withTiming(0, { duration: 1000 })
        ),
        -1
      )
    );
  }, [delay, opacity, translateY]);

  const particleStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    bottom: -20,
    left: `${left}%`,
    width: 3,
    height: 3,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { rotate: '45deg' }],
  }));

  return <Animated.View pointerEvents="none" style={particleStyle} />;
};

/** Indicador de estado parpadeante (cuadrado). */
const PulseSquare = ({ color = C.red, size = 8 }: { color?: string; size?: number }) => {
  const o = useSharedValue(1);

  useEffect(() => {
    o.value = withRepeat(
      withSequence(withTiming(0.2, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1
    );
  }, [o]);

  const s = useAnimatedStyle(() => ({ opacity: o.value }));

  return <Animated.View style={[{ width: size, height: size, backgroundColor: color }, s]} />;
};

// ============================================================================
// ESTRUCTURA
// ============================================================================
/** Sección con borde superior inclinado y línea de acento diagonal. */
const SlantedSection = ({
  children,
  bg = '#09090b',
  nativeID,
}: {
  children: React.ReactNode;
  bg?: string;
  nativeID?: string;
}) => (
  <View nativeID={nativeID} style={{ marginTop: -SLANT }}>
    <View
      style={[
        {
          backgroundColor: bg,
          paddingTop: SLANT + (IS_SMALL ? 48 : 88),
          paddingBottom: IS_SMALL ? 56 : 96,
          paddingHorizontal: PAD_X,
          overflow: 'hidden',
        },
        clip(`polygon(0 ${SLANT}px, 100% 0, 100% 100%, 0 100%)`),
      ]}
    >
      {children}
    </View>
    <View
      pointerEvents="none"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, height: SLANT, backgroundColor: C.red },
        clip('polygon(0 calc(100% - 3px), 100% 0, 100% 3px, 0 100%)'),
      ]}
    />
  </View>
);

const SectionTitle = ({
  eyebrow,
  children,
  sub,
}: {
  eyebrow: string;
  children: React.ReactNode;
  sub?: string;
}) => (
  <Animated.View
    entering={FadeInUp.duration(600)}
    style={{ alignItems: 'center', marginBottom: IS_SMALL ? 30 : 52 }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <View style={[{ width: 34, height: 4, backgroundColor: C.red }, clip(slant(4))]} />
      <Text
        className="text-red-500 font-mono uppercase"
        style={{ fontSize: IS_SMALL ? 11 : 12, letterSpacing: 4 }}
      >
        {eyebrow}
      </Text>
      <View style={[{ width: 34, height: 4, backgroundColor: C.red }, clip(slant(4))]} />
    </View>
    <Text
      className="text-white font-black uppercase text-center"
      style={{
        fontSize: IS_SMALL ? 26 : IS_MOBILE ? 38 : 48,
        lineHeight: IS_SMALL ? 30 : IS_MOBILE ? 42 : 52,
        letterSpacing: -1,
        maxWidth: 860,
      }}
    >
      {children}
    </Text>
    {!!sub && (
      <Text
        className="text-zinc-400 text-center"
        style={{
          fontSize: IS_SMALL ? 14 : 17,
          lineHeight: IS_SMALL ? 21 : 26,
          marginTop: 16,
          maxWidth: 560,
        }}
      >
        {sub}
      </Text>
    )}
  </Animated.View>
);

// ============================================================================
// BOTÓN ANGULAR (paralelogramo)
// ============================================================================
const AngularButton = ({
  label,
  onPress,
  loading = false,
  full = false,
  icon: Icon,
  arrow = true,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  full?: boolean;
  icon?: any;
  arrow?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    disabled={loading}
    style={{ alignSelf: full ? 'stretch' : 'flex-start' }}
  >
    <View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          bottom: -6,
          backgroundColor: C.red,
          opacity: loading ? 0 : 0.35,
        }}
        className="blur-xl"
      />
      <View style={clip(slant(18))}>
        <LinearGradient
          colors={loading ? ['#3f3f46', '#27272a'] : [C.red, C.redDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: IS_SMALL ? 17 : 20,
            paddingHorizontal: IS_SMALL ? 28 : 46,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              {Icon ? <Icon size={20} color="white" /> : null}
              <Text
                className="text-white font-black uppercase"
                style={{ fontSize: IS_SMALL ? 15 : 17, letterSpacing: 2 }}
              >
                {label}
              </Text>
              {arrow ? <ArrowRight size={20} color="white" /> : null}
            </>
          )}
        </LinearGradient>
      </View>
    </View>
  </TouchableOpacity>
);

// ============================================================================
// CAMPOS DE FORMULARIO
// ============================================================================
const FieldLabel = ({ children }: { children: string }) => (
  <Text
    className="text-zinc-400 font-mono uppercase"
    style={{ fontSize: 11, letterSpacing: 2, marginBottom: 8 }}
  >
    {children}
  </Text>
);

const Field = ({
  label,
  icon: Icon,
  children,
  rightSlot,
}: {
  label: string;
  icon?: any;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) => (
  <View style={{ marginBottom: 18 }}>
    <FieldLabel>{label}</FieldLabel>
    <AngularPanel
      cut={10}
      border="rgba(255,255,255,0.14)"
      bg={C.field}
      innerStyle={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}
    >
      {Icon ? (
        <View style={{ flexShrink: 0 }}>
          <Icon size={18} color="#71717a" />
        </View>
      ) : null}
      {children}
      {rightSlot}
    </AngularPanel>
  </View>
);

// ============================================================================
// VISTA PREVIA DEL PRODUCTO (timeline "HOY")
// ============================================================================
type MockRowData = {
  time: string;
  tag: string;
  text: string;
  color: string;
  done?: boolean;
  active?: boolean;
};

const MOCK_ROWS: MockRowData[] = [
  { time: '06:30', tag: 'COMIDA', text: 'Desayuno · avena y huevos', color: C.green, done: true },
  { time: '08:00', tag: 'TAREA', text: 'Enviar propuesta al cliente', color: C.red, done: true },
  { time: '10:30', tag: 'EVENTO', text: 'Reunión de directorio', color: C.blue },
  { time: '13:00', tag: 'STACK', text: 'Creatina · Omega-3', color: C.violet },
  { time: '17:30', tag: 'ENTRENO', text: 'Fuerza · tren superior', color: C.orange, active: true },
  { time: '19:30', tag: 'SPORT', text: 'Moto · salida nocturna', color: C.yellow },
];

const MockRow = ({ time, tag, text, color, done, active }: MockRowData) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <Text className="text-zinc-500 font-mono" style={{ fontSize: 11, width: 38 }}>
      {time}
    </Text>
    <View
      style={{
        width: 9,
        height: 9,
        borderWidth: 1.5,
        borderColor: color,
        backgroundColor: done || active ? color : 'transparent',
        transform: [{ rotate: '45deg' }],
      }}
    />
    <View style={{ flex: 1 }}>
      <AngularPanel
        cut={8}
        border={active ? color : `${color}55`}
        bg={active ? `${color}1F` : '#0d0d10'}
        innerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 9,
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text className="font-mono" style={{ color, fontSize: 9, letterSpacing: 2 }}>
            {tag}
          </Text>
          <Text
            className="text-white font-bold"
            style={{ fontSize: IS_SMALL ? 12 : 13, marginTop: 2 }}
            numberOfLines={1}
          >
            {text}
          </Text>
        </View>
        {done ? <Check size={15} color={color} strokeWidth={3} /> : null}
      </AngularPanel>
    </View>
  </View>
);

const MOCK_TABS = [
  { icon: ShieldUser, label: 'CEO' },
  { icon: CalendarDays, label: 'MES' },
  { icon: Crosshair, label: 'HOY', on: true },
  { icon: StickyNote, label: 'NOTAS' },
  { icon: Zap, label: 'SPORT' },
];

const TimelineMock = () => {
  const scan = useSharedValue(0);
  const heightSV = useSharedValue(520);

  useEffect(() => {
    scan.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.linear }), -1);
  }, [scan]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * heightSV.value }],
  }));

  return (
    <View style={{ position: 'relative', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -30,
          left: -30,
          right: -30,
          bottom: -30,
          backgroundColor: C.red,
          opacity: 0.14,
        }}
        className="blur-3xl"
      />
      <AngularPanel
        cut={30}
        border={C.lineRed}
        bg="#08080a"
        innerStyle={{ padding: IS_SMALL ? 16 : 22, overflow: 'hidden' }}
      >
        <View onLayout={(e) => (heightSV.value = e.nativeEvent.layout.height)}>
          {/* Cabecera */}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={clip(slant(6))}>
                <LinearGradient
                  colors={[C.red, C.redDeep]}
                  style={{ width: 46, height: 40, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Crosshair size={20} color="white" />
                </LinearGradient>
              </View>
              <View>
                <Text
                  className="text-white font-black"
                  style={{ fontSize: 24, letterSpacing: -0.5 }}
                >
                  HOY
                </Text>
                <Text className="text-zinc-500 font-mono" style={{ fontSize: 9, letterSpacing: 2 }}>
                  VISTA PREVIA
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <PulseSquare />
              <Text className="text-red-500 font-mono" style={{ fontSize: 10, letterSpacing: 2 }}>
                EN CURSO
              </Text>
            </View>
          </View>

          {/* Progreso del día */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 18,
              marginBottom: 18,
            }}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  { flex: 1, height: 6, backgroundColor: i < 2 ? C.red : 'rgba(255,255,255,0.1)' },
                  clip(slant(3)),
                ]}
              />
            ))}
            <Text className="text-zinc-400 font-mono" style={{ fontSize: 10, marginLeft: 8 }}>
              2/6
            </Text>
          </View>

          {/* Timeline */}
          <View style={{ gap: 10 }}>
            {MOCK_ROWS.map((row) => (
              <MockRow key={row.time} {...row} />
            ))}
          </View>

          {/* Barra de módulos */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 20,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: C.line,
            }}
          >
            {MOCK_TABS.map(({ icon: Icon, label, on }) => (
              <View key={label} style={{ alignItems: 'center', gap: 5, flex: 1 }}>
                {on ? (
                  <View
                    style={[
                      {
                        position: 'absolute',
                        top: -15,
                        width: 30,
                        height: 3,
                        backgroundColor: C.red,
                      },
                      clip(slant(2)),
                    ]}
                  />
                ) : null}
                <Icon size={18} color={on ? C.red : '#52525b'} />
                <Text
                  className="font-mono"
                  style={{ fontSize: 9, letterSpacing: 1.5, color: on ? '#fff' : '#52525b' }}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Línea de escaneo */}
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', top: -60, left: -30, right: -30, height: 60 },
              scanStyle,
            ]}
          >
            <LinearGradient colors={['transparent', 'rgba(220,38,38,0.2)']} style={{ flex: 1 }} />
            <View style={{ height: 2, backgroundColor: C.red, opacity: 0.7 }} />
          </Animated.View>
        </View>
      </AngularPanel>
      <Brackets inset={-7} />
    </View>
  );
};

// ============================================================================
// DATOS DE CONTENIDO
// ============================================================================
const STATS = [
  { value: '05', label: 'Módulos' },
  { value: '04', label: 'Deportes' },
  { value: '01', label: 'Sistema' },
];

const PAINS = [
  { icon: CalendarDays, text: 'Agenda en una app' },
  { icon: ListChecks, text: 'Tareas en otra' },
  { icon: Dumbbell, text: 'Entreno en una libreta' },
];

const MODULES = [
  {
    n: '01',
    name: 'CEO',
    icon: ShieldUser,
    tagline: 'Tu centro de mando',
    desc: 'Tu perfil, tu stack, tu equipo y tu tienda. Todo de un vistazo.',
  },
  {
    n: '02',
    name: 'MES',
    icon: CalendarDays,
    tagline: 'Tu mes completo',
    desc: 'Calendario con tareas, eventos y compromisos de cada día.',
  },
  {
    n: '03',
    name: 'HOY',
    icon: Crosshair,
    tagline: 'Ejecuta el día',
    desc: 'Línea de tiempo con comidas, entreno, tareas y eventos. Filtra lo que importa.',
  },
  {
    n: '04',
    name: 'NOTAS',
    icon: StickyNote,
    tagline: 'Captura sin fricción',
    desc: 'Notas de colores, tareas que se repiten cada mes y pizarra libre.',
  },
  {
    n: '05',
    name: 'SPORT',
    icon: Zap,
    tagline: 'Tu deporte, a fondo',
    desc: 'GYM, MOTO, AUTO y SURF. Rutinas, equipo, lugares, horario y eventos.',
  },
];

const SPORTS = [
  { name: 'GYM', icon: Dumbbell, desc: 'Rutinas por días, series y cardio.' },
  { name: 'MOTO', icon: Bike, desc: 'Tu equipo, tus lugares y tus salidas.' },
  { name: 'AUTO', icon: Car, desc: 'Tu equipo, tus pistas y tus eventos.' },
  { name: 'SURF', icon: Waves, desc: 'Tu tabla, tus spots y tus sesiones.' },
];

const SPORT_FEATURES = ['Equipo', 'Lugares con mapa', 'Horario semanal', 'Eventos', 'Pizarra'];

const STEPS = [
  { n: '01', title: 'Crea tu cuenta', desc: 'Suscríbete en menos de un minuto.' },
  {
    n: '02',
    title: 'Instálala',
    desc: 'Ábrela en tu navegador y añádela a tu pantalla de inicio. Funciona como una app.',
  },
  { n: '03', title: 'Ejecuta', desc: 'Elige tus deportes y empieza a ordenar tu día.' },
];

const FAQS = [
  {
    q: '¿Puedo cancelar cuando quiera?',
    a: 'Sí. Sin penalidades ni letras chicas. Cancelas desde tu cuenta, dentro de la app, y no se vuelve a cobrar.',
  },
  {
    q: '¿Dónde funciona TRENS?',
    a: 'Hoy está disponible como PWA: la abres desde el navegador y la instalas en tu pantalla de inicio en iPhone, Android o computadora. Tu cuenta es la misma en todos tus dispositivos.',
  },
  {
    q: '¿Sirve si no practico deportes?',
    a: 'Sí. CEO, MES, HOY y NOTAS funcionan como tu sistema de productividad diario. SPORT es opcional.',
  },
  {
    q: '¿Qué deportes incluye?',
    a: 'GYM, MOTO, AUTO y SURF. GYM trae tus rutinas por días, series y cardio. MOTO, AUTO y SURF te dan equipo, lugares con mapa, horario semanal, eventos y pizarra.',
  },
  {
    q: '¿Cómo pago?',
    a: 'Con tarjeta de crédito o débito. El cobro es mensual, procesado por Openpay con certificación PCI DSS y encriptación SSL.',
  },
];

const FaqItem = ({ q, a, index }: { q: string; a: string; index: number }) => {
  const [open, setOpen] = useState(false);

  return (
    <Animated.View entering={FadeInUp.delay(index * 80).duration(500)}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen((v) => !v)}>
        <AngularPanel
          cut={12}
          border={open ? C.lineRed : C.line}
          bg={open ? '#120808' : C.panel}
          innerStyle={{ paddingVertical: 18, paddingHorizontal: IS_SMALL ? 16 : 22 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Text className="text-red-500 font-mono font-bold" style={{ fontSize: 12 }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
            <Text className="text-white font-bold flex-1" style={{ fontSize: IS_SMALL ? 14 : 16 }}>
              {q}
            </Text>
            <View style={{ transform: [{ rotate: open ? '45deg' : '0deg' }] }}>
              <Plus size={18} color={open ? C.red : '#71717a'} />
            </View>
          </View>
          {open ? (
            <Text
              className="text-zinc-400"
              style={{ fontSize: 14, lineHeight: 22, marginTop: 12, paddingLeft: 30 }}
            >
              {a}
            </Text>
          ) : null}
        </AngularPanel>
      </TouchableOpacity>
    </Animated.View>
  );
};

const FeatureRow = ({ text, delay = 0 }: { text: string; delay?: number }) => (
  <Animated.View
    entering={FadeInLeft.delay(delay).duration(450)}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
  >
    <View
      style={[
        {
          width: 20,
          height: 20,
          backgroundColor: C.red,
          alignItems: 'center',
          justifyContent: 'center',
        },
        clip(chamfer(6)),
      ]}
    >
      <Check size={12} color="white" strokeWidth={3} />
    </View>
    <Text className="text-white font-medium flex-1" style={{ fontSize: 14, lineHeight: 20 }}>
      {text}
    </Text>
  </Animated.View>
);

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================
export default function LandingPage() {
  const scrollRef = useRef<ScrollView>(null);

  // Form state
  const [step, setStep] = useState<'info' | 'payment'>('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState<Country>(getDefaultCountry());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Card info
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Animations
  const pulseAnim = useSharedValue(1);
  const floatAnim = useSharedValue(0);

  useEffect(() => {
    // Pulse effect for CTA
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // Float effect
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-7, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(7, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [floatAnim, pulseAnim]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  // Scroll to pricing section
  const scrollToPricing = () => {
    if (Platform.OS === 'web') {
      const element = document.getElementById('pricing-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Validate user info step
  const validateUserInfo = (): boolean => {
    if (!name.trim()) {
      setError('Ingresa tu nombre completo');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un email válido');
      return false;
    }
    if (!phone.trim() || phone.length < 9) {
      setError('Ingresa un número de celular válido');
      return false;
    }
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  };

  // Go to payment step
  const goToPayment = () => {
    if (validateUserInfo()) {
      setError(null);
      setStep('payment');
      setCardName(name.toUpperCase());
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Handle card number formatting
  const handleCardNumberChange = (value: string) => {
    setCardNumber(formatCardNumber(value));
  };

  // Handle expiry formatting
  const handleExpiryChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setExpiry(formatExpiry(cleaned));
    }
  };

  // Process subscription
  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate card
      if (!validateCardNumber(cardNumber)) {
        throw new Error('Número de tarjeta inválido');
      }

      const [expMonth, expYear] = expiry.split('/');
      if (!expMonth || !expYear) {
        throw new Error('Fecha de expiración inválida');
      }

      if (!cvv || cvv.length < 3) {
        throw new Error('CVV inválido');
      }

      // 1. Create user in Supabase
      const fullPhoneNumber = getFullPhoneNumber(phoneCountry, phone);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name,
            display_name: name,
            phone: fullPhoneNumber,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión.');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Error al crear usuario');
      }

      // 2. Tokenize card (client-side con llave pública)
      const token = await openpay.createCardToken({
        card_number: cardNumber.replace(/\s/g, ''),
        holder_name: cardName.toUpperCase(),
        expiration_month: expMonth.padStart(2, '0'),
        expiration_year: expYear.length === 4 ? expYear.slice(-2) : expYear,
        cvv2: cvv,
      });

      // 3. Create customer + subscription + save card via Edge Function
      const result = await openpay.createSubscription({
        tokenId: token.id,
        customer: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone_number: fullPhoneNumber,
        },
        userId: authData.user.id,
        saveCard: true, // Guardar tarjeta para futuros cobros
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al procesar suscripción');
      }

      // 4. Create/update user profile + sync profiles table
      await Promise.all([
        supabase.from('user_profiles').upsert(
          {
            user_id: authData.user.id,
            display_name: name,
          },
          { onConflict: 'user_id' }
        ),
        supabase.from('profiles').update({ full_name: name }).eq('id', authData.user.id),
      ]);

      // 5. Success!
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (Platform.OS === 'web') {
        window.location.href = '/pago-exitoso';
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Error al procesar el pago');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const planDetails = getPlanDetails();

  // Coaching modal (abierto desde PromoPill superior)
  const [coachingOpen, setCoachingOpen] = useState(false);
  const [promoImage, setPromoImage] = useState<string | null>(null);

  // Cargar la imagen del primer banner del carrusel (misma que usa el modal del shop)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const banners = await shopService.listBanners();
        if (mounted && banners[0]?.image_url) {
          setPromoImage(banners[0].image_url);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PromoPill
        onLoaded={(p) => {
          // fallback a la imagen de la promo si no hay banner
          setPromoImage((prev) => prev || p?.image_url || null);
        }}
        onPress={() => setCoachingOpen(true)}
      />
      <CoachingModal
        visible={coachingOpen}
        onClose={() => setCoachingOpen(false)}
        onStart={() => {
          setCoachingOpen(false);
          // Mismo comportamiento que "EMPEZAR AHORA"
          setTimeout(() => scrollToPricing(), 50);
        }}
        imageUrl={promoImage}
      />
      <ScrollView ref={scrollRef} className="flex-1 bg-black" showsVerticalScrollIndicator={false}>
        {/* ================================================================== */}
        {/* HERO */}
        {/* ================================================================== */}
        <View
          style={{
            position: 'relative',
            overflow: 'hidden',
            paddingTop: IS_SMALL ? 92 : 124,
            paddingBottom: SLANT + (IS_SMALL ? 56 : 104),
            paddingHorizontal: PAD_X,
          }}
        >
          <GridBackdrop />
          <LightBeam left="6%" delay={0} />
          <LightBeam left="50%" color={C.orange} delay={1400} />
          <LightBeam left="88%" delay={2600} />
          {[...Array(14)].map((_, i) => (
            <FloatingParticle
              key={i}
              delay={i * 500}
              left={4 + i * 7}
              color={i % 3 === 0 ? C.red : C.orange}
            />
          ))}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(220, 38, 38, 0.10)', 'transparent', 'rgba(0, 0, 0, 0.85)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={FILL}
          />

          <View
            style={{
              width: '100%',
              maxWidth: MAX_W,
              alignSelf: 'center',
              flexDirection: IS_MOBILE ? 'column' : 'row',
              alignItems: IS_MOBILE ? 'stretch' : 'center',
              gap: IS_MOBILE ? 48 : 64,
            }}
          >
            {/* Copy */}
            <Animated.View
              entering={FadeInLeft.duration(700)}
              style={{ flex: IS_MOBILE ? undefined : 1.1 }}
            >
              <View style={{ alignSelf: 'flex-start', marginBottom: 24 }}>
                <AngularPanel
                  cut={8}
                  border={C.lineRed}
                  bg="rgba(220, 38, 38, 0.08)"
                  innerStyle={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                  }}
                >
                  <PulseSquare />
                  <Text
                    className="text-red-400 font-mono uppercase"
                    style={{ fontSize: IS_SMALL ? 10 : 11, letterSpacing: 3 }}
                  >
                    Sistema de alto rendimiento
                  </Text>
                </AngularPanel>
              </View>

              <Text
                className="text-white font-black uppercase"
                style={{ fontSize: H1_SIZE, lineHeight: H1_SIZE * 1.02, letterSpacing: -2 }}
              >
                Tu día es una{'\n'}
                <Text style={{ color: C.red }}>competencia.</Text>
              </Text>

              <Text
                className="text-zinc-400"
                style={{
                  fontSize: IS_SMALL ? 16 : 19,
                  lineHeight: IS_SMALL ? 24 : 29,
                  marginTop: 24,
                  maxWidth: 540,
                }}
              >
                Agenda, tareas y deporte en un solo sistema. Para quienes rinden igual en la oficina
                que en la pista, la ola o el asfalto.
              </Text>

              <View
                style={{
                  marginTop: 34,
                  flexDirection: IS_SMALL ? 'column' : 'row',
                  alignItems: IS_SMALL ? 'stretch' : 'center',
                  gap: 22,
                }}
              >
                <Animated.View
                  style={[{ alignSelf: IS_SMALL ? 'stretch' : 'flex-start' }, pulseStyle]}
                >
                  <AngularButton label="Empezar ahora" onPress={scrollToPricing} full={IS_SMALL} />
                </Animated.View>
                <View style={{ alignItems: IS_SMALL ? 'center' : 'flex-start' }}>
                  <Text className="text-white font-black" style={{ fontSize: 24 }}>
                    {getFormattedPrice()}
                    <Text className="text-zinc-500 font-mono" style={{ fontSize: 12 }}>
                      {'  '}/ MES
                    </Text>
                  </Text>
                  <Text
                    className="text-zinc-500 font-mono uppercase"
                    style={{ fontSize: 10, letterSpacing: 2, marginTop: 2 }}
                  >
                    Cancela cuando quieras
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 }}>
                <View style={{ flexShrink: 0 }}>
                  <Smartphone size={16} color="#71717a" />
                </View>
                <Text className="text-zinc-500" style={{ fontSize: 13, flex: 1 }}>
                  Disponible como PWA. Instálala desde tu navegador.
                </Text>
              </View>

              <View style={{ flexDirection: 'row', marginTop: 38 }}>
                {STATS.map((s, i) => (
                  <View
                    key={s.label}
                    style={{
                      paddingRight: IS_SMALL ? 18 : 28,
                      marginRight: IS_SMALL ? 18 : 28,
                      borderRightWidth: i < STATS.length - 1 ? 1 : 0,
                      borderRightColor: C.line,
                    }}
                  >
                    <Text className="text-white font-black font-mono" style={{ fontSize: 28 }}>
                      {s.value}
                    </Text>
                    <Text
                      className="text-zinc-500 font-mono uppercase"
                      style={{ fontSize: 10, letterSpacing: 2 }}
                    >
                      {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>

            {/* Vista previa del producto */}
            <Animated.View
              entering={FadeInUp.delay(250).duration(800)}
              style={{ flex: IS_MOBILE ? undefined : 0.95 }}
            >
              <Animated.View style={floatStyle}>
                <TimelineMock />
              </Animated.View>
            </Animated.View>
          </View>
        </View>

        {/* ================================================================== */}
        {/* PROBLEMA */}
        {/* ================================================================== */}
        <SlantedSection>
          <View style={{ maxWidth: 980, width: '100%', alignSelf: 'center' }}>
            <SectionTitle
              eyebrow="El problema"
              sub="Cada cambio de app te roba foco. Cada cosa fuera de lugar es un compromiso que se cae."
            >
              El rendimiento no se pierde en el esfuerzo.{'\n'}
              <Text style={{ color: C.red }}>Se pierde en el desorden.</Text>
            </SectionTitle>

            <View style={{ flexDirection: IS_SMALL ? 'column' : 'row', gap: 14 }}>
              {PAINS.map(({ icon: Icon, text }, i) => (
                <Animated.View
                  key={text}
                  entering={FadeInUp.delay(i * 120).duration(500)}
                  style={{ flex: IS_SMALL ? undefined : 1 }}
                >
                  <AngularPanel
                    cut={14}
                    innerStyle={{
                      padding: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <Icon size={22} color="#71717a" />
                    <Text className="text-zinc-300 font-bold flex-1" style={{ fontSize: 15 }}>
                      {text}
                    </Text>
                    <Text className="text-red-600 font-mono font-bold" style={{ fontSize: 18 }}>
                      ×
                    </Text>
                  </AngularPanel>
                </Animated.View>
              ))}
            </View>

            <View style={{ alignItems: 'center', marginVertical: 18 }}>
              <View style={{ width: 2, height: 28, backgroundColor: C.red }} />
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <ArrowRight size={22} color={C.red} />
              </View>
            </View>

            <Animated.View entering={FadeInUp.delay(300).duration(600)}>
              <AngularPanel
                cut={24}
                border={C.lineRed}
                bg="#120808"
                innerStyle={{
                  padding: IS_SMALL ? 22 : 32,
                  flexDirection: IS_SMALL ? 'column' : 'row',
                  alignItems: 'center',
                  gap: 20,
                }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(220, 38, 38, 0.18)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={BEHIND}
                />
                <View style={clip(slant(10))}>
                  <LinearGradient
                    colors={[C.red, C.redDeep]}
                    style={{
                      width: 72,
                      height: 60,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Crosshair size={30} color="white" />
                  </LinearGradient>
                </View>
                <View
                  style={{
                    flex: IS_SMALL ? undefined : 1,
                    alignItems: IS_SMALL ? 'center' : 'flex-start',
                  }}
                >
                  <Text
                    className="text-white font-black uppercase"
                    style={{ fontSize: IS_SMALL ? 22 : 28, letterSpacing: -0.5 }}
                  >
                    TRENS: un solo tablero
                  </Text>
                  <Text
                    className="text-zinc-400"
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      marginTop: 6,
                      textAlign: IS_SMALL ? 'center' : 'left',
                    }}
                  >
                    Tu día, tus tareas y tu deporte en el mismo lugar. Sin saltar entre apps.
                  </Text>
                </View>
              </AngularPanel>
            </Animated.View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* MÓDULOS */}
        {/* ================================================================== */}
        <SlantedSection bg="#000000">
          <View style={{ maxWidth: MAX_W, width: '100%', alignSelf: 'center' }}>
            <SectionTitle
              eyebrow="El sistema"
              sub="Cada módulo resuelve una parte de tu día. Juntos, te dan control total."
            >
              5 módulos.{'\n'}
              <Text style={{ color: C.red }}>1 sistema.</Text>
            </SectionTitle>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {MODULES.map(({ n, name: moduleName, icon: Icon, tagline, desc }, i) => (
                <Animated.View
                  key={moduleName}
                  entering={FadeInUp.delay(i * 100).duration(600)}
                  style={{
                    flexGrow: 1,
                    flexBasis: IS_SMALL ? '100%' : IS_MOBILE ? '47%' : '31%',
                    minWidth: IS_SMALL ? 0 : 260,
                  }}
                >
                  <AngularPanel
                    cut={22}
                    style={{ flex: 1 }}
                    innerStyle={{ padding: IS_SMALL ? 20 : 26, minHeight: 220 }}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(220, 38, 38, 0.14)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={BEHIND}
                    />
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <View style={clip(slant(9))}>
                        <LinearGradient
                          colors={[C.red, C.redDeep]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            width: 60,
                            height: 48,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={24} color="white" />
                        </LinearGradient>
                      </View>
                      <Text className="text-zinc-700 font-mono font-bold" style={{ fontSize: 34 }}>
                        {n}
                      </Text>
                    </View>
                    <Text
                      className="text-white font-black"
                      style={{ fontSize: 32, letterSpacing: -1, marginTop: 22 }}
                    >
                      {moduleName}
                    </Text>
                    <Text
                      className="text-red-500 font-mono uppercase"
                      style={{ fontSize: 11, letterSpacing: 2, marginTop: 4 }}
                    >
                      {tagline}
                    </Text>
                    <Text
                      className="text-zinc-400"
                      style={{ fontSize: 14, lineHeight: 21, marginTop: 12 }}
                    >
                      {desc}
                    </Text>
                  </AngularPanel>
                </Animated.View>
              ))}
            </View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* SPORT */}
        {/* ================================================================== */}
        <SlantedSection>
          <GridBackdrop opacity={0.6} />
          <View style={{ maxWidth: MAX_W, width: '100%', alignSelf: 'center' }}>
            <SectionTitle
              eyebrow="Sport"
              sub="Un espacio propio para cada disciplina. Elige una o todas."
            >
              Del escritorio{'\n'}
              <Text style={{ color: C.red }}>al asfalto.</Text>
            </SectionTitle>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              {SPORTS.map(({ name: sportName, icon: Icon, desc }, i) => (
                <Animated.View
                  key={sportName}
                  entering={FadeInUp.delay(i * 100).duration(600)}
                  style={{
                    flexGrow: 1,
                    flexBasis: IS_MOBILE ? '47%' : '23%',
                    minWidth: IS_SMALL ? 140 : 200,
                  }}
                >
                  <AngularPanel
                    cut={18}
                    style={{ flex: 1 }}
                    innerStyle={{ padding: IS_SMALL ? 16 : 24, minHeight: 190 }}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(220, 38, 38, 0.10)', 'transparent']}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={BEHIND}
                    />
                    <Icon size={IS_SMALL ? 34 : 42} color={C.red} strokeWidth={1.8} />
                    <Text
                      className="text-white font-black"
                      style={{ fontSize: IS_SMALL ? 24 : 30, letterSpacing: -1, marginTop: 18 }}
                    >
                      {sportName}
                    </Text>
                    <View
                      style={[
                        { width: 36, height: 3, backgroundColor: C.red, marginTop: 8 },
                        clip(slant(3)),
                      ]}
                    />
                    <Text
                      className="text-zinc-400"
                      style={{
                        fontSize: IS_SMALL ? 12 : 14,
                        lineHeight: IS_SMALL ? 18 : 21,
                        marginTop: 12,
                      }}
                    >
                      {desc}
                    </Text>
                  </AngularPanel>
                </Animated.View>
              ))}
            </View>

            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text
                className="text-zinc-500 font-mono uppercase"
                style={{ fontSize: 11, letterSpacing: 3, marginBottom: 14, textAlign: 'center' }}
              >
                Incluido en MOTO · AUTO · SURF
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                {SPORT_FEATURES.map((f) => (
                  <AngularPanel
                    key={f}
                    cut={8}
                    border={C.lineRed}
                    bg="rgba(220, 38, 38, 0.08)"
                    innerStyle={{ paddingVertical: 10, paddingHorizontal: 18 }}
                  >
                    <Text
                      className="text-white font-mono uppercase"
                      style={{ fontSize: 12, letterSpacing: 2 }}
                    >
                      {f}
                    </Text>
                  </AngularPanel>
                ))}
              </View>
            </View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* TIENDA + PASOS */}
        {/* ================================================================== */}
        <SlantedSection bg="#000000">
          <View style={{ maxWidth: MAX_W, width: '100%', alignSelf: 'center' }}>
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={{ marginBottom: IS_SMALL ? 56 : 96 }}
            >
              <AngularPanel
                cut={26}
                border="rgba(250, 204, 21, 0.55)"
                bg="#0f0c02"
                innerStyle={{
                  padding: IS_SMALL ? 22 : 34,
                  flexDirection: IS_SMALL ? 'column' : 'row',
                  alignItems: 'center',
                  gap: 24,
                }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={['rgba(250, 204, 21, 0.14)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={BEHIND}
                />
                <View style={clip(slant(10))}>
                  <LinearGradient
                    colors={[C.yellow, '#B45309']}
                    style={{
                      width: 84,
                      height: 68,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Truck size={34} color="black" />
                  </LinearGradient>
                </View>
                <View
                  style={{
                    flex: IS_SMALL ? undefined : 1,
                    alignItems: IS_SMALL ? 'center' : 'flex-start',
                  }}
                >
                  <Text
                    className="font-mono uppercase"
                    style={{ color: C.yellow, fontSize: 11, letterSpacing: 3 }}
                  >
                    TRENS Shop · Incluido en tu suscripción
                  </Text>
                  <Text
                    className="text-white font-black uppercase"
                    style={{
                      fontSize: IS_SMALL ? 24 : 32,
                      letterSpacing: -1,
                      marginTop: 8,
                      textAlign: IS_SMALL ? 'center' : 'left',
                    }}
                  >
                    Envío <Text style={{ color: C.yellow }}>gratis</Text> a todo el Perú
                  </Text>
                  <Text
                    className="text-zinc-400"
                    style={{
                      fontSize: 15,
                      lineHeight: 22,
                      marginTop: 8,
                      textAlign: IS_SMALL ? 'center' : 'left',
                    }}
                  >
                    Suplementos, ropa técnica y equipamiento seleccionado, sin pagar envío.
                  </Text>
                </View>
              </AngularPanel>
            </Animated.View>

            <SectionTitle eyebrow="Cómo empezar">
              Activa tu sistema{'\n'}
              <Text style={{ color: C.red }}>en 3 pasos.</Text>
            </SectionTitle>

            <View style={{ flexDirection: IS_MOBILE ? 'column' : 'row', gap: 16 }}>
              {STEPS.map((s, i) => (
                <Animated.View
                  key={s.n}
                  entering={FadeInUp.delay(i * 130).duration(600)}
                  style={{ flex: IS_MOBILE ? undefined : 1 }}
                >
                  <AngularPanel
                    cut={20}
                    style={{ flex: 1 }}
                    innerStyle={{ padding: IS_SMALL ? 20 : 26 }}
                  >
                    <Text
                      className="font-mono font-black"
                      style={{ fontSize: 54, lineHeight: 56, color: 'rgba(220, 38, 38, 0.9)' }}
                    >
                      {s.n}
                    </Text>
                    <View
                      style={[
                        { width: 40, height: 3, backgroundColor: C.red, marginVertical: 12 },
                        clip(slant(3)),
                      ]}
                    />
                    <Text
                      className="text-white font-black uppercase"
                      style={{ fontSize: 20, letterSpacing: -0.5 }}
                    >
                      {s.title}
                    </Text>
                    <Text
                      className="text-zinc-400"
                      style={{ fontSize: 14, lineHeight: 21, marginTop: 8 }}
                    >
                      {s.desc}
                    </Text>
                  </AngularPanel>
                </Animated.View>
              ))}
            </View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* PRECIO + REGISTRO */}
        {/* ================================================================== */}
        <SlantedSection nativeID="pricing-section" bg="#09090b">
          <LightBeam left="12%" />
          <LightBeam left="78%" color={C.orange} delay={1800} />
          <View style={{ maxWidth: 1060, width: '100%', alignSelf: 'center' }}>
            <SectionTitle
              eyebrow="Suscripción"
              sub="Sin niveles ni funciones bloqueadas. Acceso completo a todos los módulos y a cada actualización."
            >
              Un plan.{'\n'}
              <Text style={{ color: C.red }}>Acceso total.</Text>
            </SectionTitle>

            <View
              style={{
                flexDirection: IS_MOBILE ? 'column' : 'row',
                alignItems: IS_MOBILE ? 'stretch' : 'flex-start',
                gap: IS_SMALL ? 22 : 34,
              }}
            >
              {/* Plan */}
              <Animated.View
                entering={FadeInLeft.delay(150).duration(700)}
                style={{ flex: IS_MOBILE ? undefined : 1 }}
              >
                <View style={{ position: 'relative' }}>
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: -24,
                      left: -24,
                      right: -24,
                      bottom: -24,
                      backgroundColor: C.red,
                      opacity: 0.14,
                    }}
                    className="blur-3xl"
                  />
                  <AngularPanel
                    cut={32}
                    border={C.lineRed}
                    bg="#0c0606"
                    innerStyle={{ padding: IS_SMALL ? 22 : 34 }}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={['rgba(220, 38, 38, 0.14)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={BEHIND}
                    />
                    <View style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
                      <View style={clip(slant(8))}>
                        <LinearGradient
                          colors={[C.red, C.redDeep]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ paddingVertical: 6, paddingHorizontal: 20 }}
                        >
                          <Text
                            className="text-white font-mono font-bold uppercase"
                            style={{ fontSize: 10, letterSpacing: 3 }}
                          >
                            Acceso total
                          </Text>
                        </LinearGradient>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Crosshair size={26} color={C.red} />
                      <Text
                        className="text-white font-black uppercase"
                        style={{ fontSize: 26, letterSpacing: -0.5 }}
                      >
                        {planDetails.name}
                      </Text>
                    </View>

                    <Text
                      className="text-zinc-500 font-mono line-through"
                      style={{ fontSize: 17, marginTop: 20 }}
                    >
                      S/ 99.90
                    </Text>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 22 }}
                    >
                      <Text
                        className="text-white font-black"
                        style={{
                          fontSize: IS_SMALL ? 56 : 68,
                          lineHeight: IS_SMALL ? 62 : 74,
                          letterSpacing: -3,
                          textShadowColor: C.glowRed,
                          textShadowOffset: { width: 0, height: 2 },
                          textShadowRadius: 20,
                        }}
                      >
                        S/ {planDetails.price.toFixed(2).split('.')[0]}
                      </Text>
                      <Text
                        className="text-white font-black"
                        style={{ fontSize: 28, lineHeight: IS_SMALL ? 42 : 52 }}
                      >
                        .{planDetails.price.toFixed(2).split('.')[1]}
                      </Text>
                      <Text
                        className="text-zinc-500 font-mono"
                        style={{ fontSize: 14, marginLeft: 8, marginBottom: 12 }}
                      >
                        / MES
                      </Text>
                    </View>

                    <View style={{ height: 1, backgroundColor: C.line, marginBottom: 12 }} />

                    <View style={{ marginBottom: 24 }}>
                      {planDetails.features.map((feature, index) => (
                        <FeatureRow key={index} text={feature} delay={250 + index * 70} />
                      ))}
                    </View>

                    <AngularPanel
                      cut={12}
                      border="rgba(220, 38, 38, 0.3)"
                      bg="rgba(220, 38, 38, 0.06)"
                      innerStyle={{ padding: 18 }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <Shield size={18} color={C.red} />
                        <Text className="text-white font-bold" style={{ fontSize: 14 }}>
                          Pago 100% seguro con Openpay
                        </Text>
                      </View>
                      <Text className="text-zinc-400 text-center" style={{ fontSize: 12 }}>
                        Certificación PCI DSS • Encriptación SSL 256-bit
                      </Text>
                      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />
                      <Text
                        className="text-zinc-400 text-center"
                        style={{ fontSize: 12, lineHeight: 20 }}
                      >
                        {
                          '✓ Cancela cuando quieras, sin penalidad\n✓ Sin letras chicas ni cargos ocultos\n✓ Acceso total desde el primer día'
                        }
                      </Text>
                    </AngularPanel>
                  </AngularPanel>
                  <Brackets inset={-7} />
                </View>
              </Animated.View>

              {/* Formulario */}
              <Animated.View
                entering={FadeInUp.delay(300).duration(700)}
                style={{ flex: IS_MOBILE ? undefined : 1 }}
              >
                <AngularPanel
                  cut={32}
                  border="rgba(255, 255, 255, 0.16)"
                  bg="#0a0a0c"
                  innerStyle={{ padding: IS_SMALL ? 20 : 34 }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {step === 'info' ? (
                      <User size={24} color={C.red} />
                    ) : (
                      <CreditCard size={24} color={C.red} />
                    )}
                    <Text
                      className="text-white font-black uppercase"
                      style={{ fontSize: 21, letterSpacing: -0.5 }}
                    >
                      {step === 'info' ? 'Crea tu cuenta' : 'Datos de pago'}
                    </Text>
                  </View>

                  {/* Indicador de paso */}
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}
                  >
                    {(['info', 'payment'] as const).map((s) => (
                      <View
                        key={s}
                        style={[
                          {
                            flex: 1,
                            height: 6,
                            backgroundColor: step === s ? C.red : 'rgba(255,255,255,0.1)',
                          },
                          clip(slant(4)),
                        ]}
                      />
                    ))}
                    <Text
                      className="text-zinc-500 font-mono"
                      style={{ fontSize: 11, marginLeft: 8 }}
                    >
                      {step === 'info' ? '1/2' : '2/2'}
                    </Text>
                  </View>

                  {error && (
                    <Animated.View entering={FadeInDown.duration(300)} style={{ marginBottom: 20 }}>
                      <AngularPanel
                        cut={10}
                        border="rgba(220, 38, 38, 0.6)"
                        bg="rgba(127, 29, 29, 0.35)"
                        innerStyle={{ padding: 14 }}
                      >
                        <Text className="text-red-400 text-center" style={{ fontSize: 13 }}>
                          {error}
                        </Text>
                      </AngularPanel>
                    </Animated.View>
                  )}

                  {step === 'info' ? (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                      <View data-form-type="registration">
                        <Field label="Nombre completo" icon={User}>
                          <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Juan Pérez"
                            placeholderTextColor="#52525b"
                            className="flex-1 text-white py-4 px-3 text-base"
                            autoCapitalize="words"
                            autoComplete="name"
                          />
                        </Field>

                        <Field label="Correo electrónico" icon={Mail}>
                          <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="tu@email.com"
                            placeholderTextColor="#52525b"
                            className="flex-1 text-white py-4 px-3 text-base"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                          />
                        </Field>

                        <View style={{ marginBottom: 18 }}>
                          <FieldLabel>Celular</FieldLabel>
                          <AngularPanel cut={10} border="rgba(255,255,255,0.14)" bg={C.field}>
                            <PhoneInput
                              angular
                              value={phone}
                              onChangeText={setPhone}
                              selectedCountry={phoneCountry}
                              onCountryChange={setPhoneCountry}
                              placeholder="999 999 999"
                              disabled={loading}
                            />
                          </AngularPanel>
                        </View>

                        <Field
                          label="Contraseña"
                          icon={Lock}
                          rightSlot={
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                              {showPassword ? (
                                <EyeOff size={20} color="#71717a" />
                              ) : (
                                <Eye size={20} color="#71717a" />
                              )}
                            </TouchableOpacity>
                          }
                        >
                          <TextInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor="#52525b"
                            className="flex-1 text-white py-4 px-3 text-base"
                            secureTextEntry={!showPassword}
                            autoComplete="new-password"
                          />
                        </Field>
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <AngularButton label="Continuar" onPress={goToPayment} full />
                      </View>
                    </KeyboardAvoidingView>
                  ) : (
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                      <View data-form-type="payment">
                        <Field
                          label="Número de tarjeta"
                          icon={CreditCard}
                          rightSlot={
                            cardNumber.length > 0 ? (
                              <Text
                                className="text-zinc-500 font-bold uppercase"
                                style={{ fontSize: 11 }}
                              >
                                {getCardBrand(cardNumber)}
                              </Text>
                            ) : null
                          }
                        >
                          <TextInput
                            value={cardNumber}
                            onChangeText={handleCardNumberChange}
                            placeholder="4111 1111 1111 1111"
                            placeholderTextColor="#52525b"
                            className="flex-1 text-white py-4 px-3 font-mono text-base"
                            keyboardType="number-pad"
                            maxLength={19}
                            autoComplete="cc-number"
                          />
                        </Field>

                        <Field label="Nombre en la tarjeta" icon={User}>
                          <TextInput
                            value={cardName}
                            onChangeText={(v) => setCardName(v.toUpperCase())}
                            placeholder="JUAN PEREZ"
                            placeholderTextColor="#52525b"
                            className="flex-1 text-white py-4 px-3 text-base"
                            autoCapitalize="characters"
                            autoComplete="cc-name"
                          />
                        </Field>

                        <View style={{ flexDirection: 'row', gap: 14 }}>
                          <View style={{ flex: 1 }}>
                            <Field label="Vencimiento">
                              <TextInput
                                value={expiry}
                                onChangeText={handleExpiryChange}
                                placeholder="MM/YY"
                                placeholderTextColor="#52525b"
                                className="flex-1 text-white py-4 font-mono text-center text-base"
                                keyboardType="number-pad"
                                maxLength={5}
                                autoComplete="cc-exp"
                              />
                            </Field>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Field label="CVV">
                              <TextInput
                                value={cvv}
                                onChangeText={setCvv}
                                placeholder="123"
                                placeholderTextColor="#52525b"
                                className="flex-1 text-white py-4 font-mono text-center text-base"
                                keyboardType="number-pad"
                                maxLength={4}
                                secureTextEntry
                                autoComplete="cc-csc"
                              />
                            </Field>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => setStep('info')}
                        style={{ marginBottom: 14, paddingVertical: 6 }}
                        activeOpacity={0.7}
                      >
                        <Text className="text-zinc-400 text-center">← Volver a mis datos</Text>
                      </TouchableOpacity>

                      <AngularButton
                        label={`Pagar ${getFormattedPrice()}`}
                        onPress={handleSubscribe}
                        loading={loading}
                        icon={Shield}
                        arrow={false}
                        full
                      />

                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          marginTop: 20,
                        }}
                      >
                        <Lock size={14} color="#52525b" />
                        <Text className="text-zinc-500" style={{ fontSize: 12 }}>
                          Pago seguro procesado por Openpay • SSL
                        </Text>
                      </View>
                    </KeyboardAvoidingView>
                  )}

                  <View style={{ alignItems: 'center', marginTop: 22 }}>
                    <Link href={'/(auth)/login' as any} asChild>
                      <TouchableOpacity activeOpacity={0.7}>
                        <Text className="text-zinc-500" style={{ fontSize: 13 }}>
                          ¿Ya tienes cuenta?{' '}
                          <Text className="text-white font-bold">Inicia sesión</Text>
                        </Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </AngularPanel>
              </Animated.View>
            </View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* FAQ */}
        {/* ================================================================== */}
        <SlantedSection bg="#000000">
          <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>
            <SectionTitle eyebrow="FAQ">
              Preguntas{'\n'}
              <Text style={{ color: C.red }}>frecuentes.</Text>
            </SectionTitle>
            <View style={{ gap: 10 }}>
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
              ))}
            </View>
          </View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* CTA FINAL */}
        {/* ================================================================== */}
        <SlantedSection>
          <LightBeam left="22%" />
          <LightBeam left="74%" color={C.orange} delay={1500} />
          <Animated.View
            entering={FadeInUp.duration(700)}
            style={{ alignItems: 'center', maxWidth: 820, width: '100%', alignSelf: 'center' }}
          >
            <View style={clip(chamfer(12))}>
              <LinearGradient
                colors={[C.red, C.redDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}
              >
                <Crosshair size={34} color="white" />
              </LinearGradient>
            </View>
            <Text
              className="text-white font-black uppercase text-center"
              style={{
                fontSize: IS_SMALL ? 28 : IS_MOBILE ? 42 : 54,
                lineHeight: IS_SMALL ? 32 : IS_MOBILE ? 46 : 58,
                letterSpacing: -1.5,
                marginTop: 28,
              }}
            >
              Cada día sin sistema{'\n'}
              <Text style={{ color: C.red }}>es rendimiento{'\n'}perdido.</Text>
            </Text>
            <Text
              className="text-zinc-400 text-center"
              style={{
                fontSize: IS_SMALL ? 15 : 18,
                lineHeight: IS_SMALL ? 22 : 27,
                marginTop: 18,
                maxWidth: 520,
              }}
            >
              Ordena tu día. Entrena con intención. Compite mejor.
            </Text>
            <Text
              className="text-zinc-500 text-center"
              style={{ fontSize: 14, marginTop: 10, marginBottom: 32 }}
            >
              Solo <Text className="text-red-500 font-bold">{getFormattedPrice()}/mes</Text>.
              Cancela cuando quieras.
            </Text>
            <Animated.View style={pulseStyle}>
              <AngularButton label="Comenzar ahora" onPress={scrollToPricing} />
            </Animated.View>
          </Animated.View>
        </SlantedSection>

        {/* ================================================================== */}
        {/* FOOTER */}
        {/* ================================================================== */}
        <View
          style={{
            backgroundColor: '#000000',
            paddingHorizontal: PAD_X,
            paddingTop: 56,
            paddingBottom: 48,
            borderTopWidth: 1,
            borderTopColor: '#18181b',
          }}
        >
          <View
            style={{ maxWidth: MAX_W, width: '100%', alignSelf: 'center', alignItems: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <View style={clip(chamfer(7))}>
                <LinearGradient
                  colors={[C.red, C.redDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Crosshair size={22} color="white" />
                </LinearGradient>
              </View>
              <Text className="text-white font-black" style={{ fontSize: 32, letterSpacing: 2 }}>
                TRENS
              </Text>
            </View>
            <Text
              className="text-zinc-500 font-mono uppercase"
              style={{ fontSize: 11, letterSpacing: 4, marginBottom: 36 }}
            >
              Sistema de alto rendimiento
            </Text>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 28,
                marginBottom: 32,
              }}
            >
              <Link href="/terms" asChild>
                <TouchableOpacity style={{ paddingVertical: 8 }}>
                  <Text className="text-zinc-400 hover:text-white transition-colors">
                    Términos y Condiciones
                  </Text>
                </TouchableOpacity>
              </Link>
              <Link href="/privacy" asChild>
                <TouchableOpacity style={{ paddingVertical: 8 }}>
                  <Text className="text-zinc-400 hover:text-white transition-colors">
                    Política de Privacidad
                  </Text>
                </TouchableOpacity>
              </Link>
              <Link href="/contact" asChild>
                <TouchableOpacity style={{ paddingVertical: 8 }}>
                  <Text className="text-zinc-400 hover:text-white transition-colors">Contacto</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View
              style={{ height: 1, backgroundColor: '#27272a', width: '100%', marginBottom: 24 }}
            />

            <Text className="text-zinc-600 text-center" style={{ fontSize: 13, marginBottom: 6 }}>
              © 2026 TRENS. Todos los derechos reservados.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text className="text-zinc-700" style={{ fontSize: 12 }}>
                Lima, Perú
              </Text>
              <Text style={{ fontSize: 20 }}>🇵🇪</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
