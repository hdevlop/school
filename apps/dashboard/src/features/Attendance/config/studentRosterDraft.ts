import { rosterMark, type RosterStatus } from './rosterMarks';
import type { SavedStudentMark, StudentRosterItem } from './rosterSave';

/** A lesson's mark also names its teacher and subject (see studentRosterItem). */
export type StudentDraftItem = StudentRosterItem & { type: 'student'; status: RosterStatus; teacherId?: string; subjectId?: string };
export type StudentRosterDraft = Record<string, StudentDraftItem>;
export type StudentRosterPerson = { id: string; sectionId?: string; section?: { id?: string } };
export type StudentRosterContext = {
  date: string;
  attendanceMode: 'daily' | 'per_class';
  allSections: boolean;
  sectionId?: string;
  teacherId?: string;
  subjectId?: string;
  teacherAssignmentId?: string;
};

export function studentMarkKey(item: Pick<StudentRosterItem, 'studentId' | 'date' | 'sectionId' | 'teacherAssignmentId'>) {
  return JSON.stringify([item.date, item.studentId, item.teacherAssignmentId || item.sectionId, Boolean(item.teacherAssignmentId)]);
}

/** Index both lesson marks and the section identity used by a daily register. */
export function indexStudentMarks(marks: SavedStudentMark[]) {
  const indexed = new Map<string, SavedStudentMark>();
  for (const mark of marks) {
    if (!mark.studentId) continue;
    const identity = { date: mark.date, studentId: mark.studentId, sectionId: mark.section?.id ?? mark.sectionId ?? undefined };
    indexed.set(studentMarkKey(identity), mark);
    if (mark.teacherAssignmentId) indexed.set(studentMarkKey({ ...identity, teacherAssignmentId: mark.teacherAssignmentId }), mark);
  }
  return indexed;
}

export function studentRosterItem(person: StudentRosterPerson, context: StudentRosterContext): StudentDraftItem | undefined {
  if (!context.allSections && (!context.sectionId || (context.attendanceMode === 'per_class'
    && (!context.teacherId || !context.subjectId || !context.teacherAssignmentId)))) return;
  return {
    type: 'student', studentId: person.id, date: context.date, status: 'present',
    sectionId: context.allSections ? person.sectionId ?? person.section?.id : context.sectionId,
    ...(!context.allSections && context.teacherId ? { teacherId: context.teacherId } : {}),
    ...(!context.allSections && context.subjectId ? { subjectId: context.subjectId } : {}),
    ...(!context.allSections && context.attendanceMode === 'per_class' ? { teacherAssignmentId: context.teacherAssignmentId } : {}),
  };
}

export function studentRosterChanges(roster: StudentRosterPerson[], draft: StudentRosterDraft,
  saved: Map<string, SavedStudentMark>, context: StudentRosterContext) {
  return roster.flatMap(person => {
    const item = studentRosterItem(person, context);
    if (!item) return [];
    const key = studentMarkKey(item);
    const existing = saved.get(key);
    const status = rosterMark(draft[key]?.status, existing?.status, 'present') as RosterStatus;
    // Present is the visual default, not a new record to send. Keep explicit
    // corrections of saved absent/late marks so those records can be updated.
    if (status === existing?.status || (status === 'present' && !existing)) return [];
    return [{ ...item, status, ...(existing ? { id: existing.id } : {}) }];
  });
}

/** Stage only exceptions and corrections, retaining edits from other sections. */
export function stageStudentRoster(roster: StudentRosterPerson[], draft: StudentRosterDraft,
  saved: Map<string, SavedStudentMark>, context: StudentRosterContext, marks: Record<string, RosterStatus>) {
  const edited = { ...draft };
  for (const person of roster) {
    const item = studentRosterItem(person, context);
    if (item && marks[person.id]) edited[studentMarkKey(item)] = { ...item, status: marks[person.id] };
  }
  const next = { ...draft };
  for (const person of roster) {
    const item = studentRosterItem(person, context);
    if (item) delete next[studentMarkKey(item)];
  }
  for (const item of studentRosterChanges(roster, edited, saved, context)) next[studentMarkKey(item)] = item;
  return next;
}

/** Combine pending exceptions and corrections across sections with the current register. */
export function studentRosterSubmission(roster: StudentRosterPerson[], draft: StudentRosterDraft,
  saved: Map<string, SavedStudentMark>, context: StudentRosterContext) {
  const queued = { ...draft };
  for (const person of roster) {
    const item = studentRosterItem(person, context);
    if (item) delete queued[studentMarkKey(item)];
  }
  for (const item of studentRosterChanges(roster, draft, saved, context)) queued[studentMarkKey(item)] = item;
  return Object.values(queued).flatMap(item => {
    if (item.date !== context.date) return [];
    const existing = saved.get(studentMarkKey(item));
    if (existing?.status === item.status || (item.status === 'present' && !existing)) return [];
    return [{ ...item, ...(existing ? { id: existing.id } : {}) }];
  });
}

/** A completed send must keep any marks edited while it was in flight. */
export function clearSubmittedStudentMarks(draft: StudentRosterDraft, submitted: StudentDraftItem[]) {
  const next = { ...draft };
  for (const item of submitted) {
    const key = studentMarkKey(item);
    if (next[key]?.status === item.status) delete next[key];
  }
  return next;
}

/** Refetches after a partial failure confirm which queued marks already reached the server. */
export function clearSavedStudentMarks(draft: StudentRosterDraft, saved: Map<string, SavedStudentMark>) {
  return Object.fromEntries(Object.entries(draft).filter(([key, item]) => saved.get(key)?.status !== item.status));
}
