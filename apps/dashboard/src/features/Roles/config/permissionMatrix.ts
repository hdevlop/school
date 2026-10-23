import { matchPermission } from 'najm-auth/client';
import {
  SIDEBAR_CONFIGURED_PERMISSION, SIDEBAR_ENTRIES, isSidebarPermission, sidebarPermission,
  type AccessPermission, type SidebarKey,
} from '@sms/contracts/access-control';

export const STANDARD_ACTIONS = ['read', 'create', 'update', 'delete'] as const;
export type StandardAction = typeof STANDARD_ACTIONS[number];
export type PermissionRow = {
  resource: string;
  permissions: AccessPermission[];
  standard: Partial<Record<StandardAction, AccessPermission>>;
  /** Timetable reads use the classes permission on the server. */
  readDependency?: AccessPermission;
  special: AccessPermission[];
  sidebar?: typeof SIDEBAR_ENTRIES[number];
};

export const PERMISSION_CATEGORIES = ['people', 'academic', 'attendance', 'conduct', 'financial', 'transport', 'access', 'general'] as const;
const PERMISSION_GROUPS: Record<typeof PERMISSION_CATEGORIES[number], readonly string[]> = {
  people: ['students', 'parents', 'teachers', 'staff'],
  academic: ['classes', 'sections', 'cycles', 'subjects', 'assessments', 'exams', 'grades', 'class-routines', 'reports', 'participants'],
  attendance: ['attendance', 'staff-attendance'],
  conduct: ['discipline', 'behavior-rewards'],
  financial: ['feeTypes', 'fees', 'installments', 'payments', 'allocations', 'expenses', 'payroll', 'financial-operations', 'reminders'],
  transport: ['vehicles', 'drivers', 'student-routes', 'vehicle-assignments', 'refuel', 'refuels', 'maintenance'],
  access: ['users', 'roles', 'permissions', '*', 'system'],
  general: ['dashboard', 'events', 'announcements', 'alerts', 'visit-requests', 'notifications', 'settings', 'theme', 'branding'],
};

export function permissionCategory(resource: string): typeof PERMISSION_CATEGORIES[number] {
  return PERMISSION_CATEGORIES.find((category) => PERMISSION_GROUPS[category].includes(resource)) ?? 'general';
}

function permissionRowOrder(resource: string): number {
  const index = PERMISSION_GROUPS[permissionCategory(resource)].indexOf(resource);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

export function buildPermissionRows(catalog: AccessPermission[]): PermissionRow[] {
  const grouped = new Map<string, AccessPermission[]>();
  for (const permission of catalog) {
    if (isSidebarPermission(permission.name)) continue;
    const resource = permission.resource || 'general';
    const group = grouped.get(resource) ?? [];
    group.push(permission);
    grouped.set(resource, group);
  }
  for (const [resource] of SIDEBAR_ENTRIES) if (!grouped.has(resource)) grouped.set(resource, []);
  return [...grouped].map(([resource, permissions]) => {
    const standard = Object.fromEntries(STANDARD_ACTIONS.map((action) => [action, permissions.find((p) => p.action === action)
      ?? (action === 'read' ? permissions.find((p) => p.action === 'view') : undefined)]));
    const standardIds = new Set(Object.values(standard).filter(Boolean).map((permission) => permission!.id));
    return {
      resource, permissions, standard,
      readDependency: resource === 'class-routines' ? catalog.find((p) => p.name === 'read:classes') : undefined,
      special: permissions.filter((permission) => !standardIds.has(permission.id)),
      sidebar: SIDEBAR_ENTRIES.find((entry) => entry[0] === resource),
    };
  }).sort((a, b) => PERMISSION_CATEGORIES.indexOf(permissionCategory(a.resource)) - PERMISSION_CATEGORIES.indexOf(permissionCategory(b.resource))
    || permissionRowOrder(a.resource) - permissionRowOrder(b.resource)
    || a.resource.localeCompare(b.resource));
}

export function sidebarKeysFromPermissions(permissions: AccessPermission[]): SidebarKey[] {
  const names = permissions.map((permission) => permission.name);
  const configured = matchPermission(names, SIDEBAR_CONFIGURED_PERMISSION);
  return SIDEBAR_ENTRIES.filter(([key]) => !configured || matchPermission(names, sidebarPermission(key))).map(([key]) => key);
}

export function changedValues(before: Iterable<string>, after: Iterable<string>) {
  const previous = new Set(before);
  const next = new Set(after);
  return { added: [...next].filter((id) => !previous.has(id)), removed: [...previous].filter((id) => !next.has(id)) };
}
