-- ============================================================================
-- TRENS: Coordenadas para el picker de mapa (buscador estilo Google Maps)
-- Migración: 20260906b_sport_events_coordinates.sql
-- Descripción: sport_events necesita lat/lng (ya las tiene sport_locations)
--              para poder renderizar la vista previa tipo mapa del evento.
-- ============================================================================

ALTER TABLE sport_events
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);
