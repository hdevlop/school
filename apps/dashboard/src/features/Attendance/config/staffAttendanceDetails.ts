import { changedRosterMarks, rosterMark, type RosterStatus } from './rosterMarks';

export type StaffAttendanceDetails = { arrivalTime: string; notes: string };

export function staffAttendanceDetails(saved?: { arrivalTime?: string | null; notes?: string | null }): StaffAttendanceDetails {
  return { arrivalTime: saved?.arrivalTime ?? '', notes: saved?.notes ?? '' };
}

/** Present is the default; send exceptions, corrections and intentional detail edits. */
export function changedStaffRosterMarks<T extends { id: string }>(
  roster: T[],
  marks: Record<string, RosterStatus>,
  details: Record<string, StaffAttendanceDetails>,
  saved: Map<string, { id?: string; status: string; arrivalTime?: string | null; notes?: string | null }>,
) {
  const changes = changedRosterMarks(roster, marks, saved)
    .filter(({ status, existing }) => status !== 'present' || Boolean(existing));
  const changedIds = new Set(changes.map(({ person }) => person.id));
  for (const person of roster) {
    if (changedIds.has(person.id) || !details[person.id]) continue;
    const existing = saved.get(person.id);
    const status = rosterMark(marks[person.id], existing?.status, 'present');
    if (status === 'unmarked') continue;
    const before = staffAttendanceDetails(existing);
    const after = details[person.id];
    if (before.arrivalTime !== after.arrivalTime || before.notes !== after.notes) {
      changes.push({ person, status, existing });
    }
  }
  return changes;
}
