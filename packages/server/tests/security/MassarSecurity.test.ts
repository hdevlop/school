import 'reflect-metadata';
import { expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { MassarController } from '../../src/modules/massar/MassarController';
import { PrivateStorageGuard } from '../../src/config/PrivateStorageGuard';
import { permissionsData, rolePermissionsData } from '../../src/modules/seed-data/admin';
it('gives every Massar route an explicit permission guard, with school-wide management', () => {
  for (const route of getRoutes(MassarController)) {
    const guards = getGuardMetadata(MassarController, route.methodName);
    expect(guards.some(guard => guard.guardClass.name === 'PermissionGuard'), String(route.methodName)).toBe(true);
    if (['setup','preview','commit','cancelPreview','blockedClasses','mappings','recheckStudents','createRound','changeDueDate','closeRound','reopenRound','reopen','export','downloadRound','acceptDownload'].includes(String(route.methodName))) expect(guards.some(guard => guard.guardClass.name === 'RoleGuard')).toBe(true);
  }
});
it('keeps source workbooks out of the generic file server, including Windows case variants', () => {
  const guard = new PrivateStorageGuard();
  expect(guard.canActivate('massar')).toBe(false); expect(guard.canActivate('MaSsAr')).toBe(false); expect(guard.canActivate('students')).toBe(true);
});
it('seeds the same Massar permissions for existing school roles as the migration', () => {
  expect(permissionsData.map(permission => permission.name)).toEqual(expect.arrayContaining(['read:massar','manage:massar','update:massar-marks']));
  for (const role of rolePermissionsData) {
    if (['admin','principal','registrar'].includes(role.roleName)) expect(role.permissions).toContain('manage:massar');
    if (role.roleName === 'teacher') { expect(role.permissions).toContain('update:massar-marks'); expect(role.permissions).not.toContain('manage:massar'); }
    if (role.roleName === 'supervisor') { expect(role.permissions).toContain('read:massar'); expect(role.permissions).not.toContain('update:massar-marks'); }
  }
});
