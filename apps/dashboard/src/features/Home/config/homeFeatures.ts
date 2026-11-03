import { matchPermission } from 'najm-auth/client';
import { isSidebarPermission, orderSidebarItems, sidebarEntryVisible, sidebarItemIds } from '@sms/contracts/access-control';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { PAGE_ACCESS, type PageAccess, type PageViewer } from '@/shared/pageAccess';
import { BRANDING_SETTINGS_NAV_ID, THEME_SETTINGS_NAV_ID, createNavigationItems, type GatedNavItem } from '@/shared/schoolNavigation';

export type HomeTone = 'blue' | 'rose' | 'teal' | 'violet' | 'amber' | 'green';

type FeatureDetails = { resources: readonly string[]; tone: HomeTone };

// Resource names are the permission catalog's names, including camel-case feeTypes.
// A feature can contain several resources: payments and installments belong to Fees.
const FEATURE_DETAILS: Partial<Record<PageAccess, FeatureDetails>> = {
  students: { resources: ['students', 'enrollments'], tone: 'blue' },
  insurance: { resources: ['insurance'], tone: 'green' },
  parents: { resources: ['parents'], tone: 'teal' },
  teachers: { resources: ['teachers'], tone: 'rose' },
  staff: { resources: ['staff', 'staff-roles', 'zones'], tone: 'violet' },
  subjects: { resources: ['subjects'], tone: 'amber' },
  classes: { resources: ['classes'], tone: 'blue' },
  sections: { resources: ['sections'], tone: 'teal' },
  cycles: { resources: ['cycles'], tone: 'violet' },
  classRoutines: { resources: ['class-routines'], tone: 'blue' },
  studentAttendance: { resources: ['attendance'], tone: 'teal' },
  staffAttendance: { resources: ['staff-attendance'], tone: 'rose' },
  discipline: { resources: ['discipline'], tone: 'rose' },
  behaviorRewards: { resources: ['behavior-rewards'], tone: 'green' },
  assessments: { resources: ['assessments'], tone: 'blue' },
  exams: { resources: ['exams'], tone: 'teal' },
  grades: { resources: ['grades'], tone: 'violet' },
  fees: { resources: ['fees', 'payments', 'installments'], tone: 'amber' },
  expenses: { resources: ['expenses'], tone: 'rose' },
  feeTypes: { resources: ['feeTypes'], tone: 'teal' },
  reminders: { resources: ['reminders', 'fees'], tone: 'violet' },
  payroll: { resources: ['payroll'], tone: 'green' },
  financialOperations: { resources: ['financial-operations'], tone: 'blue' },
  vehicles: { resources: ['vehicles', 'drivers', 'refuel', 'maintenance', 'student-routes'], tone: 'amber' },
  calendar: { resources: ['events'], tone: 'rose' },
  alerts: { resources: ['alerts'], tone: 'amber' },
  announcements: { resources: ['announcements'], tone: 'blue' },
  visitRequests: { resources: ['visit-requests'], tone: 'green' },
  accessControl: { resources: ['users', 'roles', 'permissions'], tone: 'violet' },
  appearance: { resources: ['theme', 'branding'], tone: 'rose' },
  settings: { resources: ['settings'], tone: 'teal' },
  publicPage: { resources: ['settings', 'landing'], tone: 'blue' },
};

export type HomeCard = {
  id: string;
  label: string;
  icon: NonNullable<GatedNavItem['icon']>;
  href?: string;
  action?: 'theme' | 'branding';
  accessible: boolean;
  tone: HomeTone;
};

/** Any action on any resource in this feature is enough to show its card. */
export function hasFeaturePermission(permissions: readonly string[], resources: readonly string[]): boolean {
  return permissions.some((grant) => {
    if (isSidebarPermission(grant)) return false;
    if (grant === '*:*') return true;
    const separator = grant.indexOf(':');
    if (separator < 1 || separator === grant.length - 1) return false;
    const action = grant.slice(0, separator);
    return resources.some((resource) => matchPermission([grant], `${action}:${resource}`));
  });
}

/**
 * Cards follow the role's sidebar, set in the roles screen: its order, a group
 * opening in place, and its ticks. Settings sits last, as in the sidebar footer.
 * A family sidebar lists fewer pages; Home's other cards follow them.
 */
export function createHomeCards(t: (key: string) => string, viewer: PageViewer, permissions: readonly string[], sidebarOrder: readonly string[] = []): HomeCard[] {
  const sidebarSequence = sidebarItemIds(orderSidebarItems(createNavigationItems(t, viewer), sidebarOrder));
  // The pages the roles screen can tick for this role, with the footer's Settings.
  const tickable = new Set<string>([...sidebarSequence, 'settings:preferences']);
  const items: GatedNavItem[] = [
    ...orderSidebarItems(createNavigationItems(t, viewer, true), sidebarSequence),
    { id: '/settings', href: '/settings', label: t('navigation.settings'), icon: FEATURE_ICONS.settings, access: 'settings' },
  ];
  const cards: HomeCard[] = [];

  function visit(entries: GatedNavItem[]) {
    for (const item of entries) {
      if (item.children) {
        visit(item.children);
        continue;
      }
      const action = item.id === THEME_SETTINGS_NAV_ID ? 'theme' : item.id === BRANDING_SETTINGS_NAV_ID ? 'branding' : undefined;
      if ((!item.href && !action) || !item.icon) continue;
      const accessible = !item.access || PAGE_ACCESS[item.access](viewer);
      const sidebarId = item.id === '/settings' ? 'settings:preferences' : item.id;
      // An unticked page leaves Home as it leaves the sidebar. A locked card, or
      // one this role's sidebar never lists, has no tick of its own and stays.
      if (accessible && tickable.has(sidebarId) && !sidebarEntryVisible(viewer.can, sidebarId)) continue;
      const featureDetails = item.access ? FEATURE_DETAILS[item.access] : undefined;
      const details = (item.access === 'accessControl' || action) && featureDetails
        ? { ...featureDetails, resources: [action ?? item.id.slice(1)] }
        : featureDetails;
      // Dashboard and the personal inbox are account capabilities; they have no
      // resource permissions in School's catalog. Keep their existing guards.
      if (details ? !hasFeaturePermission(permissions, details.resources) : !accessible) continue;
      const label = item.access === 'studentAttendance' ? t('mobileHome.studentAttendance')
        : item.access === 'staffAttendance' ? t('mobileHome.staffAttendance')
        : item.access === 'classRoutines' ? t('mobileHome.timetable')
        : item.access === 'financialOperations' ? t('mobileHome.financialOperations')
        : item.label;
      cards.push({
        id: item.id, href: item.href, action, label, icon: item.icon,
        accessible, tone: details?.tone ?? (item.access === 'dashboard' ? 'blue' : 'amber'),
      });
    }
  }
  visit(items);
  return cards;
}
