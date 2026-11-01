-- ============================================================================
-- USER_NOTES - Módulo NOTAS: notas simples de texto con título opcional y color
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#DC2626',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user_updated
  ON public.user_notes(user_id, updated_at DESC);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notes_select" ON public.user_notes;
CREATE POLICY "user_notes_select" ON public.user_notes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notes_insert" ON public.user_notes;
CREATE POLICY "user_notes_insert" ON public.user_notes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notes_update" ON public.user_notes;
CREATE POLICY "user_notes_update" ON public.user_notes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notes_delete" ON public.user_notes;
CREATE POLICY "user_notes_delete" ON public.user_notes FOR DELETE USING (auth.uid() = user_id);
