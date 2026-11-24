// ============================================================================
// TASK ACTIONS — Completar/desmarcar tareas. Las recurrentes (cada mes) no se
// marcan como hechas: pasan a su siguiente ocurrencia.
// ============================================================================

import { supabase } from '../../lib/supabase';
import { nextMonthlyDate } from './taskTypes';

interface CompletableTask {
  id: string;
  is_done: boolean;
  task_date: string;
  recurrence?: 'monthly' | null;
  recur_day?: number | null;
}

export interface TaskCompletion {
  task_date: string;
  is_done: boolean;
  rolled: boolean;
}

export async function toggleTaskDone(task: CompletableTask): Promise<TaskCompletion | null> {
  const updated_at = new Date().toISOString();

  if (task.recurrence === 'monthly' && !task.is_done) {
    const day = task.recur_day || Number(task.task_date.slice(8, 10));
    const nextDate = nextMonthlyDate(task.task_date, day);
    const { error } = await supabase
      .from('user_tasks')
      .update({ task_date: nextDate, is_done: false, updated_at })
      .eq('id', task.id);
    if (error) {
      console.error('Error avanzando tarea recurrente:', error);
      return null;
    }
    return { task_date: nextDate, is_done: false, rolled: true };
  }

  const next = !task.is_done;
  const { error } = await supabase
    .from('user_tasks')
    .update({ is_done: next, updated_at })
    .eq('id', task.id);
  if (error) {
    console.error('Error actualizando tarea:', error);
    return null;
  }
  return { task_date: task.task_date, is_done: next, rolled: false };
}
