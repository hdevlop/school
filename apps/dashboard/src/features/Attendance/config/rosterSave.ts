/**
 * What a student register save sends, checked against the marks the server
 * holds for that day just before it is sent.
 *
 * The register decides create or update from the list it loaded. That list
 * goes stale: a save that failed part-way (it is refetched only on success),
 * another tab, or a colleague marking the same section. A stale create for a
 * student who already has a mark is refused as "already recorded", and every
 * later save repeats it. Saving over the held record instead is what the
 * register would have done had its list been current.
 */

export type StudentRosterItem = {
  id?: string;
  studentId: string;
  sectionId?: string;
  date: string;
  status: string;
  /** Per-class registers only: the lesson the mark belongs to. Never sent. */
  teacherAssignmentId?: string;
  [key: string]: unknown;
};

export type SavedStudentMark = {
  id: string;
  studentId?: string | null;
  sectionId?: string | null;
  section?: { id?: string | null } | null;
  teacherAssignmentId?: string | null;
  date: string;
  status: string;
};

/**
 * The held mark an item would duplicate, by the server's own duplicate rule:
 * per-class, the same student, lesson and day; daily, the same student,
 * section and day (an older mark reaches its section through its lesson).
 */
export function savedMarkFor(item: StudentRosterItem, saved: SavedStudentMark[]) {
  return saved.find((mark) => {
    if (mark.studentId !== item.studentId || mark.date !== item.date) return false;
    if (item.teacherAssignmentId) return mark.teacherAssignmentId === item.teacherAssignmentId;
    return (mark.section?.id ?? mark.sectionId) === item.sectionId;
  });
}

/**
 * Turns each create that duplicates a held mark into an update of that mark,
 * and drops it when the held mark already says the same.
 */
export function reconcileRosterItems(items: StudentRosterItem[], saved: SavedStudentMark[]) {
  return items.flatMap((item) => {
    if (item.id) return [item];
    const held = savedMarkFor(item, saved);
    if (!held) return [item];
    return held.status === item.status ? [] : [{ ...item, id: held.id }];
  });
}

/** The request body: the lesson is matching metadata, not a field the API takes. */
export function rosterRequestBody({ id, teacherAssignmentId: _lesson, ...body }: StudentRosterItem) {
  return { id, body };
}

/** Runs `send` over every item, at most `limit` at a time, and waits for all of them. */
export async function settleWithLimit<T, R>(items: T[], limit: number, send: (item: T) => Promise<R>) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await send(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
