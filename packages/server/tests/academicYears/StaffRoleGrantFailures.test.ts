import { describe, expect, it } from 'bun:test';
import { StaffRoleService } from '../../src/modules/staff/roles/StaffRoleService';

describe('staff role access grants', () => {
  function serviceWith(
    existingPermissionIds: string[],
    assign: (permissionId: string) => Promise<void>,
  ) {
    let staffRoleCreates = 0;
    const service = new StaffRoleService(
      { create: async () => { staffRoleCreates++; return { code: 'helper' }; } } as any,
      { getByName: async () => ({ id: 'access-role' }) } as any,
      {
        getPermissionsByRole: async () => existingPermissionIds.map((id) => ({ id })),
        assignPermissionToRole: async (_roleId: string, permissionId: string) => assign(permissionId),
      } as any,
      { normalizeRoleCode: (code: string) => code, ensureCodeUnique: async () => {} } as any,
    );
    (service as any).events = { emit: () => {} };
    return { service, staffRoleCreates: () => staffRoleCreates };
  }

  it('reports a failed grant before creating the staff role', async () => {
    const { service, staffRoleCreates } = serviceWith([], async () => {
      throw new Error('grant failed');
    });
    await expect(service.create({ code: 'helper', label: 'Helper', createAccessRole: true,
      permissions: ['permission-1'] })).rejects.toThrow('grant failed');
    expect(staffRoleCreates()).toBe(0);
  });

  it('skips an existing grant and grants each new permission once', async () => {
    const granted: string[] = [];
    const { service, staffRoleCreates } = serviceWith(['permission-1'], async (id) => {
      granted.push(id);
    });
    await service.create({ code: 'helper', label: 'Helper', createAccessRole: true,
      permissions: ['permission-1', 'permission-2', 'permission-2'] });
    expect(granted).toEqual(['permission-2']);
    expect(staffRoleCreates()).toBe(1);
  });
});
