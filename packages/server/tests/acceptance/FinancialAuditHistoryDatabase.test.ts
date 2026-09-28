import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { registerYearPropertyInjector, runWithResolvedYear } from '../../src/modules/academicYears/requestYear';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;

const { db } = await import('../../src/database/db');
const { academicYears } = await import('../../src/modules/academicYears/AcademicYearSchema');
const { financialAuditLogs } = await import('../../src/modules/financial/auditLog/auditLogSchema');
const { AuditLogRepository } = await import('../../src/modules/financial/auditLog/AuditLogRepository');
const rollback = Symbol('rollback');

describe('financial audit retains all years on the marked PostgreSQL fixture', () => {
  it('keeps list, count, detail, and filters independent of the selected year', async () => {
    try {
      await db.transaction(async (transaction) => {
        const tx = transaction as unknown as typeof db;
        const before = await tx.select({ id: financialAuditLogs.id }).from(financialAuditLogs);
        const [oldRow, newRow] = await tx.insert(financialAuditLogs).values([
          { entityType: 'fee', entityId: 'history-audit-old', action: 'history.audit.old',
            before: { academicYear: '2025-2026' }, after: { academicYear: '2025-2026' } },
          { entityType: 'fee', entityId: 'history-audit-new', action: 'history.audit.new',
            before: { academicYear: '2026-2027' }, after: { academicYear: '2026-2027' } },
        ]).returning();
        const container = Container.create();
        registerYearPropertyInjector(container);
        container.set(AuditLogRepository);
        const repository = await container.resolve(AuditLogRepository);
        repository.db = tx;
        const years = await tx.select().from(academicYears);
        const ids = (rows: Array<{ id: string }>) => rows.map((row) => row.id);
        for (const yearId of ['history-year-2025', 'history-year-2026']) {
          const year = years.find((item) => item.id === yearId)!;
          await runWithResolvedYear(container, year, async () => {
            const rows = await repository.list({ entityType: 'fee', limit: 500 });
            expect(ids(rows)).toContain(oldRow.id);
            expect(ids(rows)).toContain(newRow.id);
            expect(await repository.getById(oldRow.id)).toMatchObject({
              id: oldRow.id, after: { academicYear: '2025-2026' },
            });
            expect(await repository.getById(newRow.id)).toMatchObject({
              id: newRow.id, after: { academicYear: '2026-2027' },
            });
            expect((await repository.list({ action: 'history.audit.old' })).map((row) => row.id))
              .toEqual([oldRow.id]);
            expect(await repository.count({ action: 'history.audit.old' })).toBe(1);
          });
        }
        const after = await tx.select({ id: financialAuditLogs.id }).from(financialAuditLogs);
        expect(after).toHaveLength(before.length + 2);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  });
});
