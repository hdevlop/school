import { describe, expect, it } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import type { DB } from '../../src/database/db';
import { StudentRepository } from '../../src/modules/students/StudentRepository';
import { StudentService } from '../../src/modules/students/StudentService';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { withEnglishMessages } from '../support/englishMessages';

const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(url);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') {
  throw new Error('Expected local school_history_test');
}
type TestTransaction = Parameters<Parameters<DB['transaction']>[0]>[0];

async function withDatabase<T>(run: (tx: TestTransaction) => Promise<T>) {
  const client = postgres(url!, { max: 1, prepare: false, onnotice: () => {} });
  try { return await drizzle(client).transaction(run); }
  finally { await client.end({ timeout: 1 }); }
}

function serviceFor(tx: TestTransaction) {
  const repo = new StudentRepository();
  repo.db = tx as unknown as DB;
  Object.defineProperty(repo, 'ownedWhere', { value: () => undefined });
  const validator = withEnglishMessages(new StudentValidator(repo, {} as any, {} as any, {} as any, {} as any));
  const service = new StudentService(repo, validator, {} as any, {} as any, {} as any,
    {} as any, {} as any, {} as any, { delete: async () => {} } as any);
  Object.assign(service, { transactions: { afterCommit: async () => {} } });
  return service;
}

// All mutations use connection-local temporary tables, dropped on commit.
// Copy only the real student column shape so RETURNING exercises the actual query.
async function setup(tx: TestTransaction) {
  await tx.execute(sql.raw(`
    CREATE TEMP TABLE users (id text PRIMARY KEY, email text, image text) ON COMMIT DROP;
    CREATE TEMP TABLE students ON COMMIT DROP AS SELECT * FROM public.students WITH NO DATA;
    ALTER TABLE students ADD PRIMARY KEY (id);
    ALTER TABLE students ADD FOREIGN KEY (user_id) REFERENCES pg_temp.users(id);
    CREATE TEMP TABLE tokens (id text PRIMARY KEY, user_id text REFERENCES pg_temp.users(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE student_enrollments (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE RESTRICT, academic_year_id text) ON COMMIT DROP;
    CREATE TEMP TABLE student_enrollment_placements (id text PRIMARY KEY, enrollment_id text REFERENCES pg_temp.student_enrollments(id) ON DELETE RESTRICT) ON COMMIT DROP;
    CREATE TEMP TABLE attendance (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE RESTRICT) ON COMMIT DROP;
    CREATE TEMP TABLE attendance_history (id text PRIMARY KEY, attendance_id text REFERENCES pg_temp.attendance(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE discipline_incidents (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE RESTRICT) ON COMMIT DROP;
    CREATE TEMP TABLE behavior_rewards (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE RESTRICT) ON COMMIT DROP;
    CREATE TEMP TABLE grades (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE student_routes (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE parents (id text PRIMARY KEY) ON COMMIT DROP;
    CREATE TEMP TABLE student_parents (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE, parent_id text REFERENCES pg_temp.parents(id)) ON COMMIT DROP;
    CREATE TEMP TABLE fees (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE, paid_amount numeric DEFAULT 0) ON COMMIT DROP;
    CREATE TEMP TABLE fee_installments (id text PRIMARY KEY, fee_id text REFERENCES pg_temp.fees(id) ON DELETE CASCADE, paid_amount numeric DEFAULT 0) ON COMMIT DROP;
    CREATE TEMP TABLE payments (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE payment_allocations (id text PRIMARY KEY, fee_id text REFERENCES pg_temp.fees(id) ON DELETE CASCADE) ON COMMIT DROP;
    CREATE TEMP TABLE student_credit_lots (id text PRIMARY KEY, student_id text REFERENCES pg_temp.students(id) ON DELETE CASCADE) ON COMMIT DROP;
    INSERT INTO users (id) VALUES ('target-user'), ('neighbor-user');
    INSERT INTO students (id, user_id, student_code, name, enrollment_date) VALUES
      ('target', 'target-user', 'target', 'Target', '2025-09-01'),
      ('neighbor', 'neighbor-user', 'neighbor', 'Neighbor', '2025-09-01');
    INSERT INTO tokens VALUES ('target-token', 'target-user'), ('neighbor-token', 'neighbor-user');
    INSERT INTO parents VALUES ('shared-parent');
    INSERT INTO student_parents VALUES ('target-link', 'target', 'shared-parent'), ('neighbor-link', 'neighbor', 'shared-parent');
    INSERT INTO student_enrollments VALUES ('old', 'target', 'old-year'), ('current', 'target', 'current-year'), ('neighbor-enrollment', 'neighbor', 'current-year');
    INSERT INTO student_enrollment_placements VALUES ('old-place', 'old'), ('current-place', 'current'), ('neighbor-place', 'neighbor-enrollment');
    INSERT INTO attendance VALUES ('target-attendance', 'target'), ('neighbor-attendance', 'neighbor');
    INSERT INTO attendance_history VALUES ('target-history', 'target-attendance'), ('neighbor-history', 'neighbor-attendance');
    INSERT INTO discipline_incidents VALUES ('target-incident', 'target'), ('neighbor-incident', 'neighbor');
    INSERT INTO behavior_rewards VALUES ('target-reward', 'target'), ('neighbor-reward', 'neighbor');
    INSERT INTO grades VALUES ('target-grade', 'target'), ('neighbor-grade', 'neighbor');
    INSERT INTO student_routes VALUES ('target-route', 'target'), ('neighbor-route', 'neighbor');
    INSERT INTO fees (id, student_id) VALUES ('target-fee', 'target'), ('neighbor-fee', 'neighbor');
    INSERT INTO fee_installments (id, fee_id) VALUES ('target-installment', 'target-fee'), ('neighbor-installment', 'neighbor-fee');
  `));
}

