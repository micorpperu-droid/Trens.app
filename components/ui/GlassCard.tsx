// ============================================================================
// GLASS CARD — Contenedor glassmorphism en escala de grises (blur + brillo)
// Pensado para ir sobre <SavageBackground tone="mono" />.
// ============================================================================

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Intensidad del desenfoque (0-100). */
  intensity?: number;
  /** Color del borde; por defecto un blanco translúcido. */
  borderColor?: string;
}

export function GlassCard({
  children,
  className = '',
  style,
  intensity = 24,
  borderColor,
}: GlassCardProps) {
  return (
    <View
      className={`rounded-2xl overflow-hidden ${className}`}
      style={[
        {
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          borderWidth: 1,
          borderColor: borderColor ?? 'rgba(255, 255, 255, 0.10)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 6,
        },
        style,
      ]}
    >
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0.01)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export default GlassCard;
