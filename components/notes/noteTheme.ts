export interface UserNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export const NOTE_COLORS = [
  '#DC2626', // rojo
  '#F97316', // naranja
  '#EAB308', // amarillo
  '#22C55E', // verde
  '#0EA5E9', // azul
  '#A855F7', // morado
  '#EC4899', // rosa
  '#A1A1AA', // gris
] as const;

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[2];

/** Convierte #RRGGBB a rgba() con la opacidad dada. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
