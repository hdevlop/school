import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { FeeRepository } from '../../src/modules/financial/fees/FeeRepository';

const oldYear = { id: 'year-old', label: '2025-2026' } as any;

function serviceHarness() {
  const calls: string[] = [];
  const service = new FeeService(
    {
      getAllYears: async () => { calls.push('all-years'); return []; },
      getAll: async () => {
        calls.push('selected');
        return [{ academicYear: oldYear.label }];
      },
      getById: async (id: string) => id === 'fee-old' ? { id, academicYear: oldYear.label } : null,
      getByStudentAllYears: async () => { calls.push('student-all-years'); return { fees: [] }; },
      getByStudent: async (studentId: string) => {
        calls.push(`student:${studentId}`);
        return { academicYear: oldYear.label, fees: [] };
      },
    } as any,
    { checkExists: async (id: string) => {
      if (id !== 'fee-old') throw new Error('Fee not found');
      return { id, academicYear: oldYear.label };
    } } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
  return { service, calls };
}

describe('explicit all-year outstanding fees', () => {
  it('reads every year and keeps only students who still owe', async () => {
    const reads: string[] = [];
    const service = new FeeService(
      { getAllYears: async () => {
        reads.push('all-years');
        return [
          { student: { id: 's1' }, totalDue: '120.00' },
          { student: { id: 's2' }, totalDue: '0.00' },
          { student: { id: 's3' }, totalDue: null },
        ];
      } } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    expect((await service.getOutstanding()).map((row: any) => row.student.id)).toEqual(['s1']);
    expect(reads).toEqual(['all-years']);
  });
});

describe('normal fee list year scope', () => {
  it('validates the requested year and lists the fees of the resolved year', async () => {
    const { service, calls } = serviceHarness();
    expect(await service.getAll()).toHaveLength(1);
    expect(calls).toEqual(['selected']);
  });

  it('does not return a fee under a different selected year', async () => {
    const { service } = serviceHarness();
    await expect(service.getById('missing')).rejects.toThrow();
    expect((await service.getById('fee-old'))?.id).toBe('fee-old');
  });

  it("reads one student's fees of the year, and every year only through the named read", async () => {
    const { service, calls } = serviceHarness();
    expect((await service.getByStudent('student-1'))?.fees).toEqual([]);
    await service.getByStudentAllYears('student-1');
    expect(calls).toEqual(['student:student-1', 'student-all-years']);
  });

  it('names each fee\'s year in the all-year list so the dashboard can keep active-year students', async () => {
    let statement = '';
    const repo = new FeeRepository();
    (repo as any).year = oldYear;
    repo.db = drizzle(async (sql) => {
      statement = sql;
      return { rows: [] };
    }) as any;

    await repo.getAllYears();
    expect(statement).toContain(`'academicYear', "fees"."academic_year"`);
  });

  it('keeps fees without enrollment while selecting one dated placement before sums', async () => {
    let statement = '';
    let values: unknown[] = [];
    const repo = new FeeRepository();
    (repo as any).year = oldYear;
    repo.db = drizzle(async (sql, params) => {
      statement = sql;
      values = params;
      return { rows: [] };
    }) as any;

    await repo.getAll();
    expect(statement.toLowerCase()).toContain('distinct on');
    expect(statement).toContain('fee_year_last_placement');
    expect(statement.toLowerCase()).toContain('filter (where');
    expect(statement.toLowerCase()).toContain('student_enrollments');
    expect(statement.toLowerCase()).toContain('fees');
    expect(statement.toLowerCase()).toContain('payment_allocations');
    expect(statement.toLowerCase()).toContain('completed');
    expect(values).toContain('year-old');
    expect(values).toContain('2025-2026');
  });

  it('keeps per-student metrics on the selected fee year and allocated receipt portions', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new FeeRepository();
    (repo as any).year = oldYear;
    (repo as any).getAll = async () => [{
      student: { id: 'student-1', name: 'Student', studentCode: 'S1', image: null },
      class: { id: 'old-class', name: 'Old Class' },
      section: { id: 'old-section', name: 'Old Section' },
      enrollmentId: 'enrollment-old', placementId: 'placement-old',
      totalFees: 0, netAmount: '0', totalPaid: '0', totalDiscount: '0', totalDue: '0',
      paidCount: 0, pendingCount: 0, overdueCount: 0,
    }];
    repo.db = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      return { rows: sql.includes('year_receipt_allocations') ? [['0', '0', '0', null]] : [] };
    }) as any;

    const result = await repo.getByStudent('student-1');
    expect(result?.academicYear).toBe('2025-2026');
    expect(result?.assignment.class.id).toBe('old-class');
    expect(result?.fees).toEqual([]);
    expect(result?.summary.avgPaymentAmount).toBe('0');
    expect(statements).toHaveLength(2);
    const metrics = statements.find((item) => item.sql.includes('year_receipt_allocations'));
    const feeRows = statements.find((item) => !item.sql.includes('year_receipt_allocations'));
    expect(metrics?.sql.toLowerCase()).toContain('sum(');
    expect(metrics?.sql.toLowerCase()).toContain('payment_allocations');
    expect(metrics?.params).toContain('2025-2026');
    expect(feeRows?.params).toContain('2025-2026');
    expect(feeRows?.params).toContain('student-1');
  });
});
