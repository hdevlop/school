export type RosterStatus = 'present' | 'absent' | 'late';
export type RosterMark = RosterStatus | 'unmarked';

export function rosterMark(draft: RosterStatus | undefined, saved: unknown): RosterMark {
  if (draft) return draft;
  return saved === 'present' || saved === 'absent' || saved === 'late' ? saved : 'unmarked';
}

/** Only explicit marks can create or change attendance. */
export function changedRosterMarks<T extends { id: string }>(
  roster: T[],
  draft: Record<string, RosterStatus>,
  saved: Map<string, { id?: string; status: string }>,
) {
  return roster.flatMap((person) => {
    const status = draft[person.id];
    const existing = saved.get(person.id);
    return status && status !== existing?.status ? [{ person, status, existing }] : [];
  });
}
