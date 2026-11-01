export interface UserTask {
  id: string;
  user_id: string;
  content: string;
  due_time: string | null; // "HH:MM" 24h
  task_date: string; // YYYY-MM-DD (fecha local)
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

/** Fecha local YYYY-MM-DD (evita el desfase UTC de toISOString). */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "14:30" -> "2:30 PM" */
export function formatTime12(time24?: string | null): string | null {
  if (!time24) return null;
  const [h, m] = time24.split(':').map((s) => parseInt(s, 10));
  const hour = h || 0;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

/** Suma días a una fecha YYYY-MM-DD (en hora local). */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

/** "2026-11-05" -> "HOY" | "MAÑANA" | "05 nov" */
export function formatDateLabel(iso: string): string {
  const today = localDateISO();
  if (iso === today) return 'HOY';
  if (iso === addDaysISO(today, 1)) return 'MAÑANA';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short' });
}
