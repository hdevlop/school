import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { PaymentService } from '../../src/modules/financial/payments/PaymentService';
import { PaymentRepository } from '../../src/modules/financial/payments/PaymentRepository';
import { paymentListQuery } from '../../src/modules/financial/payments/PaymentDto';

function service(repository: Record<string, unknown>) {
  return new PaymentService(
    repository as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
}

describe('payment list year query', () => {
  it('accepts only a school-year label', () => {
    expect(paymentListQuery.parse({})).toEqual({});
    expect(paymentListQuery.parse({ academicYear: '2025-2026' })).toEqual({ academicYear: '2025-2026' });
    expect(() => paymentListQuery.parse({ academicYear: '2025-2027' })).toThrow();
    expect(() => paymentListQuery.parse({ academicYear: 'all' })).toThrow();
  });
});

describe('normal payment list year scope', () => {
  it('lists receipts allocated to fees of the resolved year', async () => {
    const calls: unknown[] = [];
    const payments = service({ getAll: async (label: string) => { calls.push(label); return []; } });
    await payments.getAll({ id: 'year-old', label: '2025-2026' } as any);
    expect(calls).toEqual(['2025-2026']);
  });
});

describe('fee-year receipt query', () => {
  it('returns each receipt once with the exact portion allocated to that year', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const repo: any = new PaymentRepository();
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    await repo.getAll('2025-2026');

    const { sql, params } = captured;
    // Allocations are summed per receipt in a subquery, so a receipt split
    // across several of the year's fees still appears once.
    expect(sql).toContain('inner join (select "payment_allocations"."payment_id", sum("payment_allocations"."amount")::text as "year_allocated_amount" from "payment_allocations" inner join "fees" on "payment_allocations"."fee_id" = "fees"."id" where "fees"."academic_year" = $1 group by "payment_allocations"."payment_id") "year_allocations"');
    expect(sql).toContain('"year_allocations"."payment_id" = "payments"."id"');
    expect(sql).toContain('"payments"."amount"');
    expect(sql).toContain('"year_allocated_amount"');
    expect(sql).toContain('order by "payments"."payment_date" desc');
    expect(params).toEqual(['2025-2026']);
  });
});
