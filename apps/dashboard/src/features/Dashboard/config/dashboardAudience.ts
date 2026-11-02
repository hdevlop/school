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
