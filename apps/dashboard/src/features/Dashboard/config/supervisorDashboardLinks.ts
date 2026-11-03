import { FLOOR_MANAGER_DASHBOARD_LINKS } from './floorManagerDashboardLinks';

// Where each supervisor dashboard card leads. A card or action is shown only
// for the permission of the page it opens.
export const SUPERVISOR_DASHBOARD_LINKS = {
  ...FLOOR_MANAGER_DASHBOARD_LINKS,
  grades: '/grades',
  visitRequests: '/visit-requests',
  announcements: '/announcements',
} as const;
