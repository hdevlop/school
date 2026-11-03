import type { VisitRequestStatus } from './enums';
import type { SupervisorDashboardIncidentMonth } from './supervisorDashboard';

/** Student totals follow the selected year; teacher/parent totals, enquiries and notifications are shared across years. */
export interface SecretaryDashboardOverview {
  /** The signed-in account, with its staff record when it has one. */
  secretary: {
    id: string;
    name: string;
    image: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
  /** Null when the secretary cannot read this resource. */
  students: number | null;
  /** Dashboard totals do not grant access to individual teacher or parent records. */
  teachers: number;
  parents: number;
  /** Counts by severity in the viewed year; no individual incident records. */
  incidentsMonthly: SupervisorDashboardIncidentMonth[];
  visitRequests: {
    newRequests: number;
    contactedRequests: number;
    queue: {
      id: string;
      parentName: string;
      phone: string;
      status: VisitRequestStatus;
      createdAt: string | null;
    }[];
  } | null;
  unreadNotifications: number;
}
