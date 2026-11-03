import type { VisitRequestStatus } from './enums';

/** Student totals follow the selected year; parents, enquiries and notifications are shared across years. */
export interface SecretaryDashboardOverview {
  /** Null when the secretary cannot read this resource. */
  students: number | null;
  parents: number | null;
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
