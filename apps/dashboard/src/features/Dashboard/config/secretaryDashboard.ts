import { Bell, CalendarDays, DoorOpen, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { PAGE_ACCESS, type PageViewer } from '@/shared/pageAccess';
import type { QuickAction } from '../components/Teacher/QuickActionsCard';

export const SECRETARY_DASHBOARD_LINKS = {
  students: '/students',
  parents: '/parents',
  visitRequests: '/visit-requests',
  insurance: '/insurance',
  timetable: '/class-routines',
  notifications: '/notifications',
} as const;

const action = (key: string, icon: QuickAction['icon'], href: string): QuickAction => ({
  key, icon, href,
  label: `dashboard.secretary.quickActions.${key}`,
  hint: `dashboard.secretary.quickActions.${key}Hint`,
});

/** Use the destinations' page guards so shortcuts never lead to an inaccessible page. */
export function secretaryQuickActions(viewer: PageViewer): QuickAction[] {
  return [
    ...(PAGE_ACCESS.students(viewer) ? [action('students', UsersRound, SECRETARY_DASHBOARD_LINKS.students)] : []),
    ...(PAGE_ACCESS.parents(viewer) ? [action('parents', UserRound, SECRETARY_DASHBOARD_LINKS.parents)] : []),
    ...(PAGE_ACCESS.visitRequests(viewer) ? [action('visitRequests', DoorOpen, SECRETARY_DASHBOARD_LINKS.visitRequests)] : []),
    ...(PAGE_ACCESS.insurance(viewer) ? [action('insurance', ShieldCheck, SECRETARY_DASHBOARD_LINKS.insurance)] : []),
    ...(PAGE_ACCESS.classRoutines(viewer) ? [action('timetable', CalendarDays, SECRETARY_DASHBOARD_LINKS.timetable)] : []),
    action('notifications', Bell, SECRETARY_DASHBOARD_LINKS.notifications),
  ];
}
