import type {
  RoutineAssignment,
  RoutineDay,
  RoutineDuty,
  RoutineEntry,
  RoutinePeriod,
  RoutineSubject,
} from './routine';
import type { RoutineContentGroup } from '@sms/contracts/routines';

export interface TimelineItem {
  type: 'lesson' | 'break';
  name: string;
  startTime: string;
  endTime: string;
}

export interface RoutineDutyFormProps {
  period: RoutinePeriod;
  duty?: RoutineDuty;
  readOnly?: boolean;
  onDelete?: () => Promise<void>;
  /** Puts a lesson in this break on this day instead of a supervisor. */
  onUseForLesson?: () => void;
}

export interface RoutineEntryFormProps {
  subjectOptions: RoutineSubject[];
  assignmentOptions: RoutineAssignment[];
  /** The subjects of the routine's other lessons, so the preview takes its grid color. */
  otherSubjects?: Pick<RoutineSubject, 'id' | 'code'>[];
  entry?: RoutineEntry | null;
  defaultRoom?: string | null;
  onSubmit: (data: RoutineEntryFormValues) => Promise<void>;
  readOnly?: boolean;
}

export interface RoutineEntryFormValues {
  subjectId: string;
  teacherAssignmentId: string | null;
  roomNumber?: string;
  contentGroups: RoutineContentGroup[];
}

export interface RoutineGridProps {
  days: RoutineDay[];
  periods: RoutinePeriod[];
  entries: RoutineEntry[];
  duties?: RoutineDuty[];
  defaultRoom?: string | null;
  editable?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onCellClick?: (day: RoutineDay, period: RoutinePeriod, entry?: RoutineEntry) => void;
  onDutyClick?: (day: RoutineDay, period: RoutinePeriod, duty?: RoutineDuty) => void;
}

export interface RoutinePeriodFormProps {
  period?: RoutinePeriod;
}

export interface RoutineScheduleFormProps {
  periods: RoutinePeriod[];
}
