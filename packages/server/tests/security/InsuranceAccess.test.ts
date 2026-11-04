import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { InsuranceController } from '../../src/modules/insurance/InsuranceController';
import { InsuranceService } from '../../src/modules/insurance/InsuranceService';
import { yearScopedModules } from '../../src/config/yearScope';

function registerService(students: unknown[], listByStudents = async (_ids: string[]) => new Map()) {
  const service = new InsuranceService({ getAll: async () => students } as any, { listByStudents } as any);
  Object.assign(service, { year: { label: '2026-2027' } });
  return service;
}

describe('independent insurance access', () => {
  it('requires its own permission and relies on the student repository for class scope', () => {
    const guards = getGuardMetadata(InsuranceController, 'getRegister').map((guard) => [guard.guardClass.name, guard.params ?? null]);
    expect(guards).toEqual([
      ['AuthGuard', null],
      ['PermissionGuard', 'read:insurance'],
    ]);
    expect(yearScopedModules.insurance).toBe(InsuranceController);
  });

  it('returns only register fields from the selected year, without requiring student-page access', async () => {
    const service = registerService([{
      id: 'student', name: 'Aya', studentCode: 'S1', status: 'active',
      class: { id: 'class', name: 'CE2' }, enrollment: { id: 'enrollment', enrolledOn: '2026-09-01' },
      medicalConditions: 'private', phone: '+212600000000', parents: ['private'],
    }]);
    const [student] = await service.getRegister();
    expect(student).toMatchObject({ id: 'student', name: 'Aya', class: { id: 'class', name: 'CE2' }, enrollment: { enrolledOn: '2026-09-01' } });
    for (const field of ['medicalConditions', 'phone', 'parents']) expect(student).not.toHaveProperty(field);
    expect(student.enrollment).not.toHaveProperty('id');
  });

  it('propagates scoped read failures rather than returning an empty register', async () => {
    const service = new InsuranceService({ getAll: async () => { throw new Error('Missing year'); } } as any, {} as any);
    await expect(service.getRegister()).rejects.toThrow('Missing year');
  });

  it('loads only the owned roster history and exposes only the two register years and class names', async () => {
    let requested: string[] = [];
    const record = (label: string, className: string) => ({
      academicYear: { label }, placements: [{ className, actorName: 'private' }, { className: 'older placement' }],
    });
    const service = registerService([{ id: 'owned', name: 'Aya', class: { id: 'ce1', name: 'CE1' } }], async ids => {
      requested = ids;
      return new Map([
        ['owned', [record('2027-2028', 'CE2'), record('2026-2027', 'CE1'), record('2025-2026', 'CE1'), record('2024-2025', 'CP')]],
        ['unowned', [record('2025-2026', 'CM2')]],
      ]);
    });
    const [student] = await service.getRegister();
    expect(requested).toEqual(['owned']);
    expect(student.levels).toEqual([
      { academicYear: '2026-2027', className: 'CE1' },
      { academicYear: '2025-2026', className: 'CE1' },
    ]);
  });

  it('uses the selected historical year and propagates history failures', async () => {
    const service = registerService([{ id: 'owned' }], async () => new Map([['owned', [
      { academicYear: { label: '2026-2027' }, placements: [{ className: 'CE2' }] },
      { academicYear: { label: '2025-2026' }, placements: [{ className: 'CE1' }] },
      { academicYear: { label: '2024-2025' }, placements: [] },
    ]]]));
    Object.assign(service, { year: { label: '2025-2026' } });
    expect((await service.getRegister())[0].levels).toEqual([{ academicYear: '2025-2026', className: 'CE1' }]);
    const broken = registerService([{ id: 'owned' }], async () => { throw new Error('History unavailable'); });
    await expect(broken.getRegister()).rejects.toThrow('History unavailable');
  });
});
