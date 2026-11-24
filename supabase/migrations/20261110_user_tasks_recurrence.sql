-- Tareas recurrentes cada mes: la fila avanza a la siguiente ocurrencia al completarla
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IS NULL OR recurrence IN ('monthly')),
  ADD COLUMN IF NOT EXISTS recur_day SMALLINT CHECK (recur_day IS NULL OR recur_day BETWEEN 1 AND 31);
