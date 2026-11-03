import { describe, expect, it } from 'bun:test';
import type { AccessPermission } from '@sms/contracts/access-control';
import { buildPermissionRows, changedValues, permissionCategory, sidebarKeysFromPermissions } from '@/features/Roles/config/permissionMatrix';

const permission = (name: string, resource = name.split(':')[1], action = name.split(':')[0]): AccessPermission => ({
  id: name, name, resource, action, description: null,
});

describe('role permission matrix', () => {
  it('gives insurance and timetables independent read controls', () => {
    const catalog = ['read:students', 'read:insurance', 'read:classes', 'read:class-routines', 'view:reports', 'create:class-routines', 'update:class-routines', 'delete:class-routines', 'read:participants'].map((name) => permission(name));
    const rows = buildPermissionRows(catalog);
    const routine = rows.find((row) => row.resource === 'class-routines')!;
    expect(routine.standard.read?.name).toBe('read:class-routines');
    expect(rows.find((row) => row.resource === 'insurance')?.standard.read?.name).toBe('read:insurance');
    const controls = rows.flatMap((row) => Object.values(row.standard).filter(Boolean).map((p) => p!.id));
    expect(new Set(controls).size).toBe(controls.length);
    const selected = new Set(catalog.map((p) => p.id));
    selected.delete(rows.find((row) => row.resource === 'insurance')!.standard.read!.id);
    selected.delete(routine.standard.read!.id);
    expect(selected.has('read:students')).toBe(true);
    expect(selected.has('read:classes')).toBe(true);
    expect(routine.special.map((p) => p.name)).toEqual([]);
    expect(routine.standard.create?.name).toBe('create:class-routines');
    expect(routine.standard.update?.name).toBe('update:class-routines');
    expect(routine.standard.delete?.name).toBe('delete:class-routines');
    expect(rows.find((row) => row.resource === 'reports')?.standard.read?.name).toBe('view:reports');
    expect(rows.find((row) => row.resource === 'reports')?.special).toEqual([]);
    expect(rows.flatMap((row) => row.permissions).map((p) => p.id).sort()).toEqual(catalog.map((p) => p.id).sort());
  });

  it('separates attendance from people and keeps academic structure together regardless of catalog order', () => {
    const catalog = ['read:subjects', 'read:attendance', 'read:cycles', 'read:students', 'read:sections', 'read:classes', 'read:staff-attendance', 'read:custom-module'].map((name) => permission(name));
    const rows = buildPermissionRows(catalog);
    expect(rows.filter((row) => permissionCategory(row.resource) === 'academic').slice(0, 4).map((row) => row.resource)).toEqual(['classes', 'sections', 'cycles', 'subjects']);
    expect(rows.filter((row) => permissionCategory(row.resource) === 'attendance').map((row) => row.resource)).toEqual(['attendance', 'staff-attendance']);
    expect(permissionCategory('students')).toBe('people');
    expect(permissionCategory('staff')).toBe('people');
    expect(permissionCategory('custom-module')).toBe('general');
    expect(permissionCategory('discipline')).toBe('conduct');
    expect(rows.flatMap((row) => row.permissions).map((p) => p.id).sort()).toEqual(catalog.map((p) => p.id).sort());
  });

  it('splits financial modules and keeps special actions editable', () => {
    const catalog = ['read:fees', 'read:payroll', 'read:feeTypes', 'create:payments', 'update:financial-operations', 'sidebar:configured'].map((name) => permission(name));
    const rows = buildPermissionRows(catalog);
    expect(rows.find((row) => row.resource === 'fees')?.standard.read?.name).toBe('read:fees');
    expect(rows.find((row) => row.resource === 'payroll')?.standard.read?.name).toBe('read:payroll');
    expect(rows.find((row) => row.resource === 'feeTypes')?.sidebar?.[1]).toBe('/fee-types');
    expect(rows.find((row) => row.resource === 'payments')?.sidebar).toBeUndefined();
    expect(rows.find((row) => row.resource === 'financial-operations')?.standard.update?.name).toBe('update:financial-operations');
    expect(rows.some((row) => row.resource === 'configured')).toBe(false);
  });

  it('does not lose custom permissions sharing an action with a standard permission', () => {
    const rows = buildPermissionRows([permission('read:students'), permission('read:student-summary', 'students', 'read')]);
    expect(rows.find((row) => row.resource === 'students')?.special[0].name).toBe('read:student-summary');
  });

  it('preserves configured empty navigation, legacy defaults, and wildcard access', () => {
    expect(sidebarKeysFromPermissions([])).toContain('payroll');
    expect(sidebarKeysFromPermissions([permission('sidebar:configured')])).toEqual([]);
    expect(sidebarKeysFromPermissions([permission('*:*')])).toContain('payroll');
    expect(sidebarKeysFromPermissions([permission('sidebar:configured'), permission('sidebar:fees')])).toEqual(['fees']);
  });

  it('reviews removals and additions without counting order changes', () => {
    expect(changedValues(['read', 'edit'], ['edit', 'read'])).toEqual({ added: [], removed: [] });
    expect(changedValues(['read', 'edit'], ['read', 'create'])).toEqual({ added: ['create'], removed: ['edit'] });
  });
});
