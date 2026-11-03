import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { InsuranceController } from '../../src/modules/insurance/InsuranceController';
import { InsuranceService } from '../../src/modules/insurance/InsuranceService';
import { yearScopedModules } from '../../src/config/yearScope';

describe('independent insurance access', () => {
  it('requires its own permission and keeps the school-wide role boundary', () => {
    const guards = getGuardMetadata(InsuranceController, 'getRegister').map((guard) => [guard.guardClass.name, guard.params ?? null]);
    expect(guards).toEqual([
      ['AuthGuard', null],
      ['RoleGuard', ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'supervisor']],
      ['PermissionGuard', 'read:insurance'],
    ]);
    expect(yearScopedModules.insurance).toBe(InsuranceController);
  });

  it('returns only register fields from the selected year, without requiring student-page access', async () => {
    const service = new InsuranceService({ getAll: async () => [{
      id: 'student', name: 'Aya', studentCode: 'S1', status: 'active',
      class: { id: 'class', name: 'CE2' }, enrollment: { id: 'enrollment', enrolledOn: '2026-09-01' },
      medicalConditions: 'private', phone: '+212600000000', parents: ['private'],
    }] } as any);
    const [student] = await service.getRegister();
    expect(student).toMatchObject({ id: 'student', name: 'Aya', class: { id: 'class', name: 'CE2' }, enrollment: { enrolledOn: '2026-09-01' } });
    for (const field of ['medicalConditions', 'phone', 'parents']) expect(student).not.toHaveProperty(field);
    expect(student.enrollment).not.toHaveProperty('id');
  });

  it('propagates scoped read failures rather than returning an empty register', async () => {
    const service = new InsuranceService({ getAll: async () => { throw new Error('Missing year'); } } as any);
    await expect(service.getRegister()).rejects.toThrow('Missing year');
  });
});
