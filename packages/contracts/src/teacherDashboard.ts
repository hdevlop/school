/**
 * The teacher home page: the values its requests may carry and the shape the
 * server answers with. Dependency-free, like every contracts module, because
 * the server builds the payload and a client component renders it.
 */

/** The periods the attendance trend can cover, and what a select may submit. */
export const TEACHER_TREND_RANGE_VALUES = ['7d', '30d'] as const;
export type TeacherTrendRange = (typeof TEACHER_TREND_RANGE_VALUES)[number];

export const TEACHER_TREND_RANGE_DAYS: Record<TeacherTrendRange, number> = { '7d': 7, '30d': 30 };

/** Where one of today's lessons stands against the school clock. */
export const TEACHER_SESSION_STATUS_VALUES = ['upcoming', 'inProgress', 'completed'] as const;
export type TeacherSessionStatus = (typeof TEACHER_SESSION_STATUS_VALUES)[number];

/** One routine lesson the teacher gives today. Times are `HH:MM`. */
export interface TeacherDashboardSession {
  entryId: string;
  teacherAssignmentId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  roomNumber: string | null;
  startTime: string;
  endTime: string;
  status: TeacherSessionStatus;
  /** Whole minutes until the lesson starts; null once it has started. */
  minutesUntilStart: number | null;
  /** Whether the section's register holds today's marks for this lesson. */
  attendanceTaken: boolean;
}

/** One class, section and subject the teacher is assigned to this year. */
export interface TeacherDashboardClass {
  teacherAssignmentId: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  studentCount: number;
}

export interface TeacherDashboardAssessment {
  id: string;
  title: string;
  type: string;
  status: string;
  date: string;
  className: string;
  sectionName: string;
  subjectName: string;
  gradedCount: number;
  studentCount: number;
}

export interface TeacherDashboardAttention {
  /** Today's lessons that have started without a register. */
  missingAttendance: number;
  /** Past, uncancelled assessments with students still ungraded. */
  missingGrades: number;
  unreadNotifications: number;
  /** Open discipline incidents for students in the teacher's sections. */
  openConcerns: number;
}

export interface TeacherDashboardOverview {
  /** The school's business date the figures describe. */
  date: string;
  academicYear: string;
  teacher: {
    id: string;
    name: string;
    specialization: string | null;
    image: string | null;
  };
  kpis: {
    totalStudents: number;
    classesToday: number;
    pendingTasks: number;
    /** Share of marks that were present or late over the last 7 days; null with no marks. */
    attendanceRate: number | null;
    unreadNotifications: number;
  };
  nextSession: TeacherDashboardSession | null;
  todaySessions: TeacherDashboardSession[];
  attention: TeacherDashboardAttention;
  classes: TeacherDashboardClass[];
  assessments: TeacherDashboardAssessment[];
}

export interface TeacherAttendanceTrendPoint {
  date: string;
  /** Percent of marks that were present or late; null on a day with no marks. */
  rate: number | null;
  attended: number;
  total: number;
}

export interface TeacherAttendanceTrend {
  range: TeacherTrendRange;
  points: TeacherAttendanceTrendPoint[];
  rate: number | null;
  previousRate: number | null;
  /** Percentage points against the previous period of the same length. */
  change: number | null;
  sessionsHeld: number;
  sessionsScheduled: number;
}
