import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { Container } from 'diject';
import { PaymentService } from '../../src/modules/financial/payments/PaymentService';
import { PaymentRepository } from '../../src/modules/financial/payments/PaymentRepository';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';
import type { ResolvedAcademicYear } from '../../src/modules/academicYears/AcademicYearValidator';

function service(repository: Record<string, unknown>) {
  return new PaymentService(
    repository as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
}

describe('normal payment list year scope', () => {
  it('uses the repository context without a service year parameter', async () => {
    const calls: unknown[] = [];
    const payments = service({ getAll: async () => { calls.push('called'); return []; } });
    await payments.getAll();
    expect(calls).toEqual(['called']);
  });
});

describe('fee-year receipt query', () => {
  it('returns each receipt once with the exact portion allocated to that year', async () => {
    let captured = { sql: '', params: [] as unknown[] };
    const container = Container.create();
    registerYearPropertyInjector(container);
    container.set(PaymentRepository);
    const repo: any = await container.resolve(PaymentRepository);
    repo.db = drizzle(async (sql, params) => { captured = { sql, params }; return { rows: [] }; });
    await expect(repo.getAll()).rejects.toThrow('Resolved academic year is missing');
    await runWithResolvedYear(container, { id: 'year-old', label: '2025-2026' } as ResolvedAcademicYear,
      () => repo.getAll());

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
