// ============================================================================
// TRENS: TIPOS DEL SISTEMA DE DEPORTES
// ============================================================================

import type { Weekday } from '../lib/weekday';

// ============================================================================
// DEPORTES
// ============================================================================

export type SportCode = 'GYM' | 'MOTO' | 'AUTO' | 'SURF';

export interface Sport {
  id: string;
  code: SportCode;
  name: string;
  description: string;
  icon: string;
  color_primary: string;
  color_secondary?: string;
  tab_4_name: string;
  tab_4_icon: string;
  tab_5_name: string;
  tab_5_icon: string;
  inventory_categories: InventoryCategory[];
  available_tools: SportTool[];
  profile_fields: ProfileField[];
  display_order: number;
}

// ============================================================================
// INVENTARIO
// ============================================================================

export interface InventoryCategory {
  code: string;
  name: string;
  icon: string;
  fields?: CategoryField[];
}

export interface CategoryField {
  code: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
}

export interface InventoryItem {
  id: string;
  user_id: string;
  sport_id: string;
  category_code: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number;
  photo_url?: string;
  video_url?: string;
  media_type?: 'PHOTO' | 'VIDEO';
  notes?: string;
  attributes: Record<string, any>;
  is_primary: boolean;
  status: 'ACTIVE' | 'SOLD' | 'BROKEN' | 'STORED';
  purchase_date?: string;
  last_service_date?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Equipment (foto/video 16:9, nombre, notas/specs) reutiliza InventoryItem tal cual:
 * category_code = 'EQUIPMENT', sport_id = el deporte seleccionado (GYM/MOTO/AUTO/SURF).
 * `media_type` + `photo_url`/`video_url` cubren el media 16:9, `notes` las especificaciones.
 * No requiere tabla ni tipo nuevo.
 */
export type Equipment = InventoryItem;

// ============================================================================
// UBICACIÓN (LOCATION) + HORARIO (SCHEDULE)
// ============================================================================

/** Horario de un día de la semana para una ubicación (apertura/cierre) */
export interface ScheduleEntry {
  weekday: Weekday; // 0=Dom..6=Sáb (lib/weekday.ts)
  open_time?: string; // "HH:MM"
  close_time?: string; // "HH:MM"
  closed?: boolean; // true = cerrado ese día
}

export interface SportLocation {
  id: string;
  user_id: string;
  sport_id: string;
  name: string; // "Smart Fit - San Isidro"
  photo_url?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  maps_url?: string; // link directo a Google/Apple Maps
  notes?: string; // especificaciones/notas del lugar
  schedule?: ScheduleEntry[]; // horario embebido (máx. 7 entradas, una por día)
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// GALERÍA (SPORT GALLERY)
// ============================================================================

export type SportGalleryMediaType = 'PHOTO' | 'VIDEO';

export interface SportGalleryItem {
  id: string;
  user_id: string;
  sport_id: string;
  location_id?: string; // opcional: asociar la foto/video a una ubicación
  media_type: SportGalleryMediaType;
  media_url: string;
  thumbnail_url?: string; // requerido para VIDEO
  cloudflare_video_id?: string; // si el video usa Cloudflare Stream
  aspect_ratio: '9:16';
  note?: string;
  taken_at: string; // fecha mostrada al usuario (editable)
  created_at: string;
}

// ============================================================================
// MANTENIMIENTO
// ============================================================================

export interface MaintenanceLog {
  id: string;
  user_id: string;
  item_id: string;
  type: string;
  title: string;
  description?: string;
  at_km?: number;
  at_hours?: number;
  cost?: number;
  currency: string;
  next_due_km?: number;
  next_due_hours?: number;
  next_due_date?: string;
  photo_urls?: string[];
  receipt_url?: string;
  performed_at: string;
  created_at: string;
}

// ============================================================================
// EVENTOS
// ============================================================================

export interface SportEvent {
  id: string;
  user_id: string;
  sport_id: string;
  name: string;
  location?: string;
  venue?: string;
  event_date: string;
  event_end_date?: string;
  event_type: 'COMPETITION' | 'TRACK_DAY' | 'SESSION' | 'TRAINING';
  status: 'UPCOMING' | 'COMPLETED' | 'CANCELLED';
  items_used?: string[];
  results?: {
    position?: number;
    best_lap?: string;
    notes?: string;
    [key: string]: any;
  };
  checklist?: ChecklistItem[];
  photo_urls?: string[];
  video_urls?: string[];
  // Campos de la tarjeta simple del timeline CEO (Hora, Maps, Texto, media)
  event_time?: string; // "HH:MM"
  maps_url?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  media_url?: string;
  media_type?: 'PHOTO' | 'VIDEO';
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  done: boolean;
}

// ============================================================================
// SURF ESPECÍFICO
// ============================================================================

export interface SurfSession {
  id: string;
  user_id: string;
  spot_name: string;
  spot_lat?: number;
  spot_lng?: number;
  wave_size_ft?: number;
  wave_period_s?: number;
  wind_direction?: string;
  wind_speed_kts?: number;
  tide?: 'HIGH' | 'MID' | 'LOW';
  water_temp_c?: number;
  board_id?: string;
  wetsuit_id?: string;
  started_at: string;
  ended_at?: string;
  duration_min?: number;
  wave_quality?: 1 | 2 | 3 | 4 | 5;
  session_rating?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  created_at: string;
}

// ============================================================================
// USER SPORT
// ============================================================================

export type PersonalizationMode = 'MANUAL' | 'AI' | 'HYBRID';

export interface UserSport {
  id: string;
  user_id: string;
  sport_id: string;
  is_active: boolean;
  is_primary: boolean;
  personalization_mode: PersonalizationMode;
  sport_profile: Record<string, any>;
  custom_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// HERRAMIENTAS
// ============================================================================

export interface SportTool {
  code: string;
  name: string;
  description?: string;
}

export interface ProfileField {
  code: string;
  name: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}

// ============================================================================
// CONFIGURACIÓN DE TABS POR DEPORTE
// ============================================================================

export interface TabConfig {
  tab4: {
    name: string;
    icon: string;
    route: string;
  };
  tab5: {
    name: string;
    icon: string;
    route: string;
  };
  color: string;
}

export const SPORT_TAB_CONFIGS: Record<SportCode, TabConfig> = {
  GYM: {
    tab4: { name: 'SPORT', icon: 'Zap', route: 'gym' },
    tab5: { name: 'CEO', icon: 'Utensils', route: 'plan' },
    color: '#DC2626',
  },
  MOTO: {
    tab4: { name: 'GARAJE', icon: 'Warehouse', route: 'gym' },
    tab5: { name: 'RACE', icon: 'Flag', route: 'plan' },
    color: '#F97316',
  },
  AUTO: {
    tab4: { name: 'GARAJE', icon: 'Warehouse', route: 'gym' },
    tab5: { name: 'RACE', icon: 'Flag', route: 'plan' },
    color: '#EAB308',
  },
  SURF: {
    tab4: { name: 'TABLA', icon: 'Sailboat', route: 'gym' },
    tab5: { name: 'SPOT', icon: 'Waves', route: 'plan' },
    color: '#0EA5E9',
  },
};

// ============================================================================
// COLORES POR DEPORTE
// ============================================================================

export const SPORT_COLORS: Record<SportCode, { primary: string; secondary: string }> = {
  GYM: { primary: '#DC2626', secondary: '#B91C1C' },
  MOTO: { primary: '#F97316', secondary: '#EA580C' },
  AUTO: { primary: '#EAB308', secondary: '#CA8A04' },
  SURF: { primary: '#0EA5E9', secondary: '#0284C7' },
};

// ============================================================================
// ICONOS POR DEPORTE
// ============================================================================

export const SPORT_ICONS: Record<SportCode, string> = {
  GYM: 'Dumbbell',
  MOTO: 'Bike',
  AUTO: 'Car',
  SURF: 'Waves',
};
