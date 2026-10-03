// In-memory fixtures only. No container, database connection or network request.
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { FeeValidator } from '../../src/modules/financial/fees/FeeValidator';
import { InstallmentService } from '../../src/modules/financial/installments/InstallmentService';
import { InstallmentValidator } from '../../src/modules/financial/installments/InstallmentValidator';
import { withEnglishMessages } from './englishMessages';

export const events = { emit() {} };
export function feeHarness(paymentType = 'recurring') {
  let fee: any;
  let installments: any[] = [];
  const audit: any[] = [], writes: any[] = [];
  const settings = { getAdminSettings: async () => ({ startMonth: 'september', endMonth: 'june' }) };
  const repo: any = {
    getById: async () => fee ? { ...fee, installments: installments.map(i => ({ ...i })) } : null,
    getByIdAllYears: async () => repo.getById(),
    getByStudentAndYear: async () => fee,
    create: async (data: any) => (fee = { id: 'audit-fee', paymentCount: 0, ...data }),
    update: async (_id: string, data: any) => { writes.push({ ...data }); fee = { ...fee, ...data }; return { ...fee }; },
    updateAllYears: async (id: string, data: any) => repo.update(id, data),
    getAllocatedTotal: async () => Number(fee?.paidAmount ?? 0),
    hasAllocations: async () => Number(fee?.paymentCount ?? 0) > 0,
    delete: async () => { writes.push({ deleted: fee.id }); const old = fee; fee = null; return old; },
  };
  const validator = withEnglishMessages(new FeeValidator(repo,
    { checkExists: async () => ({ id: 'audit-student' }) } as any,
    { checkExists: async () => ({ amount: 100, paymentType }) } as any));
  const instRepo: any = {
    lockFeeSchedules: async () => {},
    deleteByFeeId: async () => { installments = []; },
    createBulk: async (rows: any[]) => { installments = rows.map((r, n) => ({ id: `inst-${n + 1}`, ...r })); return installments; },
    getById: async (id: string) => { const row = installments.find(i => i.id === id); return row ? { ...row } : undefined; },
    getByFeeId: async () => installments.map(row => ({ ...row })),
    getByIdAllYears: async (id: string) => instRepo.getById(id),
    getByFeeAndNumber: async (_fee: string, number: number) => installments.find(i => i.number === number),
    hasAllocations: async () => false,
    update: async (id: string, data: any) => { const i = installments.find(i => i.id === id); Object.assign(i, data); return { ...i }; },
    delete: async (id: string) => { const old = installments.find(i => i.id === id); installments = installments.filter(i => i.id !== id); return old; },
  };
  const instValidator = withEnglishMessages(new InstallmentValidator(instRepo, validator));
  const instService = new InstallmentService(instRepo, instValidator, settings as any, { record: async (row: any) => { audit.push(row); } } as any);
  Object.assign(instService, { events });
  const service = new FeeService(repo, validator, instService, settings as any, {} as any,
    { getById: async () => ({ id: 'audit-student', enrollmentDate: '2026-09-01' }) } as any,
    { record: async (row: any) => { audit.push(row); } } as any, {} as any,
    { resolve: async () => ({ status: 'active' }), requireLabel: async () => ({ status: 'active' }) } as any);
  Object.assign(service, { events, year: { label: '2026-2027' } });
  return { service, repo, validator, instService, instRepo, audit, writes,
    get fee() { return fee; }, set fee(value: any) { fee = value; },
    get installments() { return installments; } };
}
export const recurringInput = { studentId: 'audit-student', feeTypeId: 'audit-type', schedule: 'monthly' as const,
  academicYear: '2026-2027', effectiveDate: '2026-09-01', baseAmount: 100, discountAmount: 10 };
