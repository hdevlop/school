import type {
  RoutineAssignment,
  RoutineDay,
  RoutineDuty,
  RoutineEntry,
  RoutinePeriod,
} from './routine';

export interface TimelineItem {
  type: 'lesson' | 'break';
  name: string;
  startTime: string;
  endTime: string;
}

export interface RoutineDutyFormProps {
  period: RoutinePeriod;
  duty?: RoutineDuty;
  onDelete?: () => Promise<void>;
}

export interface RoutineEntryFormProps {
  assignmentOptions: RoutineAssignment[];
  day: string;
  period: RoutinePeriod;
  entry?: RoutineEntry | null;
  defaultRoom?: string | null;
  onDelete?: () => Promise<void>;
}

export interface RoutineGridProps {
  days: RoutineDay[];
  periods: RoutinePeriod[];
  entries: RoutineEntry[];
  duties?: RoutineDuty[];
  defaultRoom?: string | null;
  editable?: boolean;
  onCellClick?: (day: RoutineDay, period: RoutinePeriod, entry?: RoutineEntry) => void;
  onDutyClick?: (day: RoutineDay, period: RoutinePeriod, duty?: RoutineDuty) => void;
}

export interface RoutinePeriodFormProps {
  period?: RoutinePeriod;
}

export interface RoutineScheduleFormProps {
  periods: RoutinePeriod[];
}

export interface RoutineDaysFormProps {
  activeDays: readonly RoutineDay[];
}
