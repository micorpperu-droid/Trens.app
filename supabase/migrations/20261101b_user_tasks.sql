-- ============================================================================
-- USER_TASKS - Tareas (texto + hora opcional). Con hora aparecen en el timeline CEO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  due_time TEXT,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_date
  ON public.user_tasks(user_id, task_date, due_time);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tasks_select" ON public.user_tasks;
CREATE POLICY "user_tasks_select" ON public.user_tasks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tasks_insert" ON public.user_tasks;
CREATE POLICY "user_tasks_insert" ON public.user_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tasks_update" ON public.user_tasks;
CREATE POLICY "user_tasks_update" ON public.user_tasks FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tasks_delete" ON public.user_tasks;
CREATE POLICY "user_tasks_delete" ON public.user_tasks FOR DELETE USING (auth.uid() = user_id);
