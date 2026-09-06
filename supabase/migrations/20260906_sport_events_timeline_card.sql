-- ============================================================================
-- TRENS: Campos para tarjeta simple de evento en el timeline CEO
-- Migración: 20260906_sport_events_timeline_card.sql
-- Descripción: sport_events ya existía (20241225_sports_system.sql). Se agregan
--              los 4 campos que necesita la tarjeta genérica del timeline:
--              Hora, Ubicación (Maps), Texto y un archivo multimedia adjunto.
-- ============================================================================

ALTER TABLE sport_events
  ADD COLUMN IF NOT EXISTS event_time TEXT,       -- "HH:MM" (mismo formato que cardio_blocks.scheduled_time)
  ADD COLUMN IF NOT EXISTS maps_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('PHOTO', 'VIDEO'));

CREATE INDEX IF NOT EXISTS idx_sport_events_user_date ON sport_events(user_id, event_date);
