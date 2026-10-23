import type { ContextMenuItem } from 'najm-kit';
import { isSchoolWideRole, type PageViewer } from './pageAccess';

// These routes use CanSchoolWide as well as the named permission.
const SCHOOL_WIDE_WRITES = new Set([
  'fees', 'feeTypes', 'payments', 'expenses', 'payroll', 'financial-operations',
  'student-routes', 'staff', 'drivers', 'staff-attendance',
]);

export function canPerformAction(viewer: PageViewer, permission: string): boolean {
  const [action, resource] = permission.split(':');
  return viewer.can(permission) && (action === 'read' || !SCHOOL_WIDE_WRITES.has(resource) || isSchoolWideRole(viewer.role));
}

/** Remove the callback too, so disabled menu entries cannot invoke a mutation. */
export function permissionMenuItem(viewer: PageViewer, permission: string, item: ContextMenuItem): ContextMenuItem {
  const disabled = Boolean(item.disabled) || !canPerformAction(viewer, permission);
  return { ...item, disabled, onSelect: disabled ? undefined : item.onSelect };
}

export type PermissionMenuItem = ContextMenuItem & { permission?: string; submenu?: PermissionMenuItem[] };

export function protectMenuItems(viewer: PageViewer, items: PermissionMenuItem[]): ContextMenuItem[] {
  return items.map((item) => {
    const guarded = item.permission ? permissionMenuItem(viewer, item.permission, item) : item;
    return { ...guarded, submenu: item.submenu ? protectMenuItems(viewer, item.submenu) : undefined };
  });
}
