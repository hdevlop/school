import type { BadgeColor } from 'najm-kit';
import type { AlertPriority, AlertStatus, AlertType } from '@sms/contracts';

/** One alert as `GET /alerts` returns it, with the names of what it is about. */
export type AlertRecord = {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  studentId: string | null;
  teacherId: string | null;
  teacherAssignmentId: string | null;
  classId: string | null;
  studentClassId?: string | null;
  studentSectionId?: string | null;
  studentName: string | null;
  teacherName: string | null;
  className: string | null;
  createdAt: string;
};

export const PRIORITY_COLORS: Record<AlertPriority, BadgeColor> = {
  low: 'neutral', medium: 'info', high: 'warning', critical: 'destructive',
};

export const TYPE_COLORS: Record<AlertType, BadgeColor> = {
  academic: 'info', attendance: 'warning', behavioral: 'primary', health: 'destructive',
  system: 'neutral', announcement: 'success', reminder: 'warning', emergency: 'destructive',
};

export const STATUS_COLORS: Record<AlertStatus, BadgeColor> = {
  active: 'warning', acknowledged: 'info', resolved: 'success', dismissed: 'neutral',
};

/**
 * An alert about one person, as the server decides: only these can be handled
 * by the people who see them. A class or school-wide notice is one shared
 * record, so only staff change its status.
 */
export const isAboutSomeone = (alert: AlertRecord) =>
  Boolean(alert.studentId || alert.teacherId || alert.teacherAssignmentId);

/** Who or what the alert is about, for the "About" column. */
export const alertSubject = (alert: AlertRecord) =>
  alert.studentName || alert.teacherName || alert.className || null;
