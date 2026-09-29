import { describe, expect, it } from 'bun:test';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');
process.env.DB_URL = rawUrl;
process.env.APP_BUSINESS_DATE = '2026-09-27';

const { asc, eq } = await import('drizzle-orm');
const { db } = await import('../../src/database/db');
const { attendance, cleanerAssignments, staff, zones } = await import('../../src/database/schema');
const { StaffAssignmentRepository } = await import('../../src/modules/staff/StaffAssignmentRepository');
const { StaffRepository } = await import('../../src/modules/staff/StaffRepository');
const { ZoneRepository } = await import('../../src/modules/staff/zones/ZoneRepository');
const rollback = Symbol('rollback');
const TODAY = '2026-09-27';
type Tx = typeof db;

function repositories(tx: Tx) {
  const assignments = new StaffAssignmentRepository();
  const people = new StaffRepository();
  const places = new ZoneRepository();
  for (const repo of [assignments, people, places]) repo.db = tx;
  return { assignments, people, places };
}

async function inRollback(run: (tx: Tx) => Promise<void>) {
  try {
    await db.transaction(async (transaction) => {
      await run(transaction as unknown as Tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function cleanerWithHistory(tx: Tx) {
  await tx.insert(zones).values([
    { id: 'history-zone-hall', name: 'History hall' },
    { id: 'history-zone-yard', name: 'History yard' },
    { id: 'history-zone-free', name: 'History free zone' },
  ]);
  await tx.insert(staff).values({ id: 'history-cleaner', employeeCode: 'H-CLEAN', name: 'History cleaner',
    role: 'cleaner', hireDate: '2024-09-01' });
  await tx.insert(cleanerAssignments).values([
    { id: 'history-clean-2024', staffId: 'history-cleaner', zoneId: 'history-zone-hall', status: 'completed',
      startDate: '2024-09-01', endDate: '2025-06-30', notes: '2024-2025 hall' },
    { id: 'history-clean-now', staffId: 'history-cleaner', zoneId: 'history-zone-hall', status: 'active',
      startDate: '2025-09-01', notes: 'hall since 2025' },
  ]);
}

async function rows(tx: Tx) {
  return (await tx.select().from(cleanerAssignments).where(eq(cleanerAssignments.staffId, 'history-cleaner'))
    .orderBy(asc(cleanerAssignments.startDate), asc(cleanerAssignments.id)))
    .map((row) => [row.id.startsWith('history-') ? row.id : 'new', row.zoneId, row.status, row.startDate, row.endDate, row.notes]);
}

describe('staff assignments on the marked PostgreSQL fixture', () => {
  it('clears role links across years before their staff and zone, then rolls back', async () => {
    await inRollback(async (tx) => {
      const { assignments } = repositories(tx);
      await cleanerWithHistory(tx);
      expect(await rows(tx)).toHaveLength(2);

      await assignments.clearForSeedReset();

      expect(await rows(tx)).toEqual([]);
      expect((await tx.select({ id: staff.id }).from(staff).where(eq(staff.id, 'history-cleaner'))).length)
        .toBe(1);
      expect((await tx.select({ id: zones.id }).from(zones).where(eq(zones.id, 'history-zone-hall'))).length)
        .toBe(1);
      await tx.delete(staff).where(eq(staff.id, 'history-cleaner'));
      await tx.delete(zones).where(eq(zones.id, 'history-zone-hall'));
    });
  });

  // An edit deleted every year's rows and inserted the request again.
  it('makes a request the current assignments and keeps every ended one', async () => {
    await inRollback(async (tx) => {
      const { assignments } = repositories(tx);
      await cleanerWithHistory(tx);

      // The form sends the current row back unchanged: nothing moves.
      await assignments.syncCurrentForRole('cleaner', 'history-cleaner',
        [{ zoneId: 'history-zone-hall', status: 'active', startDate: '2025-09-01', notes: 'hall since 2025' }], TODAY);
      expect(await rows(tx)).toEqual([
        ['history-clean-2024', 'history-zone-hall', 'completed', '2024-09-01', '2025-06-30', '2024-2025 hall'],
        ['history-clean-now', 'history-zone-hall', 'active', '2025-09-01', null, 'hall since 2025'],
      ]);

      // Moving to the yard ends the hall today and starts the yard today.
      await assignments.syncCurrentForRole('cleaner', 'history-cleaner', [{ zoneId: 'history-zone-yard' }], TODAY);
      expect(await rows(tx)).toEqual([
        ['history-clean-2024', 'history-zone-hall', 'completed', '2024-09-01', '2025-06-30', '2024-2025 hall'],
        ['history-clean-now', 'history-zone-hall', 'completed', '2025-09-01', TODAY, 'hall since 2025'],
        ['new', 'history-zone-yard', 'active', TODAY, null, null],
      ]);

      // A correction of the current row changes it in place.
      await assignments.syncCurrentForRole('cleaner', 'history-cleaner',
        [{ zoneId: 'history-zone-yard', startDate: '2026-09-20', notes: 'yard' }], TODAY);
      expect((await rows(tx)).at(-1)).toEqual(['new', 'history-zone-yard', 'active', '2026-09-20', null, 'yard']);
      expect((await rows(tx)).length).toBe(3);

      // A role change ends what is current and keeps the rest.
      await assignments.endCurrentForRole('cleaner', 'history-cleaner', TODAY);
      expect((await rows(tx)).map((row) => row[2])).toEqual(['completed', 'completed', 'completed']);
    });
  });

  it('drops a future assignment the request leaves out: it never began', async () => {
    await inRollback(async (tx) => {
      const { assignments } = repositories(tx);
      await cleanerWithHistory(tx);
      await tx.insert(cleanerAssignments).values({ id: 'history-clean-next', staffId: 'history-cleaner',
        zoneId: 'history-zone-yard', status: 'active', startDate: '2026-10-01' });
      await assignments.syncCurrentForRole('cleaner', 'history-cleaner',
        [{ zoneId: 'history-zone-hall', startDate: '2025-09-01' }], TODAY);
      expect((await rows(tx)).map((row) => row[0])).toEqual(['history-clean-2024', 'history-clean-now']);
    });
  });

  it('marks which assignments hold today and counts what a delete would lose', async () => {
    await inRollback(async (tx) => {
      const { people, places } = repositories(tx);
      await cleanerWithHistory(tx);
      const member = await people.getById('history-cleaner') as unknown as { assignments: Array<{ id: string; current: boolean }> } | null;
      expect(member?.assignments.map((row) => [row.id, row.current]).sort())
        .toEqual([['history-clean-2024', false], ['history-clean-now', true]]);

      expect(await people.countRecordedHistory('history-cleaner'))
        .toEqual({ payslips: 0, attendance: 0, duties: 0, vehicleAssignments: 0 });
      await tx.insert(attendance).values({ id: 'history-staff-mark', type: 'staff', staffId: 'history-cleaner',
        date: '2025-10-01', status: 'present', academicYearId: 'history-year-2025' });
      expect((await people.countRecordedHistory('history-cleaner')).attendance).toBe(1);

      expect(await places.countAssignments('history-zone-hall')).toBe(2);
      expect(await places.countAssignments('history-zone-free')).toBe(0);
    });
  });
});
