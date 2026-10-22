export type RosterStatus = 'present' | 'absent' | 'late';
export type RosterMark = RosterStatus | 'unmarked';

export function rosterMark(draft: RosterStatus | undefined, saved: unknown, fallback: RosterMark = 'unmarked'): RosterMark {
  if (draft) return draft;
  return saved === 'present' || saved === 'absent' || saved === 'late' ? saved : fallback;
}

/** Include default marks for new records when the register supplies a default. */
export function changedRosterMarks<T extends { id: string }>(
  roster: T[],
  draft: Record<string, RosterStatus>,
  saved: Map<string, { id?: string; status: string }>,
  defaultStatus?: RosterStatus,
) {
  return roster.flatMap((person) => {
    const existing = saved.get(person.id);
    const status = rosterMark(draft[person.id], existing?.status, defaultStatus ?? 'unmarked');
    return status !== 'unmarked' && status !== existing?.status ? [{ person, status, existing }] : [];
  });
}
