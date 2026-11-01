import type { RoutineScheduleSummary } from '../types';

/** Keep the section order and show its published week, falling back to its latest draft. */
export function selectRoutineSchedules(sectionIds: readonly string[], schedules: readonly RoutineScheduleSummary[]) {
  return sectionIds.map((sectionId) => {
    const candidates = schedules.filter((schedule) => schedule.sectionId === sectionId);
    return candidates.find((schedule) => schedule.status === 'published')
      ?? candidates.find((schedule) => schedule.status === 'draft');
  });
}

/** A class selection targets one current timetable per section, never its older drafts. */
export function selectClassRoutineSchedules(classIds: readonly string[], schedules: readonly RoutineScheduleSummary[]) {
  return [...new Set(classIds)].flatMap((classId) => {
    const candidates = schedules.filter((schedule) => schedule.classId === classId);
    const sectionIds = [...new Set(candidates.map((schedule) => schedule.sectionId))];
    return selectRoutineSchedules(sectionIds, candidates).flatMap((schedule) => schedule ? [schedule] : []);
  });
}
