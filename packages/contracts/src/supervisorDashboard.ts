/**
 * The supervisor (surveillant général) home page: the shape the server
 * answers with. Every figure covers the sections of the classes assigned to
 * the signed-in supervisor in the active academic year; new visit requests,
 * which belong to no class, are the school's. Each part is the one
 * permission it reads, and is null when the supervisor does not hold it, so
 * the roles screen decides which cards the page shows. Dependency-free, like
 * every contracts module.
 */
import type {
  MonitorDashboardAbsence,
  MonitorDashboardIncident,
  MonitorDashboardSection,
} from './monitorDashboard';

export type SupervisorDashboardSection = MonitorDashboardSection;
export type SupervisorDashboardAbsence = MonitorDashboardAbsence;
export type SupervisorDashboardIncident = MonitorDashboardIncident;

/** One class (grade) and how its students scored over the year. */
export interface SupervisorDashboardClassGrades {
  classId: string;
  className: string;
  /** Mean of every graded mark as a share of its total marks, 0–100. */
  average: number;
  /** Share of graded marks at or above their passing marks, 0–100. */
  passRate: number;
  /** Graded marks counted. */
  graded: number;
}

/** Incidents reported in one month, by severity. */
export interface SupervisorDashboardIncidentMonth {
  month: string;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface SupervisorDashboardOverview {
  /** The school's business date the figures describe. */
  date: string;
  academicYear: string;
  /** Whether today is one of the school's teaching days. */
  schoolDay: boolean;
  supervisor: {
    id: string;
    name: string;
    image: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    /** The assigned classes that have sections this year. */
    classes: string[];
  };
  unreadNotifications: number;
  /** `read:teachers`: teachers marked absent today, across the school. */
  absentTeachers: number | null;
  /** `read:attendance`: today's registers and the year's student marks. */
  attendance: {
    sections: SupervisorDashboardSection[];
    absences: SupervisorDashboardAbsence[];
    absentToday: number;
    lateToday: number;
    /** Sections with no register today, once the school day has started. */
    missingRegisters: number;
    /** Share of marks that were present or late over the last 7 days; null with no marks. */
    attendanceRate: number | null;
    monthly: { month: string; absent: number; late: number }[];
  } | null;
  /** `read:students`: the active roster of the sections. */
  students: {
    total: number;
    byGender: { gender: string; value: number }[];
  } | null;
  /** `read:discipline`: open incidents and the year's incidents by month. */
  discipline: {
    openIncidents: number;
    incidents: SupervisorDashboardIncident[];
    monthly: SupervisorDashboardIncidentMonth[];
  } | null;
  /** `read:grades`: the year's graded marks by class. */
  grades: {
    byClass: SupervisorDashboardClassGrades[];
  } | null;
  /** `read:visit-requests`: the school's requests no one has contacted yet. */
  visitRequests: {
    newRequests: number;
  } | null;
}
