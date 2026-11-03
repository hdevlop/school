// The roles the server's finance guard (`isFinancial`, shared with the fee
// routes) admits to the finance dashboard. The dashboard shows its finance
// widgets only to them, so a teacher's home page does not render cards the
// server would refuse. The server stays the authority.
export const FINANCE_DASHBOARD_ROLES = ['admin', 'principal', 'accounting'] as const;

export function canReadFinanceDashboard(role: string | null | undefined): boolean {
  const normalized = role?.toLowerCase();
  return !!normalized && (FINANCE_DASHBOARD_ROLES as readonly string[]).includes(normalized);
}

// The role the server's teacher dashboard (`isTeacher`) admits. A teacher's
// home page is their own day rather than the school-wide charts.
export function usesTeacherDashboard(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'teacher';
}

// The role the server's floor manager dashboard (`isFloorManager`) admits:
// the grades they run today rather than the school-wide charts.
export function usesFloorManagerDashboard(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'floor_manager';
}

// The role the server's supervisor dashboard (`isSupervisor`) admits: the
// classes assigned to them today rather than the school-wide charts.
export function usesSupervisorDashboard(role: string | null | undefined): boolean {
  return role?.toLowerCase() === 'supervisor';
}

// The school-wide charts ask for a school-wide role and the permission of the
// records they count, as the server's `CanSchoolWide` does.
export const SCHOOL_DASHBOARD_CARD_PERMISSIONS = {
  studentsByGender: 'read:students',
  studentAttendance: 'read:attendance',
  staffAttendance: 'read:staff-attendance',
} as const;

export type SchoolDashboardCard = keyof typeof SCHOOL_DASHBOARD_CARD_PERMISSIONS;

export function schoolDashboardCards(viewer: { isSchoolWide: boolean; can: (permission: string) => boolean }) {
  return Object.fromEntries(Object.entries(SCHOOL_DASHBOARD_CARD_PERMISSIONS)
    .map(([card, permission]) => [card, viewer.isSchoolWide && viewer.can(permission)])) as Record<SchoolDashboardCard, boolean>;
}

const SPAN_CLASSES: Record<number, string> = {
  1: 'md:col-span-1', 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4',
  5: 'md:col-span-5', 6: 'md:col-span-6', 7: 'md:col-span-7', 8: 'md:col-span-8',
  9: 'md:col-span-9', 10: 'md:col-span-10', 11: 'md:col-span-11', 12: 'md:col-span-12',
};

/**
 * The 12-column spans of a dashboard row's visible cards, keeping their
 * relative widths: a card left out gives its width to the others. A row of
 * every card keeps the widths it is given.
 */
export function rowSpans<K extends string>(widths: Partial<Record<K, number | false>>): Partial<Record<K, string>> {
  const visible = (Object.entries(widths) as [K, number | false][]).filter((entry): entry is [K, number] => !!entry[1]);
  const total = visible.reduce((sum, [, width]) => sum + width, 0);
  if (!total) return {};
  const spans = visible.map(([key, width]) => [key, Math.max(1, Math.floor((width * 12) / total))] as [K, number]);
  // Rounding down leaves columns over; the widest card takes them.
  const left = 12 - spans.reduce((sum, [, span]) => sum + span, 0);
  const widest = spans.reduce((best, entry, index) => (entry[1] > spans[best][1] ? index : best), 0);
  spans[widest][1] += left;
  return Object.fromEntries(spans.map(([key, span]) => [key, SPAN_CLASSES[span]])) as Partial<Record<K, string>>;
}
