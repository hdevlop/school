import { matchPermission } from 'najm-auth/client';
import { FEATURE_ICONS } from '@/shared/featureIcons';
import { PAGE_ACCESS, type PageAccess, type PageViewer } from '@/shared/pageAccess';
import { BRANDING_SETTINGS_NAV_ID, THEME_SETTINGS_NAV_ID, createNavigationItems, type GatedNavItem } from '@/shared/schoolNavigation';

export const HOME_SECTIONS = ['overview', 'academic', 'people', 'finance', 'communication', 'administration'] as const;
export type HomeSection = typeof HOME_SECTIONS[number];
export type HomeTone = 'blue' | 'rose' | 'teal' | 'violet' | 'amber' | 'green';

type FeatureDetails = { resources: readonly string[]; section: HomeSection; tone: HomeTone };

// Resource names are the permission catalog's names, including camel-case feeTypes.
// A feature can contain several resources: payments and installments belong to Fees.
const FEATURE_DETAILS: Partial<Record<PageAccess, FeatureDetails>> = {
  students: { resources: ['students', 'enrollments'], section: 'people', tone: 'blue' },
  parents: { resources: ['parents'], section: 'people', tone: 'teal' },
  teachers: { resources: ['teachers'], section: 'academic', tone: 'rose' },
  staff: { resources: ['staff', 'staff-roles', 'zones'], section: 'people', tone: 'violet' },
  subjects: { resources: ['subjects'], section: 'academic', tone: 'amber' },
  classes: { resources: ['classes'], section: 'academic', tone: 'blue' },
  sections: { resources: ['sections'], section: 'academic', tone: 'teal' },
  cycles: { resources: ['cycles'], section: 'academic', tone: 'violet' },
  classRoutines: { resources: ['classes', 'class-routines'], section: 'academic', tone: 'blue' },
  studentAttendance: { resources: ['attendance'], section: 'academic', tone: 'teal' },
  staffAttendance: { resources: ['staff-attendance'], section: 'people', tone: 'rose' },
  discipline: { resources: ['discipline'], section: 'academic', tone: 'rose' },
  behaviorRewards: { resources: ['behavior-rewards'], section: 'academic', tone: 'green' },
  assessments: { resources: ['assessments'], section: 'academic', tone: 'blue' },
  exams: { resources: ['exams'], section: 'academic', tone: 'teal' },
  grades: { resources: ['grades'], section: 'academic', tone: 'violet' },
  fees: { resources: ['fees', 'payments', 'installments'], section: 'finance', tone: 'amber' },
  expenses: { resources: ['expenses'], section: 'finance', tone: 'rose' },
  feeTypes: { resources: ['feeTypes'], section: 'finance', tone: 'teal' },
  reminders: { resources: ['reminders', 'fees'], section: 'finance', tone: 'violet' },
  payroll: { resources: ['payroll'], section: 'finance', tone: 'green' },
  financialOperations: { resources: ['financial-operations'], section: 'finance', tone: 'blue' },
  vehicles: { resources: ['vehicles', 'drivers', 'refuel', 'maintenance', 'student-routes'], section: 'administration', tone: 'amber' },
  calendar: { resources: ['events'], section: 'communication', tone: 'rose' },
  alerts: { resources: ['alerts'], section: 'communication', tone: 'amber' },
  announcements: { resources: ['announcements'], section: 'communication', tone: 'blue' },
  visitRequests: { resources: ['visit-requests'], section: 'communication', tone: 'green' },
  accessControl: { resources: ['users', 'roles', 'permissions'], section: 'administration', tone: 'violet' },
  appearance: { resources: ['theme', 'branding'], section: 'administration', tone: 'rose' },
  settings: { resources: ['settings'], section: 'administration', tone: 'teal' },
  publicPage: { resources: ['settings', 'landing'], section: 'administration', tone: 'blue' },
};

export type HomeCard = {
  id: string;
  label: string;
  icon: NonNullable<GatedNavItem['icon']>;
  href?: string;
  action?: 'theme' | 'branding';
  accessible: boolean;
  section: HomeSection;
  tone: HomeTone;
};

/** Any action on any resource in this feature is enough to show its card. */
export function hasFeaturePermission(permissions: readonly string[], resources: readonly string[]): boolean {
  return permissions.some((grant) => {
    if (grant === '*:*') return true;
    const separator = grant.indexOf(':');
    if (separator < 1 || separator === grant.length - 1) return false;
    const action = grant.slice(0, separator);
    return resources.some((resource) => matchPermission([grant], `${action}:${resource}`));
  });
}

export function createHomeCards(t: (key: string) => string, viewer: PageViewer, permissions: readonly string[]): HomeCard[] {
  const items: GatedNavItem[] = [
    ...createNavigationItems(t, viewer, true),
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
        accessible, section: details?.section ?? (item.access === 'dashboard' ? 'overview' : 'communication'),
        tone: details?.tone ?? (item.access === 'dashboard' ? 'blue' : 'amber'),
      });
    }
  }
  visit(items);
  return cards;
}
