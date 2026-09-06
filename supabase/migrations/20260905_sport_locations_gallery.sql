-- ============================================================================
-- TRENS: UBICACIONES Y GALERÍA DEL MÓDULO SPORT (ex "Gym")
-- Migración: 20260905_sport_locations_gallery.sql
-- Descripción: Agrega Location (con Schedule embebido) y SportGallery.
--              Equipment NO requiere tabla nueva: reutiliza inventory_items
--              con category_code = 'EQUIPMENT' (ver 20241225_sports_system.sql).
-- ============================================================================

-- ============================================================================
-- 1. UBICACIONES (LOCATION) — incluye SCHEDULE embebido como JSONB
-- ============================================================================
CREATE TABLE IF NOT EXISTS sport_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),

  -- Identificación
  name TEXT NOT NULL,                   -- "Smart Fit - San Isidro"
  photo_url TEXT,
  address TEXT,

  -- Coordenadas / Maps
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  maps_url TEXT,                        -- link directo a Google/Apple Maps

  -- Horario (Schedule): array de entradas por día de la semana
  -- [{"weekday":1,"open_time":"06:00","close_time":"22:00"}, {"weekday":0,"closed":true}]
  schedule JSONB DEFAULT '[]',

  is_primary BOOLEAN DEFAULT false,     -- ubicación principal del usuario

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_locations_user ON sport_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_sport_locations_sport ON sport_locations(user_id, sport_id);

-- ============================================================================
-- 2. GALERÍA (SPORT GALLERY) — fotos/videos 9:16 con fecha y nota
-- ============================================================================
CREATE TABLE IF NOT EXISTS sport_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES sports(id),
  location_id UUID REFERENCES sport_locations(id) ON DELETE SET NULL,

  media_type TEXT NOT NULL CHECK (media_type IN ('PHOTO', 'VIDEO')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,                   -- requerido en la práctica para VIDEO
  cloudflare_video_id TEXT,             -- si el video usa Cloudflare Stream
  aspect_ratio TEXT NOT NULL DEFAULT '9:16' CHECK (aspect_ratio = '9:16'),

  note TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- fecha mostrada al usuario (editable)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_gallery_user ON sport_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_sport_gallery_sport ON sport_gallery(user_id, sport_id);
CREATE INDEX IF NOT EXISTS idx_sport_gallery_taken_at ON sport_gallery(user_id, taken_at DESC);

-- ============================================================================
-- 3. TRIGGERS updated_at (reutiliza update_updated_at_column() de 20241225)
-- ============================================================================
CREATE TRIGGER update_sport_locations_updated_at
  BEFORE UPDATE ON sport_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================
ALTER TABLE sport_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own locations" ON sport_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own locations" ON sport_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own locations" ON sport_locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own locations" ON sport_locations FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE sport_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own gallery" ON sport_gallery FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gallery" ON sport_gallery FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gallery" ON sport_gallery FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gallery" ON sport_gallery FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
