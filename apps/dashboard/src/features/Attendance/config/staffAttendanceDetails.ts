import { changedRosterMarks, rosterMark, type RosterStatus } from './rosterMarks';

export type StaffAttendanceDetails = { arrivalTime: string; notes: string };

export function staffAttendanceDetails(saved?: { arrivalTime?: string | null; notes?: string | null }): StaffAttendanceDetails {
  return { arrivalTime: saved?.arrivalTime ?? '', notes: saved?.notes ?? '' };
}

/** Detail edits can change a saved mark without marking anyone else present. */
export function changedStaffRosterMarks<T extends { id: string }>(
  roster: T[],
  marks: Record<string, RosterStatus>,
  details: Record<string, StaffAttendanceDetails>,
  saved: Map<string, { id?: string; status: string; arrivalTime?: string | null; notes?: string | null }>,
) {
  const changes = changedRosterMarks(roster, marks, saved);
  const changedIds = new Set(changes.map(({ person }) => person.id));
  for (const person of roster) {
    if (changedIds.has(person.id) || !details[person.id]) continue;
    const existing = saved.get(person.id);
    const status = rosterMark(marks[person.id], existing?.status);
    if (status === 'unmarked') continue;
    const before = staffAttendanceDetails(existing);
    const after = details[person.id];
    if (before.arrivalTime !== after.arrivalTime || before.notes !== after.notes) {
      changes.push({ person, status, existing });
    }
  }
  return changes;
}
