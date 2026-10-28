import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { FeeImportService } from '../../src/modules/financial/fees/FeeImportService';
import { importStudentFeesDto } from '../../src/modules/financial/fees/FeeImportDto';

function fixture() {
  const year = { id: 'year', label: '2026-2027' };
  const fee: any = { id: 'meal-fee', studentId: 'student', schedule: 'occasional', academicYear: year.label,
    baseAmount: '35', netAmount: '0', grossAmount: '0', discountAmount: '0', effectiveDate: '2026-09-01' };
  const rows: any[] = [], recorded: any[] = [], audits: any[] = [];
  const repo = { getByStudentAndYear: async () => ({ ...fee }), update: async (_id: string, data: any) => Object.assign(fee, data) };
  const validator = { ensureWritableYear: () => {}, ensureSelectedFeeYears: () => {}, ensureDiscountWithinAmount: () => {},
    validateFeeTypeExists: async () => ({ paymentType: 'oneTime', amount: '35' }), mapEffectiveDateError: (error: Error) => { throw error; } };
  const service = new FeeImportService(
    { recalculate: async () => {}, create: async () => { throw new Error('Fee already exists'); } } as any,
    repo as any, validator as any, { lock: async () => {} } as any,
    { refuse: (message: string) => { throw new Error(message); } } as any,
    { getAll: async () => [{ id: 'student', enrollment: { enrolledOn: '2026-09-01' } }] } as any,
    { getAdminSettings: async () => ({ startMonth: 'september', endMonth: 'june' }) } as any,
    { resolve: async () => year } as any,
    { lockFeeSchedules: async () => {}, getByFeeId: async () => [...rows],
      createBulk: async (data: any[]) => { rows.push(...data); return data; },
      deleteByFeeId: async () => { throw new Error('Do not delete occasional history'); } } as any,
    { recordImported: async (data: any) => { recorded.push({ ...data, id: `receipt-${recorded.length}`, status: 'completed' }); } } as any,
    { getByReceiptNumber: async (receipt: string) => recorded.find(row => row.receiptNumber === receipt) } as any,
    { getByPaymentId: async (id: string) => recorded.find(row => row.id === id).allocations.map((allocation: any) => ({
      feeId: allocation.feeId, amount: allocation.amount, installment: { number: allocation.number },
    })) } as any,
    { record: async (data: any) => { audits.push(data); } } as any, {} as any,
  );
  Object.defineProperty(service, 'year', { value: year });
  return { service, fee, rows, recorded, audits };
}

const input = importStudentFeesDto.parse({ studentId: 'student', fees: [
  { feeTypeId: 'meal', schedule: 'occasional', baseAmount: 35, effectiveDate: '2026-09-01' },
  { feeTypeId: 'meal', schedule: 'occasional', baseAmount: 70, effectiveDate: '2026-09-15' },
], payments: [{ receiptNumber: 'meal-source-1', paymentDate: '2026-09-20', paymentMethod: 'cash',
  allocations: [{ feeTypeId: 'meal', month: '2026-09', amount: 105 }] }] });

describe('occasional fee import service', () => {
  it('records historical charges and distributes a source payment across meals in the same month', async () => {
    const f = fixture();
    const result = await f.service.importStudent(input, { id: 'accountant', role: 'accounting' });
    expect(result.createdPayments).toBe(1);
    expect(f.fee.baseAmount).toBe('35');
    expect(f.fee.netAmount).toBe('105.00');
    expect(f.rows).toHaveLength(2);
    expect(f.recorded[0].allocations).toEqual([
      { feeId: 'meal-fee', number: 1, amount: 35 }, { feeId: 'meal-fee', number: 2, amount: 70 },
    ]);
  });
  it('re-imports without duplicating payments or removing a later meal and its unit price', async () => {
    const f = fixture();
    await f.service.importStudent(input, { id: 'accountant', role: 'accounting' });
    f.rows.push({ id: 'occ_manual', feeId: f.fee.id, number: 3, dueDate: '2026-09-25', amount: '40', status: 'paid' });
    f.fee.baseAmount = '40';
    f.fee.netAmount = f.fee.grossAmount = '145.00';
    const result = await f.service.importStudent(input, { id: 'accountant', role: 'accounting' });
    expect(result.reusedFees).toBe(1);
    expect(result.reusedPayments).toBe(1);
    expect(f.recorded).toHaveLength(1);
    expect(f.rows).toHaveLength(3);
    expect(f.fee.baseAmount).toBe('40');
    expect(f.fee.netAmount).toBe('145.00');
    expect(f.audits).toHaveLength(1);
  });
  it('refuses a changed historical price before writing any additional rows', async () => {
    const f = fixture();
    await f.service.importStudent(input, { id: 'accountant', role: 'accounting' });
    const changed = structuredClone(input);
    changed.fees[0].baseAmount = 40;
    await expect(f.service.importStudent(changed, { id: 'accountant', role: 'accounting' })).rejects.toThrow('existingFeeConflict');
    expect(f.rows).toHaveLength(2);
    expect(f.recorded).toHaveLength(1);
  });
});
