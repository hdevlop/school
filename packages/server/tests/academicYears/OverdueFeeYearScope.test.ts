import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FeeService } from '../../src/modules/financial/fees/FeeService';
import { FeeRepository } from '../../src/modules/financial/fees/FeeRepository';
import { feeListQuery, overdueStudentBody } from '../../src/modules/financial/fees/FeeDto';

describe('overdue fee year scope', () => {
  it('reads overdue data of the resolved year only', async () => {
    expect(feeListQuery.safeParse({ academicYear: 'all' }).success).toBe(false);
    expect(overdueStudentBody.safeParse({ studentId: 's1' }).success).toBe(true);
    const calls: string[] = [];
    const service = new FeeService(
      {
        getOverdue: async (yearId: string, label: string) => { calls.push(`list:${yearId}:${label}`); return []; },
        getOverdueSummary: async (label: string) => { calls.push(`summary:${label}`); return {}; },
        getOverdueByStudent: async (studentId: string, label: string) => { calls.push(`student:${studentId}:${label}`); return []; },
      } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    const year = { id: 'year-old', label: '2025-2026' } as any;
    await service.getOverdue(year);
    await service.getOverdueSummary(year);
    await service.getOverdueByStudent('s1', year);
    expect(calls).toEqual(['list:year-old:2025-2026', 'summary:2025-2026', 'student:s1:2025-2026']);
  });

  it('filters fee rows by stored year without joining current class', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new FeeRepository();
    repo.db = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [] };
    }) as any;

    expect(await repo.getOverdue('year-old', '2025-2026')).toEqual([]);
    expect(statements).toHaveLength(1);
    const query = statements[0];
    expect(query.params).toContain('2025-2026');
    expect(query.sql).toContain('payment_allocations');
    expect(query.sql).toContain('completed');
    expect(query.sql).toContain("NOT IN ('paid', 'cancelled')");
    expect(query.sql).not.toContain('student_enrollment_placements');
    expect(query.sql).not.toContain('"students"."class_id"');
  });

  it('selects the placement covering the fee date and leaves undated fees unassigned', async () => {
    const statements: string[] = [];
    const repo = new FeeRepository();
    const feeRow = (id: string, effectiveDate: string | null) => [
      id, 'student-1', 'type-1', 'oneTime', '2025-2026', effectiveDate,
      '100.00', '100.00', '100.00', '25.00', '0.00', 'overdue', null,
      new Date('2025-09-01'), new Date('2025-09-01'),
      'student-1', 'Student', 'S1', null,
      'type-1', 'Tuition', 'tuition', '100.00', 1,
    ];
    repo.db = drizzle(async (sql) => {
      statements.push(sql);
      return { rows: sql.includes('student_enrollment_placements') ? [
        ['student-1', 'new-class', 'New', 'new-section', 'B', '2026-01-01', null],
        ['student-1', 'old-class', 'Old', 'old-section', 'A', '2025-09-01', '2026-01-01'],
      ] : [feeRow('fee-dated', '2025-10-01'), feeRow('fee-undated', null)] };
    }) as any;

    const rows = await repo.getOverdue('year-old', '2025-2026');
    expect(rows).toHaveLength(2);
    expect(rows[0].class.id).toBe('old-class');
    expect(rows[0].section.id).toBe('old-section');
    expect(rows[1].class.id).toBeNull();
    expect(rows[1].section.id).toBeNull();
    expect(statements).toHaveLength(2);
    expect(statements[1]).toContain('student_enrollments');
  });

  it('uses completed allocations for the selected-year overdue amount', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new FeeRepository();
    repo.db = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [['2', '120.50', '1']] };
    }) as any;

    const summary = await repo.getOverdueSummary('2025-2026');
    expect(summary).toEqual({ overdueCount: 2, overdueAmount: '120.50', affectedStudents: 1 });
    expect(statements[0].params).toContain('2025-2026');
    expect(statements[0].sql).toContain('payment_allocations');
    expect(statements[0].sql).toContain('completed');
    expect(statements[0].sql).toContain("NOT IN ('paid', 'cancelled')");
    expect(statements[0].sql).toContain('"payment_allocations"."payment_id" = "payments"."id"');
    expect(statements[0].sql).toContain('"payment_allocations"."fee_id" = "fees"."id"');
    expect(statements[0].sql).toContain('"fee_installments"."fee_id" = "fees"."id"');
  });

  it('scopes the overdue student tool by fee year and completed payment status', async () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const repo = new FeeRepository();
    repo.db = drizzle(async (sql, params) => {
      statements.push({ sql, params });
      return { rows: [] };
    }) as any;
    await repo.getOverdueByStudent('student-1', '2025-2026');
    expect(statements[0].params).toContain('student-1');
    expect(statements[0].params).toContain('2025-2026');
    expect(statements[0].sql).toContain('payment_allocations');
    expect(statements[0].sql).toContain('completed');
    expect(statements[0].sql).toContain("NOT IN ('paid', 'cancelled')");
  });
});
