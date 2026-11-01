import { describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { FeeRepository } from '../../src/modules/financial/fees/FeeRepository';
import { feePaymentDatesQueryDto, listFeesQueryDto } from '../../src/modules/financial/fees/FeeDto';

const dates = { dateFrom: '2026-11-01', dateTo: '2026-11-30' };

function repository() {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  const repo = new FeeRepository();
  (repo as any).year = { id: 'year-2026', label: '2026-2027' };
  repo.db = drizzle(async (sql, params) => {
    statements.push({ sql, params });
    return { rows: [] };
  }) as any;
  return { repo, statements };
}

describe('fee payment date range', () => {
  it('accepts inclusive same-day and open-ended ranges for REST and MCP', () => {
    for (const schema of [feePaymentDatesQueryDto, listFeesQueryDto]) {
      for (const value of [{}, dates, { dateFrom: dates.dateFrom }, { dateTo: dates.dateTo }, { dateFrom: dates.dateFrom, dateTo: dates.dateFrom }]) {
        expect(schema.parse(value)).toEqual(value);
      }
      for (const value of [{ dateFrom: '2026-02-30' }, { dateTo: 'not a date' }, { dateFrom: '' }, { dateFrom: dates.dateTo, dateTo: dates.dateFrom }]) {
        expect(schema.safeParse(value).success).toBe(false);
      }
    }
  });

  it('selects matching students without dropping their other fees or multiplying allocations', async () => {
    const { repo, statements } = repository();
    await repo.getAll(undefined, 'monthly', { ...dates, classId: 'cp', sectionId: 'a' });
    const { sql, params } = statements[0];
    const [totals, having] = sql.split(' having ');
    expect(totals.toLowerCase()).toContain('sum("fees"."net_amount"::numeric)');
    expect(totals).not.toContain('"payments"."payment_date" >=');
    expect(totals).not.toContain('"payments"."payment_date" <=');
    expect(having).toContain('bool_or(exists(');
    expect(having).toContain('"payment_allocations"."fee_id" = "fees"."id"');
    expect(having).toContain('"payments"."payment_date" >=');
    expect(having).toContain('"payments"."payment_date" <=');
    expect(having).toContain("\"payments\".\"status\" = 'completed'");
    expect(having).toContain('coalesce("payments"."settled_date", "payments"."payment_date") <=');
    for (const value of ['2026-2027', 'year-2026', 'monthly', 'cp', 'a', ...Object.values(dates)]) expect(params).toContain(value);
    await repo.getAll();
    expect(statements[1].sql).not.toContain(' having ');
  });

  it('filters collection totals by payment date while overdue debt uses all collected payments', async () => {
    const { repo, statements } = repository();
    await repo.getSummary(dates);
    const { sql, params } = statements[0];
    const allocations = sql.slice(0, sql.indexOf('"fee_summary_collected" as'));
    const collected = sql.slice(sql.indexOf('"fee_summary_collected" as'), sql.indexOf('"fee_summary_paid_installments" as'));
    const debt = sql.slice(sql.indexOf('"fee_summary_paid_installments" as'));
    expect(allocations).toContain('"fees"."academic_year" =');
    expect(allocations).not.toContain('"payment_date" >=');
    expect(allocations).not.toContain('"payment_date" <=');
    expect(collected).toContain('"fee_summary_allocations"."payment_date" >=');
    expect(collected).toContain('"fee_summary_allocations"."payment_date" <=');
    expect(debt).toContain('from "fee_summary_allocations"');
    expect(debt).not.toContain('"payment_date" >=');
    expect(debt).not.toContain('"payment_date" <=');
    expect(params).toContain('2026-2027');
    expect(params).toContain(dates.dateFrom);
    expect(params).toContain(dates.dateTo);
  });
});
