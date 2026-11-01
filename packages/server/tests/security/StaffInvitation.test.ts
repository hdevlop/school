import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { AuthService } from '../../src/auth';
import { StaffService } from '../../src/modules/staff/StaffService';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';
import { createStaffDto } from '../../src/modules/staff/StaffDto';
import { withEnglishMessages } from '../support/englishMessages';

const originalSeedMode = process.env.SEED_MODE;
beforeEach(() => { delete process.env.SEED_MODE; });
afterEach(() => {
  if (originalSeedMode === undefined) delete process.env.SEED_MODE;
  else process.env.SEED_MODE = originalSeedMode;
});

const input = createStaffDto.parse({
  name: 'Fatima Zahra', cin: 'AB123456', email: 'fatima@example.ma',
  phone: '+212612345678', address: 'Casablanca', role: 'secretary',
  salary: 3000, hireDate: '2026-09-01',
});

function harness(accessRoleId: string | null = 'secretary-role') {
  const accounts: Record<string, any>[] = [];
  const profiles: Record<string, any>[] = [];
  let invitationCalls = 0;
  const repository = {
    getByCin: async () => null,
    getByEmail: async () => null,
    getByEmployeeCode: async () => null,
    create: async (row: Record<string, any>) => { profiles.push(row); return row; },
  };
  const validator = withEnglishMessages(new StaffValidator(
    repository as never,
    { getByCode: async () => ({ active: true, accessRoleId }) } as never,
    { getPermissionsByRole: async () => [{ name: 'read:students' }] } as never,
  ));
  // Use Najm's real provisioning branch: a missing password would call
  // inviteUser immediately, so this proves creation cannot silently send mail.
  const auth = Object.assign(Object.create(AuthService.prototype), {
    userService: { create: async (account: Record<string, any>) => {
      accounts.push(account);
      return { id: 'staff-user' };
    } },
    inviteUser: async () => { invitationCalls++; throw new Error('Invitation sent before approval'); },
  });
  const service = new StaffService(
    repository as never, validator, {} as never, auth,
    { processFile: async () => '/images/secretary_female.png' } as never,
    {} as never, {} as never, {} as never, {} as never,
  );
  return { service, accounts, profiles, invitationCalls: () => invitationCalls };
}

describe('staff invitations wait for approval', () => {
  it('saves a pending login without sending mail or exposing its random password', async () => {
    const { service, accounts, invitationCalls } = harness();
    const result = await service.create(input, { permissions: ['read:students'] });
    expect(result).toMatchObject({ userId: 'staff-user', invitationPending: true });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('emailSent');
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ status: 'pending', roleId: 'secretary-role', email: input.email });
    expect(accounts[0].password.length).toBeGreaterThanOrEqual(32);
    expect(invitationCalls()).toBe(0);
  });

  it('does not let a supplied password bypass approval outside seeding', async () => {
    const { service, accounts } = harness();
    await service.create({ ...input, password: 'SuppliedPassword123!' });
    expect(accounts[0].status).toBe('pending');
    expect(accounts[0].password).not.toBe('SuppliedPassword123!');
  });

  it('still refuses provisioning a login beyond the creator permissions', async () => {
    const { service, accounts, profiles } = harness();
    await expect(service.create(input, { permissions: [] })).rejects.toMatchObject({ status: 403 });
    expect(accounts).toHaveLength(0);
    expect(profiles).toHaveLength(0);
  });

  it('keeps roles without app access login-less', async () => {
    const { service, accounts } = harness(null);
    const result = await service.create(input);
    expect(accounts).toHaveLength(0);
    expect(result.userId).toBeNull();
    expect(result).not.toHaveProperty('invitationPending');
  });

  it('preserves accounts already provisioned by the teacher workflow', async () => {
    const { service, accounts } = harness();
    const result = await service.create({ ...input, role: 'teacher', userId: 'teacher-user' });
    expect(accounts).toHaveLength(0);
    expect(result.userId).toBe('teacher-user');
    expect(result).not.toHaveProperty('invitationPending');
  });

  it('preserves silent active logins for explicitly seeded data', async () => {
    process.env.SEED_MODE = 'true';
    const { service, accounts, invitationCalls } = harness();
    const result = await service.create({ ...input, password: 'SeedPassword123!' });
    expect(accounts[0]).toMatchObject({ status: 'active', password: 'SeedPassword123!' });
    expect(result).not.toHaveProperty('invitationPending');
    expect(invitationCalls()).toBe(0);
  });
});
