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

/** One of the reading parent's children the homework is for, and when that parent marked it seen. */
export interface HomeworkChild {
  id: string;
  name: string;
  seenAt: string | null;
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
  createdAt: string | null;
  updatedAt: string | null;
}
