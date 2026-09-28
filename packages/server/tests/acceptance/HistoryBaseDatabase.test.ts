import { afterAll, describe, expect, it } from 'bun:test';
import postgres from 'postgres';
import {
  historyEnrollments, historyFixtureExpected, historyStudents, historyYears,
} from '../academicYears/fixtures/alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required for the real PostgreSQL fixture gate');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') {
  throw new Error('The history database gate requires local school_history_test');
}

const connection = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
afterAll(async () => connection.end());

describe('real PostgreSQL academic history base fixture', () => {
  it('is the marked three-year, ten-student database with the correct active pointer', async () => {
    const [identity] = await connection<{
      database: string; marker: string; students: number; years: number;
      activeYearId: string; activeLabel: string;
    }[]>`
      select current_database() as database,
             (select id from school_history_fixture_marker) as marker,
             (select count(*)::int from students) as students,
             (select count(*)::int from academic_years) as years,
             (select active_academic_year_id from settings) as "activeYearId",
             (select current_academic_year from settings) as "activeLabel"
    `;
    expect(identity).toEqual({
      database: 'school_history_test', marker: 'academic-history-alerts-v1',
      students: historyFixtureExpected.studentIdentities, years: historyYears.length,
      activeYearId: historyYears[2].id, activeLabel: historyYears[2].label,
    });
    const storedIds = await connection<{ id: string }[]>`select id from students order by id`;
    expect(storedIds.map((row) => row.id)).toEqual(historyStudents.map((row) => row.id));
  });

  it('stores 7/8/8 annual memberships and the midyear section transfer', async () => {
    const memberships = await connection<{ label: string; count: number }[]>`
      select y.label, count(*)::int as count
      from student_enrollments e join academic_years y on y.id = e.academic_year_id
      group by y.label order by y.label
    `;
    expect(Object.fromEntries(memberships.map((row) => [row.label, row.count])))
      .toEqual(historyFixtureExpected.enrollmentsByYear);
    const transferId = historyEnrollments.find((row) => row.studentId === 'history-student-05'
      && row.label === '2025-2026')!.id;
    const placements = await connection<{
      sectionId: string; validFrom: string; validTo: string | null;
    }[]>`
      select section_id as "sectionId", valid_from::text as "validFrom",
             valid_to::text as "validTo"
      from student_enrollment_placements
      where enrollment_id = ${transferId} order by valid_from
    `;
    expect([...placements]).toEqual([
      { sectionId: 'history-section-2025-a', validFrom: '2025-09-01', validTo: '2026-01-15' },
      { sectionId: 'history-section-2025-b', validFrom: '2026-01-15', validTo: null },
    ]);
  });

  it('keeps Aya fee-only in 2025-2026', async () => {
    const [record] = await connection<{ feeYear: string; enrollmentCount: number }[]>`
      select (select academic_year from fees where id = 'history-fee-2025-aya') as "feeYear",
             (select count(*)::int from student_enrollments
              where student_id = 'history-student-08'
                and academic_year_id = 'history-year-2025') as "enrollmentCount"
    `;
    expect(record).toEqual({ feeYear: '2025-2026', enrollmentCount: 0 });
  });
});
