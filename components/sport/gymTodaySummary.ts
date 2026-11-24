// ============================================================================
// GYM TODAY SUMMARY — Entreno de hoy (misma lógica que la tarjeta ENTRENO de CEO)
// Rutina del día, sesiones con hora y ejercicios con su media.
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface GymExercise {
  id: string;
  name: string;
  imageUrl?: string;
  videoUrl?: string;
  sessionIndex?: number;
}

export interface GymSession {
  label: string | null; // "SESIÓN A" / "SESIÓN B" solo con doble sesión
  time: string | null; // HH:MM
  exercises: GymExercise[];
}

export interface GymTodaySummary {
  routineName: string;
  isRestDay: boolean;
  sessions: GymSession[];
}

const isVideoUrl = (url: string) =>
  !!url && ['.mp4', '.mov', '.avi', '.webm', '.m4v'].some((ext) => url.toLowerCase().includes(ext));

export async function fetchGymTodaySummary(userId: string): Promise<GymTodaySummary | null> {
  try {
    const [userProfileRes, profileRes, configsRes, positionsRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('training_mode, external_schedule')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('training_routine_names, training_session_names')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_exercise_config')
        .select(
          'id, training_days, custom_media_url, session_index, exercises (id, name, default_media_url, thumbnail_url, video_url)'
        )
        .eq('user_id', userId)
        .order('display_order', { ascending: true }),
      supabase
        .from('workout_block_position')
        .select('session_index, scheduled_time')
        .eq('user_id', userId),
    ]);

    const trainingMode = userProfileRes.data?.training_mode || 'none';
    const externalSchedule = (userProfileRes.data?.external_schedule || {}) as Record<string, string>;
    const routineNames = (profileRes.data?.training_routine_names || {}) as Record<string, string>;
    const sessionNamesMap = (profileRes.data?.training_session_names || {}) as Record<
      string,
      Record<string, string>
    >;

    const currentDay = new Date().getDay(); // 0=Dom..6=Sáb
    let workoutDay = currentDay;
    let routineName = 'ENTRENAMIENTO';

    if (trainingMode === 'external' && Object.keys(externalSchedule).length > 0) {
      const entries = Object.entries(externalSchedule).filter(
        ([, muscle]) => muscle && String(muscle).trim() !== ''
      );
      if (entries.length > 0) {
        const safeIndex = Math.min(currentDay, entries.length - 1) % entries.length;
        workoutDay = safeIndex;
        const [, muscleGroup] = entries[safeIndex] || ['', ''];
        const savedName = routineNames[String(safeIndex)];
        routineName = (savedName || String(muscleGroup || ''))
          .replace(/^Día\s*\d+\s*:\s*/i, '')
          .trim();
        if (!routineName) routineName = 'DESCANSO';
      }
    } else {
      routineName = (routineNames[String(currentDay)] || 'ENTRENAMIENTO').replace(
        /^Día\s*\d+\s*:\s*/i,
        ''
      );
    }

    const exercises: GymExercise[] = [];
    (configsRes.data || []).forEach((config: any) => {
      const days: number[] = config.training_days || [0];
      if (!days.includes(workoutDay) || !config.exercises) return;
      const ex = config.exercises;
      const mediaUrl = config.custom_media_url || ex.default_media_url || ex.thumbnail_url || '';
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      if (ex.video_url) {
        videoUrl = ex.video_url;
        imageUrl = mediaUrl || undefined;
      } else if (isVideoUrl(mediaUrl)) {
        videoUrl = mediaUrl;
      } else {
        imageUrl = mediaUrl || undefined;
      }
      exercises.push({
        id: config.id,
        name: ex.name,
        imageUrl,
        videoUrl,
        sessionIndex: config.session_index ?? 0,
      });
    });

    const isRestDay = (routineNames[String(currentDay)] || '').trim().length === 0;
    const hasSessionB = exercises.some((e) => e.sessionIndex === 1);
    const daySessionNames = sessionNamesMap[String(workoutDay)] || {};
    const posA = (positionsRes.data || []).find((p: any) => p.session_index === 0);
    const posB = (positionsRes.data || []).find((p: any) => p.session_index === 1);

    const sessions: GymSession[] = [
      {
        label: hasSessionB ? daySessionNames['0'] || 'SESIÓN A' : null,
        time: posA?.scheduled_time?.slice(0, 5) || null,
        exercises: hasSessionB ? exercises.filter((e) => (e.sessionIndex ?? 0) === 0) : exercises,
      },
    ];
    if (hasSessionB) {
      sessions.push({
        label: daySessionNames['1'] || 'SESIÓN B',
        time: posB?.scheduled_time?.slice(0, 5) || null,
        exercises: exercises.filter((e) => e.sessionIndex === 1),
      });
    }

    return { routineName, isRestDay: isRestDay && !hasSessionB, sessions };
  } catch (error) {
    console.error('Error cargando entreno de hoy:', error);
    return null;
  }
}
