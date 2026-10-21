export const ROUTINE_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type RoutineDay = (typeof ROUTINE_DAYS)[number];
export const DEFAULT_TEACHING_DAYS: RoutineDay[] = ROUTINE_DAYS.slice(0, 6);

export interface SchoolDaySettings {
  schoolStartTime?: string | null;
  schoolEndTime?: string | null;
  lunchBreakDuration?: number | null;
}

/** Six lessons around lunch, fitting the configured day exactly. */
export function schoolDayPeriods(school: SchoolDaySettings = {}) {
  const minutes = (value: string) => {
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Invalid school day time');
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  let cursor = minutes(school.schoolStartTime ?? '08:00');
  const end = minutes(school.schoolEndTime ?? '15:00');
  const lunch = school.lunchBreakDuration ?? 30;
  const teaching = end - cursor - lunch;
  if (!Number.isInteger(lunch) || lunch < 15 || lunch > 120 || teaching < 30) {
    throw new Error('School day must fit lunch and six teaching periods');
  }
  const periods: { type: 'lesson' | 'break'; name: string; startTime: string; endTime: string }[] = [];
  const append = (type: 'lesson' | 'break', name: string, duration: number) => {
    periods.push({ type, name, startTime: time(cursor), endTime: time(cursor + duration) });
    cursor += duration;
  };
  for (let index = 0; index < 6; index++) {
    if (index === 3) append('break', 'Lunch break', lunch);
    append('lesson', `Period ${index + 1}`, Math.floor(teaching / 6) + (index < teaching % 6 ? 1 : 0));
  }
  return periods;
}

/** Teaching content within one already-booked routine period. */
export const MAX_ROUTINE_CONTENT_GROUPS = 6;
export const MAX_ROUTINE_CONTENT_LABEL_LENGTH = 100;

export type RoutineContentGroup =
  | { kind: 'fixed'; label: string }
  | { kind: 'alternative'; options: [string, string] };

export interface RoutineContent {
  contentGroups: RoutineContentGroup[];
}

export function describeRoutineContent(groups: RoutineContentGroup[], subjectName: string, orLabel: string): string {
  if (!groups.length) return subjectName;
  return groups.map((group) => group.kind === 'fixed'
    ? group.label
    : group.options.join(` ${orLabel} `)).join(' · ');
}
