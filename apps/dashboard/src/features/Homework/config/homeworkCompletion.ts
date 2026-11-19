import {
  HOMEWORK_MISSED_ALERT_THRESHOLD,
  type HomeworkCompletionEntry, type HomeworkCompletionStatus, type HomeworkMissedRecord, type HomeworkRosterEntry,
} from '@sms/contracts';
import type { BadgeColor } from 'najm-kit';

export const COMPLETION_COLORS: Record<HomeworkCompletionStatus, BadgeColor> = {
  done: 'success',
  incomplete: 'warning',
  not_done: 'destructive',
};

/** "AMARAI AHMED" → "AA": what an avatar without a photo shows. */
export function personInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => Array.from(word)[0]).join('').toLocaleUpperCase() || '?';
}

/** Apply explicit edits and record the default for pupils still awaiting review. */
export function queueCompletionEntries(
  roster: readonly HomeworkRosterEntry[],
  pending: ReadonlyMap<string, HomeworkCompletionEntry>,
  edits: readonly HomeworkCompletionEntry[],
) {
  const queue = new Map(pending);
  for (const entry of edits) queue.set(entry.studentId, entry);
  for (const { studentId, status } of roster) {
    if (status === null && !queue.has(studentId)) queue.set(studentId, { studentId, status: 'done', ifUnreviewed: true });
  }
  return queue;
}

export type MissedByStudent = {
  student: HomeworkMissedRecord['student'];
  class: HomeworkMissedRecord['class'];
  section: HomeworkMissedRecord['section'];
  notDone: number;
  incomplete: number;
  /** Missed in the month of `today`: what the incident suggestion counts. */
  thisMonth: number;
  lastDate: string;
  subjects: string[];
  /** Newest first, as the server sends them. */
  records: HomeworkMissedRecord[];
  /** Enough missed this month that the page suggests opening an incident. */
  toReport: boolean;
};

/** The records grouped by pupil, most missed this month first, then most missed overall. */
export function missedByStudent(records: HomeworkMissedRecord[], today: string, threshold = HOMEWORK_MISSED_ALERT_THRESHOLD): MissedByStudent[] {
  const month = today.slice(0, 7);
  const groups = new Map<string, MissedByStudent>();
  for (const record of records) {
    let group = groups.get(record.student.id);
    if (!group) {
      group = {
        student: record.student, class: record.class, section: record.section,
        notDone: 0, incomplete: 0, thisMonth: 0, lastDate: record.date, subjects: [], records: [], toReport: false,
      };
      groups.set(record.student.id, group);
    }
    group.records.push(record);
    if (record.status === 'not_done') group.notDone += 1;
    else group.incomplete += 1;
    if (record.date.slice(0, 7) === month) group.thisMonth += 1;
    if (record.date > group.lastDate) {
      group.lastDate = record.date;
      group.class = record.class;
      group.section = record.section;
    }
    const subject = record.subject?.name;
    if (subject && !group.subjects.includes(subject)) group.subjects.push(subject);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, toReport: group.thisMonth >= threshold }))
    .sort((left, right) => right.thisMonth - left.thisMonth
      || (right.notDone + right.incomplete) - (left.notDone + left.incomplete)
      || left.student.name.localeCompare(right.student.name));
}

/** The pupil's records of the month of `today`: those a suggested incident names. */
export function missedThisMonth(group: MissedByStudent, today: string) {
  const month = today.slice(0, 7);
  return group.records.filter((record) => record.date.slice(0, 7) === month);
}
