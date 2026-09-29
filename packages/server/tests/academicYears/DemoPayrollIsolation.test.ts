import { expect, it } from 'bun:test';
import { PayrollService } from '../../src/modules/financial/payroll/PayrollService';

it('creates demo payroll only for this run while normal payroll retains the full staff roster', async () => {
  const inserted: any[][] = [];
  const staff = [
    { id: 'new-demo', name: 'Demo Teacher', role: 'teacher', salary: '5000', compensationMode: 'monthly' },
    { id: 'earlier-demo', name: 'Earlier Teacher', role: 'teacher', salary: '5000', compensationMode: 'monthly' },
    { id: 'unpaid-demo', name: 'Volunteer', role: 'assistant', salary: '0', compensationMode: 'monthly' },
  ];
  const service = new PayrollService({
    getStaffIdsWithPayslip: async () => [],
    createMany: async (rows: any[]) => { inserted.push(rows); return rows.map((row, index) => ({ id: `payslip-${index}`, ...row })); },
  } as any, { ensurePeriodInSelectedYear: () => {} } as any,
  { getByStatus: async () => staff } as any, { record: async () => {} } as any);
  Object.defineProperty(service, 'events', { value: { emit: () => {} } });
  const before = process.env.SEED_MODE;
  try {
    process.env.SEED_MODE = 'false';
    await expect(service.runPayrollForSeed({ period: '2025-09' }, new Set(['new-demo']))).rejects.toThrow('seed mode');
    expect(inserted).toEqual([]);
    process.env.SEED_MODE = 'true';
    await service.runPayrollForSeed({ period: '2025-09' }, new Set(['new-demo', 'unpaid-demo']));
    await service.runPayroll({ period: '2025-09' });
    expect(inserted.map((rows) => rows.map((row) => row.staffId))).toEqual([
      ['new-demo'], ['new-demo', 'earlier-demo'],
    ]);
  } finally {
    if (before === undefined) delete process.env.SEED_MODE;
    else process.env.SEED_MODE = before;
  }
});
