/**
 * The floor manager home page: the shape the server answers with. Every
 * figure covers the sections of the grades the signed-in floor manager runs
 * today. Dependency-free, like every contracts module.
 */

/** One section of a managed grade and how today's register stands. */
export interface FloorManagerDashboardSection {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  roomNumber: string | null;
  studentCount: number;
  /** Whether any student of the section has a mark today. */
  registerTaken: boolean;
  /** Students marked absent today; a student absent from several lessons counts once. */
  absent: number;
  /** Students marked late today and not absent. */
  late: number;
}

/** A student marked absent or late today in one of the sections. */
export interface FloorManagerDashboardAbsence {
  studentId: string;
  studentName: string;
  image: string | null;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  /** `absent` when any of today's marks is an absence, otherwise `late`. */
  status: 'absent' | 'late';
}

/** An open discipline incident in one of the sections. */
export interface FloorManagerDashboardIncident {
  id: string;
  studentName: string;
  className: string;
  sectionName: string;
  /** A `DISCIPLINE_CATEGORY_VALUES` token. */
  category: string;
  /** A `DISCIPLINE_SEVERITY_VALUES` token. */
  severity: string;
  incidentAt: string;
}

export interface FloorManagerDashboardAttention {
  /** Sections with no register today, once the school day has started. */
  missingRegisters: number;
  absentToday: number;
  /** Open discipline incidents in the sections. */
  openIncidents: number;
  unreadNotifications: number;
}

export interface FloorManagerDashboardOverview {
  /** The school's business date the figures describe. */
  date: string;
  academicYear: string;
  /** Whether today is one of the school's teaching days. */
  schoolDay: boolean;
  manager: {
    id: string;
    name: string;
    image: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    /** The grades (class names) the floor manager runs today. */
    grades: string[];
  };
  kpis: {
    totalStudents: number;
    sections: number;
    absentToday: number;
    lateToday: number;
    /** Share of marks that were present or late over the last 7 days; null with no marks. */
    attendanceRate: number | null;
    unreadNotifications: number;
  };
  /** Active students in the managed sections, using the same roster as the total. */
  studentsByGender: { gender: string; value: number }[];
  /** Monthly student marks in the managed sections of the active academic year. */
  attendanceMonthly: {
    monthly: { month: string; absent: number; late: number }[];
    todayAbsent: number;
    todayLate: number;
  };
  sections: FloorManagerDashboardSection[];
  absences: FloorManagerDashboardAbsence[];
  incidents: FloorManagerDashboardIncident[];
  attention: FloorManagerDashboardAttention;
}
