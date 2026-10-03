import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { StudentService } from '../../src/modules/students/StudentService';
import { createStudentDto } from '../../src/modules/students/StudentDto';
import { createFeeDto, updateFeeDto } from '../../src/modules/financial/fees/FeeDto';
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { withEnglishMessages } from '../support/englishMessages';

const input = {
  name: 'Canary Student', studentCode: 'canary', email: 'canary@example.invalid',
  classId: 'class', sectionId: 'section', gender: 'M' as const,
  enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01',
};
const fee = { feeTypeId: 'fee-type', schedule: 'oneTime' as const, baseAmount: 100 };
const transport = { vehicleId: 'vehicle', pickupLocation: 'School' };
const validator = withEnglishMessages(new StudentValidator({} as never, {} as never, {} as never, {} as never, {} as never));

function studentHarness() {
  const effects: string[] = [];
  const actors: unknown[] = [];
  const checks = Object.assign(Object.create(validator), Object.fromEntries([
    'ensureCodeUnique', 'ensureEmailUnique', 'ensurePhoneUnique', 'ensureClassAndSectionValid',
  ].map((name) => [name, async () => {}])));
  const service = new StudentService(
    { create: async (data: object) => { effects.push('student'); return { id: 'student', ...data }; } } as never,
    checks, {} as never,
    { provisionUser: async () => { effects.push('account'); return { id: 'student-user' }; } } as never,
    { processParents: async () => {} } as never,
    { processFees: async (_s: unknown, _f: unknown, actor: unknown) => actors.push(actor) } as never,
    { assign: async () => effects.push('transport') } as never,
    { resolveNewStudentPlacement: async () => ({ id: 'year', label: '2026-2027' }), create: async () => {} } as never,
    { processFile: async () => { effects.push('file'); return null; } } as never,
  );
  return { service, effects, actors };
}

describe('SEC-001 nested student creation boundary', () => {
  it('allows student-only secretary enrollment, preserving the full actor', async () => {
    const { service, effects, actors } = studentHarness();
    const actor = { id: 'secretary', role: 'secretary' };
    await service.create(input, actor);
    expect(effects).toEqual(['file', 'account', 'student']);
    expect(actors).toEqual([actor]);
  });
  it('rejects unauthorized child operations before any file/account/database side effect', async () => {
    for (const child of [{ fees: [fee] }, { transportAssignment: transport }]) {
      const { service, effects } = studentHarness();
      await expect(service.create({ ...input, ...child }, { id: 'secretary', role: 'secretary' })).rejects.toThrow();
      expect(effects).toEqual([]);
    }
    const { service, effects } = studentHarness();
    await expect(service.create(input, undefined as never)).rejects.toThrow();
    expect(effects).toEqual([]);
  });
  it('allows financial roles to create fees and only admin to assign transport', async () => {
    for (const role of ['accounting', 'principal', 'admin']) {
      const { service, actors } = studentHarness();
      await service.create({ ...input, fees: [fee] }, { id: role, role });
      expect(actors).toEqual([{ id: role, role }]);
    }
    expect(() => validator.ensureNestedCreateAllowed({ ...input, transportAssignment: transport }, { id: 'principal', role: 'principal' })).toThrow();
    const { service, effects } = studentHarness();
    await service.create({ ...input, transportAssignment: transport }, { id: 'admin', role: 'admin' });
    expect(effects).toContain('transport');
  });
  it('validates child DTOs at both route and direct service boundaries', async () => {
    const parent = { name: 'Canary Parent', cin: 'CANARY00', phone: '+212600000001', relationshipType: 'father', password: 'x' };
    for (const child of [{ fees: [{ ...fee, baseAmount: -1 }] }, { fees: [{ ...fee, discountAmount: -1 }] }, { parents: [parent] }]) {
      expect(createStudentDto.safeParse({ ...input, ...child }).success).toBe(false);
      const { service, effects } = studentHarness();
      await expect(service.create({ ...input, ...child } as never, { id: 'admin', role: 'admin' })).rejects.toThrow();
      expect(effects).toEqual([]);
    }
    expect(createStudentDto.safeParse({ ...input, parents: ['existing-parent', { ...parent, password: 'long-password' }] }).success).toBe(true);
  });
});

it('SEC-002 ignores forged assignees in ordinary, bulk and nested fee creation', async () => {
  const stored: Array<{ assignedBy: string }> = [], audit: Array<{ actorId: string }> = [];
  const service = new FeeService(
    { create: async (data: object) => { stored.push(data as never); return { id: 'fee', ...data }; } } as never,
    new Proxy({}, { get: (_, key) => key === 'validateFeeTypeExists' ? async () => ({ amount: 100, paymentType: 'oneTime' }) : async () => {} }) as never,
    { generateInstallments: async () => {} } as never,
    { getAdminSettings: async () => ({ startMonth: 'september', endMonth: 'june' }) } as never,
    {} as never, { getById: async () => ({ enrollmentDate: '2026-09-01' }) } as never,
    { record: async (data: unknown) => audit.push(data as never) } as never,
    {} as never, {} as never,
  );
  Object.assign(service, { year: { label: '2026-2027' }, requireWritableYear: async () => {}, recalculate: async () => ({ id: 'fee' }) });
  const forged = { ...fee, studentId: 'student', assignedBy: 'victim' };
  expect(createFeeDto.parse(forged)).not.toHaveProperty('assignedBy');
  expect(updateFeeDto.parse({ assignedBy: 'victim' })).not.toHaveProperty('assignedBy');
  await service.create(forged, 'accountant', 'accounting');
  await service.createBulk([forged], 'accountant', 'accounting');
  await service.processFees({ id: 'student' }, [forged], { id: 'accountant', role: 'accounting' }, '2026-09-01', '2026-2027');
  expect(stored.map((row) => row.assignedBy)).toEqual(['accountant', 'accountant', 'accountant']);
  expect(audit.map((row) => row.actorId)).toEqual(['accountant', 'accountant', 'accountant']);
});
