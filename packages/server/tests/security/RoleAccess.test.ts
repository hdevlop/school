import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { SIDEBAR_ENTRIES, SIDEBAR_CONFIGURED_PERMISSION, sidebarPermission, type AccessPermission } from '@sms/contracts/access-control';
import { RoleAccessController } from '../../src/modules/roleAccess/RoleAccessController';
import { RoleAccessService } from '../../src/modules/roleAccess/RoleAccessService';
import { RoleAccessValidator } from '../../src/modules/roleAccess/RoleAccessValidator';
import { saveRoleAccessDto } from '../../src/modules/roleAccess/RoleAccessDto';
import { withEnglishMessages } from '../support/englishMessages';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';

const permission = (name: string): AccessPermission => ({ id: name, name, resource: name.split(':')[1], action: name.split(':')[0], description: null });
function build(roleName = 'accounting') {
  let catalog = ['read:fees', 'read:payroll', 'read:feeTypes'].map(permission);
  const assigned = new Set(['read:fees', 'read:payroll']);
  const calls: string[] = [];
  const repository = {
    getRole: async (_id: string, lock: boolean) => { if (lock) calls.push('lock'); return { id: 'role-1', name: roleName }; },
    ensureSidebarCatalog: async () => {
      calls.push('catalog');
      catalog = [...catalog, permission(SIDEBAR_CONFIGURED_PERMISSION), ...SIDEBAR_ENTRIES.map(([key]) => permission(sidebarPermission(key)))];
    },
    audit: async (_role: string, _actor: string, added: string[], removed: string[]) => { calls.push('audit'); return { added, removed }; },
  };
  const permissions = {
    getAll: async () => catalog,
    getPermissionsByRole: async () => catalog.filter((p) => assigned.has(p.id)),
    assignPermissionToRole: async (_role: string, id: string) => { calls.push(`allow:${id}`); assigned.add(id); },
    removePermissionFromRole: async (_role: string, id: string) => { calls.push(`remove:${id}`); assigned.delete(id); },
  };
  const validator = withEnglishMessages(new RoleAccessValidator());
  const service = new RoleAccessService(repository as never, validator, permissions as never);
  return { service, calls, assigned, validator };
}

describe('review-and-save role access command', () => {
  it('keeps sidebar preferences out of the staff-login privilege comparison', async () => {
    const validator = withEnglishMessages(new StaffValidator({} as never, {} as never, {
      getPermissionsByRole: async () => [permission('read:students'), permission('sidebar:configured'), permission('sidebar:payroll')],
    } as never));
    await expect(validator.ensureCanManageLogin({ permissions: ['read:students'] }, 'target-role')).resolves.toBeUndefined();
    await expect(validator.ensureCanManageLogin({ permissions: ['sidebar:students'] }, 'target-role')).rejects.toMatchObject({ status: 403 });
  });
  it('is explicitly admin-only over REST', () => {
    expect(getGuardMetadata(RoleAccessController).map((guard) => [guard.guardClass.name, guard.params ?? null])).toEqual([
      ['AuthGuard', null], ['RoleGuard', 'admin'],
    ]);
  });

  it('validates sidebar keys and rejects duplicate grants', () => {
    const body = { permissionIds: [], expectedPermissionIds: [], sidebarKeys: ['payroll'] };
    expect(saveRoleAccessDto.safeParse(body).success).toBe(true);
    expect(saveRoleAccessDto.safeParse({ ...body, sidebarKeys: ['not-a-page'] }).success).toBe(false);
    expect(saveRoleAccessDto.safeParse({ ...body, permissionIds: ['a', 'a'] }).success).toBe(false);
    expect(saveRoleAccessDto.safeParse({ permissionIds: [], expectedPermissionIds: [] }).success).toBe(true);
  });

  it('preserves an unconfigured sidebar during a permission-only change', async () => {
    const { service, assigned, calls } = build();
    await service.save('role-1', { permissionIds: ['read:fees'], expectedPermissionIds: ['read:fees', 'read:payroll'] }, 'admin-1');
    expect([...assigned]).toEqual(['read:fees']);
    expect(calls).toEqual(['lock', 'remove:read:payroll', 'audit']);
  });

  it('preserves configured sidebar choices when sidebarKeys is omitted', async () => {
    const { service, calls } = build();
    const before = await service.save('role-1', { permissionIds: ['read:fees', 'read:payroll'], expectedPermissionIds: ['read:fees', 'read:payroll'], sidebarKeys: ['fees'] }, 'admin-1');
    calls.length = 0;
    const after = await service.save('role-1', { permissionIds: ['read:fees'], expectedPermissionIds: before.permissions.map((p) => p.id) }, 'admin-1');
    expect(after.permissions.filter((p) => p.name.startsWith('sidebar:')).map((p) => p.name).sort()).toEqual(['sidebar:configured', 'sidebar:fees']);
    expect(calls).not.toContain('catalog');
  });

  it('saves separate financial grants and sidebar choices through Najm auth, then audits', async () => {
    const { service, calls, assigned } = build();
    await service.save('role-1', { permissionIds: ['read:fees', 'read:feeTypes'], expectedPermissionIds: ['read:fees', 'read:payroll'], sidebarKeys: ['feeTypes'] }, 'admin-1');
    expect(calls[0]).toBe('lock');
    expect(assigned.has('read:payroll')).toBe(false);
    expect(assigned.has('read:fees')).toBe(true);
    expect(assigned.has('sidebar:fees')).toBe(false);
    expect(assigned.has('sidebar:feeTypes')).toBe(true);
    expect(assigned.has(SIDEBAR_CONFIGURED_PERMISSION)).toBe(true);
    expect(calls.at(-1)).toBe('audit');
  });

  it('refuses stale drafts before changing grants or creating the sidebar catalog', async () => {
    const { service, calls } = build();
    await expect(service.save('role-1', { permissionIds: [], expectedPermissionIds: [], sidebarKeys: [] }, 'admin-1')).rejects.toMatchObject({ status: 409 });
    expect(calls).toEqual(['lock']);
  });

  it('protects the admin role and refuses unknown or reserved permission IDs', async () => {
    const body = { permissionIds: ['unknown'], expectedPermissionIds: ['read:fees', 'read:payroll'], sidebarKeys: [] };
    await expect(build('admin').service.save('role-1', body, 'admin-1')).rejects.toMatchObject({ status: 403 });
    await expect(build().service.save('role-1', body, 'admin-1')).rejects.toMatchObject({ status: 422 });
    expect(() => build().validator.ensurePermissions(['sidebar:configured'], [permission('sidebar:configured')])).toThrow();
  });
});
