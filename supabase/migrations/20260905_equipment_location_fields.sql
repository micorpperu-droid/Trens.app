-- ============================================================================
-- TRENS: Campos de media y notas para Equipment (inventory_items) y Location
-- Migración: 20260905_equipment_location_fields.sql
-- Descripción: Equipment necesita soportar foto O video 16:9 + notas/specs.
--              Location necesita un texto de notas/specs.
-- ============================================================================

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'PHOTO' CHECK (media_type IN ('PHOTO', 'VIDEO')),
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE sport_locations
  ADD COLUMN IF NOT EXISTS notes TEXT;
