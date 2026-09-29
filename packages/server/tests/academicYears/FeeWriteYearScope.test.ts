import { describe, expect, it } from 'bun:test';
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { FeeValidator } from '../../src/modules/financial/fees/FeeValidator';

function harness(status: 'closed' | 'draft' = 'closed', allowed = true) {
  const writes: string[] = [];
  const service = new FeeService(
    { create: async (fee: { academicYear: string }) => {
      writes.push(fee.academicYear);
      return { id: 'new-fee', ...fee };
    } } as any,
    Object.assign(new FeeValidator({} as any, {} as any, {} as any, {} as any), {
      validate: async () => {}, validateFeeTypeExists: async () => ({ amount: 30, paymentType: 'oneTime' }),
    }) as any,
    { generateInstallments: async () => {} } as any,
    { getAdminSettings: async () => ({ currentAcademicYear: '2026-2027', startMonth: 'september', endMonth: 'june' }) } as any,
    {} as any,
    { getById: async () => ({ id: 'student-1', enrollmentDate: '2025-09-01' }) } as any,
    { record: async () => {} } as any,
    {} as any,
    {
      requireLabel: async (label: string) => ({ id: 'year-1', label, status }),
      resolve: async (label: string, role: string) => {
        if (!allowed) throw new Error(`Year ${label} unavailable to ${role}`);
        return { id: 'year-1', label, status };
      },
    } as any,
  );
  (service as any).year = { id: 'year-1', label: '2025-2026', status };
  service.recalculate = async () => ({ id: 'new-fee', academicYear: '2025-2026' }) as any;
  const fee = {
    studentId: 'student-1', feeTypeId: 'fee-type-1', schedule: 'oneTime' as const,
    academicYear: '2025-2026', effectiveDate: '2025-10-01',
  };
  return { service, writes, fee };
}

describe('normal fee write year scope', () => {
  it('rejects an unavailable or draft year before inserting a fee', async () => {
    const denied = harness('closed', false);
    await expect(denied.service.create(denied.fee, 'actor-1', 'teacher'))
      .rejects.toThrow('unavailable');
    expect(denied.writes).toEqual([]);

    const draft = harness('draft');
    await expect(draft.service.create(draft.fee, 'actor-1', 'admin'))
      .rejects.toThrow('draft academic year');
    await expect(draft.service.createBulk([draft.fee], 'actor-1', 'admin'))
      .rejects.toThrow('draft academic year');
    expect(draft.writes).toEqual([]);
  });

  it('charges a registered closed year for a permitted financial caller', async () => {
    const { service, writes, fee } = harness();
    await service.create(fee, 'actor-1', 'accounting');
    expect(writes).toEqual(['2025-2026']);
  });

  it('refuses a bulk body that charges another year before creating any fee', async () => {
    const { service, writes, fee } = harness();
    await expect(service.createBulk([{ ...fee, academicYear: '2026-2027' }], 'actor-1', 'accounting'))
      .rejects.toThrow('must match the selected academic year');
    expect(writes).toEqual([]);
  });

  it('charges nested new-student fees to the resolved enrollment year', async () => {
    const { service, fee } = harness();
    let submitted: Array<{ academicYear?: string; effectiveDate?: string | null }> = [];
    service.createBulk = async (items: typeof submitted) => { submitted = items; return []; };
    await service.processFees({ id: 'student-1', enrollmentDate: '2025-09-01' },
      [{ ...fee, academicYear: undefined }], { id: 'actor-1' }, '2025-10-01', '2025-2026');
    expect(submitted).toMatchObject([{ academicYear: '2025-2026', effectiveDate: '2025-10-01' }]);
    await expect(service.processFees({ id: 'student-1' },
      [{ ...fee, academicYear: '2026-2027' }], { id: 'actor-1' }, '2025-10-01', '2025-2026'))
      .rejects.toThrow('must match the new enrollment year');
  });
});
