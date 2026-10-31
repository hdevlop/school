export { ROUTINE_DAYS, type RoutineDay } from '@sms/contracts/routines';
import type { RoutineDay } from '@sms/contracts/routines';

export interface RoutinePeriod {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  sortOrder: number;
  isBreak: boolean;
  isActive: boolean;
}

export interface RoutineAssignment {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  classId: string;
  sectionId: string;
}

export interface RoutineSubject {
  id: string;
  name: string;
  code?: string | null;
}

// A lesson is a subject; its teacher is optional.
export interface RoutineEntry {
  id: string;
  scheduleId: string;
  dayOfWeek: RoutineDay;
  periodId: string;
  teacherAssignmentId: string | null;
  roomNumber?: string | null;
  notes?: string | null;
  contentGroups: RoutineContentGroup[];
  version: number;
  teacherId: string | null;
  teacherName: string | null;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
}

export interface RoutineDuty {
  id: string;
  scheduleId: string;
  dayOfWeek: RoutineDay;
  periodId: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  teacherId?: string | null;
  teacherName?: string | null;
  notes?: string | null;
}

export interface RoutineDutyCandidate {
  staffId: string;
  staffName: string;
  staffRole: string;
  teacherId?: string | null;
}

export interface RoutineSchedule {
  id: string;
  sectionId: string;
  sectionName: string;
  classId: string;
  className: string;
  academicYear: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  activeDays: RoutineDay[];
  roomNumber?: string | null;
  publishedAt?: string | null;
  periods: RoutinePeriod[];
  entries: RoutineEntry[];
  duties: RoutineDuty[];
}
import type { RoutineContentGroup } from '@sms/contracts/routines';
