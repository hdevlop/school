/**
 * Homework (devoirs · الواجبات المنزلية): what a teacher posts for a class and
 * its families read. The values and limits are shared so the form, the upload
 * step in the browser and the server refuse the same things.
 */
export const HOMEWORK_ATTACHMENT_KIND_VALUES = ['image', 'pdf'] as const;
export type HomeworkAttachmentKind = typeof HOMEWORK_ATTACHMENT_KIND_VALUES[number];

const MB = 1024 * 1024;

export const HOMEWORK_LIMITS = {
  title: 200,
  content: 4000,
  /** A board photo plus a few book pages. */
  attachments: 5,
  /** What an upload may weigh before the server processes it. */
  imageUploadBytes: 10 * MB,
  /** What a processed image may weigh; an outlier is refused, not stored. */
  storedImageBytes: 1 * MB,
  /** PDFs are stored as received, so they are limited instead of compressed. */
  pdfBytes: 5 * MB,
  /** Longest edge of a stored image: a board or a book page stays readable. */
  imageEdge: 1600,
} as const;

/** Live attachments one teacher may hold in one academic year, unless Settings says otherwise. */
export const HOMEWORK_DEFAULT_QUOTA_MB = 500;
/** Days after the due date (or the given date) that a homework file is kept. */
export const HOMEWORK_DEFAULT_RETENTION_DAYS = 180;

/** What the file input offers. The server decides from the bytes, not from this. */
export const HOMEWORK_UPLOAD_ACCEPT = 'image/*,application/pdf';

export interface HomeworkAttachment {
  id: string;
  kind: HomeworkAttachmentKind;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  position: number;
  /** Set once the file was removed by retention; the row stays so the homework still lists it. */
  purgedAt: string | null;
}

/**
 * Whether a pupil did a homework, as the teacher recorded it in the
 * homework's follow-up (Suivi). A pupil with no record was not checked yet:
 * that is neither done nor missed.
 */
export const HOMEWORK_COMPLETION_STATUS_VALUES = ['done', 'incomplete', 'not_done'] as const;
export type HomeworkCompletionStatus = typeof HOMEWORK_COMPLETION_STATUS_VALUES[number];
/** The statuses that count as a missed homework. */
export const HOMEWORK_MISSED_STATUS_VALUES = ['incomplete', 'not_done'] as const satisfies readonly HomeworkCompletionStatus[];
export type HomeworkMissedStatus = typeof HOMEWORK_MISSED_STATUS_VALUES[number];
/** Longest remark a teacher may add to one pupil's record. */
export const HOMEWORK_COMPLETION_NOTE_MAX = 300;
/**
 * Missed homework (incomplete or not done) in one month from which the
 * follow-up page suggests a discipline incident. It only suggests: the
 * incident is written by a person, never by the app.
 */
export const HOMEWORK_MISSED_ALERT_THRESHOLD = 3;

/** One pupil's recorded follow-up of one homework. */
export interface HomeworkCompletion {
  status: HomeworkCompletionStatus;
  note: string | null;
}

/** One of the reading parent's children the homework is for, and when that parent marked it seen. */
export interface HomeworkChild {
  id: string;
  name: string;
  seenAt: string | null;
  /** The teacher's follow-up for this child, once recorded. */
  completion: HomeworkCompletion | null;
}

/** A pupil the homework was given to, with their follow-up when one was recorded. */
export interface HomeworkRosterEntry {
  studentId: string;
  name: string;
  image: string | null;
  status: HomeworkCompletionStatus | null;
  note: string | null;
}

/** The follow-up a teacher saves: every pupil listed gets that status. */
export interface HomeworkCompletionEntry {
  studentId: string;
  status: HomeworkCompletionStatus;
  note?: string | null;
}

/** One missed homework of one pupil: the rows the Conduite follow-up page counts. */
export interface HomeworkMissedRecord {
  id: string;
  status: HomeworkMissedStatus;
  note: string | null;
  homeworkId: string;
  title: string;
  date: string;
  dueOn: string | null;
  subject: { id: string; name: string } | null;
  subSubject: string | null;
  student: { id: string; name: string; image: string | null };
  /** Where the pupil sat on the day the homework was given. */
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
}

export interface HomeworkRow {
  id: string;
  academicYearId: string | null;
  teacherAssignmentId: string;
  title: string;
  content: string | null;
  date: string;
  dueOn: string | null;
  sectionIds: string[] | null;
  assessmentId: string | null;
  subject: { id: string; name: string; code: string | null } | null;
  /** The part of the subject it is for (Français: Graphisme, Dictée…), when one was chosen. */
  subSubject: string | null;
  teacher: { id: string; name: string; image: string | null } | null;
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  targetSections: Array<{ id: string; name: string; classId: string }>;
  attachments: HomeworkAttachment[];
  /** Parents only: their children in the homework's sections on its date. */
  children?: HomeworkChild[];
  /** Staff only: pupils whose parent marked the homework seen, out of those it was given to. */
  seenCount?: number;
  studentCount?: number;
  /** Staff only: the pupils whose follow-up was recorded, and how many of them missed it. */
  completionCounts?: { reviewed: number; incomplete: number; notDone: number };
  /** A pupil only: their own follow-up, once recorded. */
  completion?: HomeworkCompletion | null;
  createdAt: string | null;
  updatedAt: string | null;
}
