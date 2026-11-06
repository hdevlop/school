import { MONITOR_DASHBOARD_LINKS } from './monitorDashboardLinks';

// Where each supervisor dashboard card leads. A card or action is shown only
// for the permission of the page it opens.
export const SUPERVISOR_DASHBOARD_LINKS = {
  ...MONITOR_DASHBOARD_LINKS,
  grades: '/grades',
  teachers: '/teachers',
  visitRequests: '/visit-requests',
  announcements: '/announcements',
} as const;
