import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { FeeValidator } from '../../src/modules/financial/fees/FeeValidator';
import { addOccasionalChargeDto, createFeeDto } from '../../src/modules/financial/fees/FeeDto';
import { InstallmentService } from '../../src/modules/financial/installments/InstallmentService';
import { InstallmentValidator } from '../../src/modules/financial/installments/InstallmentValidator';
import { calculateFeeAmounts, getScheduleConfig } from '../../src/modules/financial/utils';
import { withEnglishMessages } from '../support/englishMessages';

function fixture(paymentType = 'recurring') {
  let fee: any;
  const rows: any[] = [], audit: any[] = [];
  let paid = 0;
  const enrollment = { enrolledOn: '2026-09-01', leftOn: null as string | null };
  const year = { id: 'year', label: '2026-2027', status: 'active', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-08-31' };
  const repo: any = {
    getById: async () => fee && ({ ...fee, installments: [...rows] }),
    getByIdAllYears: async () => ({ ...fee, installments: [...rows] }),
    getByStudentAndYear: async () => fee,
    getAllocatedTotal: async () => paid,
    create: async (data: any) => (fee = { ...data, id: 'fee', status: 'pending' }),
    update: async (_id: string, data: any) => Object.assign(fee, data),
    updateAllYears: async (_id: string, data: any) => Object.assign(fee, data),
  };
  const student = { id: 'student', enrollmentDate: '2026-09-01' };
  const validator = withEnglishMessages(new FeeValidator(repo, { checkExists: async () => student } as any,
    { checkExists: async () => ({ id: 'cafeteria', amount: 35, paymentType, status: 'active' }) } as any));
  const installmentRepo: any = {
    lockFeeSchedules: async () => {},
    getByFeeId: async () => [...rows],
    deleteByFeeId: async () => { rows.length = 0; },
    create: async (data: any) => { rows.push(data); return data; },
  };
  const installmentValidator = withEnglishMessages(new InstallmentValidator(installmentRepo, validator));
  const settings = { getAdminSettings: async () => ({ startMonth: 'september', endMonth: 'june' }) };
  const auditor = { record: async (data: any) => { audit.push(data); } };
  const installments = new InstallmentService(installmentRepo, installmentValidator, settings as any, auditor as any);
  const service = new FeeService(repo, validator, installments, settings as any, {} as any,
    { getById: async () => student } as any, auditor as any,
    { getByStudentAndYear: async () => enrollment } as any,
    { resolve: async () => year } as any);
  for (const target of [service, installments]) Object.assign(target, { events: { emit: () => {} } });
  Object.defineProperty(service, 'year', { value: year });
  return { service, rows, audit, enrollment, year, get fee() { return fee; }, setPaid: (amount: number) => { paid = amount; } };
}

const input = { studentId: 'student', feeTypeId: 'cafeteria', schedule: 'occasional' as const, baseAmount: 35, effectiveDate: '2026-09-01' };
const charge = { date: '2026-09-21', amount: 35, requestId: '23024f20-12b2-4f1b-890a-ac5fcb986e64' };

describe('occasional fees', () => {
  it('starts with zero totals and no generated installments for either catalog type', async () => {
    for (const type of ['recurring', 'oneTime']) {
      const f = fixture(type);
      const result = await f.service.create(createFeeDto.parse(input), 'accountant', 'accounting');
      expect(Number(result.netAmount)).toBe(0);
      expect(Number(result.grossAmount)).toBe(0);
      expect(result.status).toBe('pending');
      expect(f.rows).toHaveLength(0);
      expect(calculateFeeAmounts(type, 35, 'occasional').periods).toBe(0);
      expect(getScheduleConfig('occasional', new Date(2026, 8, 1), new Date(2027, 5, 30)).count).toBe(0);
    }
  });

  it('adds repeated dated meals and preserves payments and amounts already recorded', async () => {
    const f = fixture();
    await f.service.create(createFeeDto.parse(input), 'accountant', 'accounting');
    await f.service.addOccasionalCharge('fee', charge, 'accountant', 'accounting');
    f.rows[0].status = 'paid';
    f.rows[0].paidAmount = '35.00';
    f.setPaid(35);
    const second = await f.service.addOccasionalCharge('fee', { ...charge, date: '2026-09-22', amount: 30,
      requestId: 'eb3dbd14-192d-487a-8fd2-bb0b38a1bbd3' }, 'accountant', 'accounting');
    expect(second.number).toBe(2);
    expect(f.rows[0]).toMatchObject({ amount: '35.00', paidAmount: '35.00', status: 'paid' });
    expect(Number(f.fee.netAmount)).toBe(65);
    expect(Number(f.fee.paidAmount)).toBe(35);
    expect(f.fee.status).toBe('partiallyPaid');
    expect(f.audit.at(-1)).toMatchObject({ action: 'installment.occasional_created', actorId: 'accountant' });
  });

  it('replays the same request once and refuses a reused key with different contents', async () => {
    const f = fixture();
    await f.service.create(createFeeDto.parse(input), 'accountant', 'accounting');
    const first = await f.service.addOccasionalCharge('fee', charge, 'accountant', 'accounting');
    const replay = await f.service.addOccasionalCharge('fee', charge, 'accountant', 'accounting');
    expect(replay.id).toBe(first.id);
    expect(f.rows).toHaveLength(1);
    expect(f.audit.filter(row => row.action === 'installment.occasional_created')).toHaveLength(1);
    await expect(f.service.addOccasionalCharge('fee', { ...charge, amount: 40 }, 'accountant', 'accounting')).rejects.toThrow();
    expect(Number(f.fee.netAmount)).toBe(35);
  });

  it('rejects a meal outside enrollment or the fee year, in the future, or on a non-occasional fee', async () => {
    const f = fixture();
    await f.service.create(createFeeDto.parse(input), 'accountant', 'accounting');
    f.enrollment.leftOn = '2026-10-01';
    for (const date of ['2026-08-31', '2026-10-01', '2027-09-01', '2099-10-01']) {
      await expect(f.service.addOccasionalCharge('fee', { ...charge, date }, 'accountant', 'accounting')).rejects.toThrow();
    }
    f.fee.schedule = 'monthly';
    await expect(f.service.addOccasionalCharge('fee', charge, 'accountant', 'accounting')).rejects.toThrow();
    expect(f.rows).toHaveLength(0);
  });

  it('allows changing the future unit price without regenerating existing meals', async () => {
    const f = fixture();
    await f.service.create(createFeeDto.parse(input), 'accountant', 'accounting');
    await f.service.addOccasionalCharge('fee', charge, 'accountant', 'accounting');
    f.fee.paymentCount = 1;
    await f.service.update('fee', { baseAmount: 40 }, 'accountant', 'accounting');
    expect(Number(f.fee.baseAmount)).toBe(40);
    expect(Number(f.fee.netAmount)).toBe(35);
    expect(f.rows[0].amount).toBe('35.00');
    f.fee.paymentCount = 0;
    await expect(f.service.update('fee', { schedule: 'monthly' }, 'accountant', 'accounting')).rejects.toThrow();
    expect(f.rows).toHaveLength(1);
  });

  it('refuses invalid amounts, dates and missing replay keys at the DTO boundary', () => {
    for (const amount of [0, -1, 35.123]) expect(addOccasionalChargeDto.safeParse({ ...charge, amount }).success).toBe(false);
    expect(addOccasionalChargeDto.safeParse({ ...charge, date: '2026-02-30' }).success).toBe(false);
    expect(addOccasionalChargeDto.safeParse({ date: charge.date, amount: 35 }).success).toBe(false);
  });
});