describe('student deletion on isolated PostgreSQL temporary tables', () => {
  it('deletes all years and dependent records, retaining the shared parent and unrelated student', async () => {
    await withDatabase(async (tx) => {
      await setup(tx);
      expect((await serviceFor(tx).delete('target')).id).toBe('target');
      for (const table of ['students', 'users', 'tokens', 'student_enrollments', 'student_enrollment_placements',
        'attendance', 'attendance_history', 'discipline_incidents', 'behavior_rewards', 'grades',
        'student_routes', 'student_parents', 'fees', 'fee_installments']) {
        const rows = await tx.execute(sql`SELECT id FROM ${sql.identifier(table)}`);
        expect(rows.map((row) => row.id)).toHaveLength(1);
        expect(rows[0].id).toContain('neighbor');
      }
      expect(Array.from(await tx.execute(sql`SELECT id FROM parents`))).toEqual([{ id: 'shared-parent' }]);
    });
  });

  for (const financial of ['payment', 'credit', 'allocation', 'paid-fee', 'paid-installment']) {
    it(`refuses a student with ${financial} history without deleting their academic records`, async () => {
      await withDatabase(async (tx) => {
        await setup(tx);
        if (financial === 'payment') await tx.execute(sql`INSERT INTO payments VALUES ('receipt', 'target')`);
        if (financial === 'credit') await tx.execute(sql`INSERT INTO student_credit_lots VALUES ('credit', 'target')`);
        if (financial === 'allocation') await tx.execute(sql`INSERT INTO payment_allocations VALUES ('allocation', 'target-fee')`);
        if (financial === 'paid-fee') await tx.execute(sql`UPDATE fees SET paid_amount = 1 WHERE id = 'target-fee'`);
        if (financial === 'paid-installment') await tx.execute(sql`UPDATE fee_installments SET paid_amount = 1 WHERE id = 'target-installment'`);
        let refusal: Error | undefined;
        try { await serviceFor(tx).delete('target'); }
        catch (error) { refusal = error as Error; }
        expect(refusal?.message).toContain('payment or credit history');
        expect(await tx.execute(sql`SELECT id FROM student_enrollments WHERE student_id = 'target'`)).toHaveLength(2);
        expect(await tx.execute(sql`SELECT id FROM attendance WHERE student_id = 'target'`)).toHaveLength(1);
        expect(await tx.execute(sql`SELECT id FROM users WHERE id = 'target-user'`)).toHaveLength(1);
      });
    });
  }

  it('rolls back the entire cleanup when deleting the linked user fails', async () => {
    await withDatabase(async (tx) => {
      await setup(tx);
      await tx.execute(sql.raw(`CREATE FUNCTION pg_temp.refuse_delete() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'injected user deletion failure'; END $$;
        CREATE TRIGGER refuse_delete BEFORE DELETE ON pg_temp.users FOR EACH ROW EXECUTE FUNCTION pg_temp.refuse_delete();`));
      let failure: Error | undefined;
      try { await tx.transaction(async (nested) => serviceFor(nested).delete('target')); }
      catch (error) { failure = error as Error; }
      expect((failure?.cause as Error)?.message).toContain('injected user deletion failure');
      expect(await tx.execute(sql`SELECT id FROM students WHERE id = 'target'`)).toHaveLength(1);
      expect(await tx.execute(sql`SELECT id FROM student_enrollments WHERE student_id = 'target'`)).toHaveLength(2);
      expect(await tx.execute(sql`SELECT id FROM student_enrollment_placements WHERE enrollment_id IN ('old', 'current')`)).toHaveLength(2);
      expect(await tx.execute(sql`SELECT id FROM attendance WHERE student_id = 'target'`)).toHaveLength(1);
      expect(await tx.execute(sql`SELECT id FROM fees WHERE student_id = 'target'`)).toHaveLength(1);
      expect(await tx.execute(sql`SELECT id FROM users WHERE id = 'target-user'`)).toHaveLength(1);
    });
  });
});
