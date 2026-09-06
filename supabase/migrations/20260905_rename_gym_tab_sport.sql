-- ============================================================================
-- TRENS: Renombrar tab "GYM" a "SPORT" con icono Zap
-- Migración: 20260905_rename_gym_tab_sport.sql
-- ============================================================================

UPDATE sports
SET tab_4_name = 'SPORT', tab_4_icon = 'Zap'
WHERE code = 'GYM';
