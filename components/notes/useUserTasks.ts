import { useCallback, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserTask } from './taskTypes';

const byPending = (a: UserTask, b: UserTask) => {
  if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
  if (a.task_date !== b.task_date) return a.task_date.localeCompare(b.task_date);
  // Con hora primero, ordenadas; sin hora al final
  if (!!a.due_time !== !!b.due_time) return a.due_time ? -1 : 1;
  if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
  return a.created_at.localeCompare(b.created_at);
};

export function useUserTasks(userId?: string) {
  const [tasks, setTasks] = useState<UserTask[]>([]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('task_date', { ascending: true });
    if (error) {
      console.error('Error cargando tareas:', error);
      return;
    }
    setTasks(((data as UserTask[]) || []).sort(byPending));
  }, [userId]);

  const upsertLocal = useCallback((task: UserTask) => {
    setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task].sort(byPending));
  }, []);

  const removeLocal = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleDone = useCallback(
    async (task: UserTask) => {
      const next = !task.is_done;
      upsertLocal({ ...task, is_done: next });
      const { error } = await supabase
        .from('user_tasks')
        .update({ is_done: next, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (error) {
        console.error('Error actualizando tarea:', error);
        upsertLocal(task);
      }
    },
    [upsertLocal]
  );

  const clearDone = useCallback(async () => {
    if (!userId) return;
    const { error } = await supabase
      .from('user_tasks')
      .delete()
      .eq('user_id', userId)
      .eq('is_done', true);
    if (error) console.error('Error limpiando tareas:', error);
    else setTasks((prev) => prev.filter((t) => !t.is_done));
  }, [userId]);

  return { tasks, reload, upsertLocal, removeLocal, toggleDone, clearDone };
}
