#!/usr/bin/env bun

/**
 * Dedicated PostgreSQL acceptance fixture. Run only after visual review and
 * migrations, with SCHOOL_HISTORY_TEST_DB_URL pointing at school_history_test.
 * This stage seeds the shared ten-student baseline. Alert cases follow the
 * reviewed Alert year-column migration and MCP scope gate.
 */
import postgres from 'postgres';
import {
  historyClasses,
  historyEnrollments,
  historyFixtureExpected,
  historyStudents,
  historyYears,
} from './alertsHistoryManifest';

const fixtureId = 'academic-history-alerts-v1';
const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') {
  throw new Error('Fixture target must be a local PostgreSQL database named school_history_test');
}
if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error('Expected a PostgreSQL URL');

const adminPassword = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
const principalPassword = process.env.SCHOOL_HISTORY_PRINCIPAL_PASSWORD;
if (!adminPassword || !principalPassword) {
  throw new Error('SCHOOL_HISTORY_ADMIN_PASSWORD and SCHOOL_HISTORY_PRINCIPAL_PASSWORD are required');
}

const connection = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
try {
  await connection.begin(async (transaction) => {
    // postgres.TransactionSql omits Sql's callable tag signatures in its
    // declaration, although the transaction is a callable SQL tag at runtime.
    const tx = transaction as unknown as typeof connection;
    const [{ database }] = await tx<{ database: string }[]>`select current_database() as database`;
    if (database !== 'school_history_test') throw new Error('Connected to a different database');

    // The marker is created only on a fully empty, migrated fixture database.
    const [{ markerTable }] = await tx<{ markerTable: string | null }[]>`
      select to_regclass('public.school_history_fixture_marker')::text as "markerTable"
    `;
    if (!markerTable) {
      const [{ studentsCount, usersCount, yearsCount, settingsCount, alertsCount,
        classesCount, sectionsCount, feesCount, feeTypesCount }] = await tx<{
        studentsCount: number; usersCount: number; yearsCount: number;
        settingsCount: number; alertsCount: number;
        classesCount: number; sectionsCount: number; feesCount: number; feeTypesCount: number;
      }[]>`
        select (select count(*)::int from students) as "studentsCount",
               (select count(*)::int from users) as "usersCount",
               (select count(*)::int from academic_years) as "yearsCount",
               (select count(*)::int from settings) as "settingsCount",
               (select count(*)::int from alerts) as "alertsCount",
               (select count(*)::int from classes) as "classesCount",
               (select count(*)::int from sections) as "sectionsCount",
               (select count(*)::int from fees) as "feesCount",
               (select count(*)::int from fee_types) as "feeTypesCount"
      `;
      if (studentsCount || usersCount || yearsCount || settingsCount || alertsCount
        || classesCount || sectionsCount || feesCount || feeTypesCount) {
        throw new Error('Unmarked fixture database contains application data');
      }
      await tx`
        create table school_history_fixture_marker (
          id text primary key,
          created_at timestamptz not null default now()
        )
      `;
      await tx`insert into school_history_fixture_marker (id) values (${fixtureId})`;
    } else {
      const markers = await tx<{ id: string }[]>`select id from school_history_fixture_marker`;
      if (markers.length !== 1 || markers[0].id !== fixtureId) {
        throw new Error('Fixture marker does not match this seed');
      }
    }

    for (const year of historyYears) {
      await tx`
        insert into academic_years (
          id, label, instruction_starts_on, instruction_ends_on,
          reporting_starts_on, reporting_ends_on, payment_closeout_on,
          status, provenance, provenance_note
        ) values (
          ${year.id}, ${year.label}, ${year.start}, ${year.instructionEnd},
          ${year.start}, ${year.end}, ${year.closeout},
          ${year.status}, 'assumed', 'Dedicated synthetic history acceptance fixture'
        ) on conflict (id) do nothing
      `;
    }

    const current = historyYears[2];
    await tx`
      insert into settings (id, school_name, current_academic_year, active_academic_year_id,
                            start_month, end_month, time_zone)
      values ('history-settings', 'History Acceptance School', ${current.label}, ${current.id},
              'september', 'june', 'Africa/Casablanca')
      on conflict (id) do nothing
    `;

    for (const entry of historyClasses) {
      await tx`
        insert into classes (id, name, academic_year)
        values (${entry.id}, ${entry.name}, ${entry.year}) on conflict (id) do nothing
      `;
      for (const section of entry.sections) {
        await tx`
          insert into sections (id, class_id, name)
          values (${section.id}, ${entry.id}, ${section.name}) on conflict (id) do nothing
        `;
      }
    }

    for (const role of ['admin', 'principal']) {
      await tx`
        insert into roles (id, name) values (${`history-role-${role}`}, ${role})
        on conflict (id) do nothing
      `;
    }
    for (const actor of [
      { id: 'history-admin', role: 'admin', password: adminPassword },
      { id: 'history-principal', role: 'principal', password: principalPassword },
    ]) {
      const hash = await Bun.password.hash(actor.password, { algorithm: 'bcrypt', cost: 10 });
      await tx`
        insert into users (id, name, email, password, role_id, status, email_verified)
        values (${actor.id}, ${actor.role}, ${`${actor.role}@history.example.test`},
                ${hash}, ${`history-role-${actor.role}`}, 'active', true)
        on conflict (id) do nothing
      `;
    }

    const studentPassword = await Bun.password.hash(crypto.randomUUID(), { algorithm: 'bcrypt', cost: 10 });
    for (const student of historyStudents) {
      const latest = student.years.at(-1)!;
      const latestEnrollment = historyEnrollments.find(
        (row) => row.studentId === student.id && row.label === latest,
      )!;
      const latestPlacement = latestEnrollment.placements.at(-1)!;
      const studentStatus = latestEnrollment.status === 'graduated' ? 'graduated'
        : latestEnrollment.status === 'withdrawn' ? 'inactive' : 'active';
      const firstYear = historyYears.find((year) => year.label === student.years[0])!;
      const userId = `${student.id}-user`;
      await tx`
        insert into users (id, name, email, password, status)
        values (${userId}, ${student.name}, ${`${student.id}@history.example.test`},
                ${studentPassword}, 'active')
        on conflict (id) do nothing
      `;
      await tx`
        insert into students (
          id, user_id, class_id, section_id, student_code,
          name, enrollment_date, status
        ) values (
          ${student.id}, ${userId}, ${latestPlacement.classId}, ${latestPlacement.sectionId},
          ${student.id}, ${student.name}, ${firstYear.start}, ${studentStatus}
        ) on conflict (id) do nothing
      `;
    }

    for (const enrollment of historyEnrollments) {
      await tx`
        insert into student_enrollments (
          id, student_id, academic_year_id, status, enrolled_on, left_on
        ) values (
          ${enrollment.id}, ${enrollment.studentId}, ${enrollment.yearId},
          ${enrollment.status}, ${enrollment.enrolledOn}, ${enrollment.leftOn}
        ) on conflict (id) do nothing
      `;
      for (const placement of enrollment.placements) {
        await tx`
          insert into student_enrollment_placements (
            id, enrollment_id, class_id, section_id, valid_from, valid_to, reason
          ) values (
            ${placement.id}, ${enrollment.id}, ${placement.classId},
            ${placement.sectionId}, ${placement.validFrom}, ${placement.validTo},
            ${placement.reason}
          ) on conflict (id) do nothing
        `;
      }
    }

    // Aya has a 2025-2026 debt but no 2025-2026 enrollment. The charged fee
    // is the source year for the later financial reminder Alert case.
    await tx`
      insert into fee_types (id, name, category, amount, payment_type, status)
      values ('history-fee-type', 'History tuition', 'tuition', '1000.00', 'oneTime', 'active')
      on conflict (id) do nothing
    `;
    await tx`
      insert into fees (
        id, student_id, fee_type_id, schedule, academic_year,
        base_amount, gross_amount, net_amount, paid_amount,
        status, effective_date
      ) values (
        'history-fee-2025-aya', 'history-student-08', 'history-fee-type',
        'oneTime', '2025-2026', '1000.00', '1000.00', '1000.00', '0.00',
        'pending', '2026-06-01'
      ) on conflict (id) do nothing
    `;

    const [{ studentsCount, enrollmentsCount, placementsCount, yearsCount }] = await tx<{
      studentsCount: number; enrollmentsCount: number; placementsCount: number; yearsCount: number;
    }[]>`
      select (select count(*)::int from students) as "studentsCount",
             (select count(*)::int from student_enrollments) as "enrollmentsCount",
             (select count(*)::int from student_enrollment_placements) as "placementsCount",
             (select count(*)::int from academic_years) as "yearsCount"
    `;
    const expectedPlacements = historyEnrollments.reduce((sum, row) => sum + row.placements.length, 0);
    if (studentsCount !== historyFixtureExpected.studentIdentities
      || enrollmentsCount !== historyFixtureExpected.totalEnrollments
      || placementsCount !== expectedPlacements || yearsCount !== historyYears.length) {
      throw new Error('Fixture row counts differ from the reviewed manifest');
    }

    const storedEnrollments = await tx<{
      id: string; studentId: string; yearId: string; status: string;
      enrolledOn: string; leftOn: string | null;
    }[]>`
      select id, student_id as "studentId", academic_year_id as "yearId",
             status, enrolled_on::text as "enrolledOn", left_on::text as "leftOn"
      from student_enrollments order by id
    `;
    const expectedEnrollments = historyEnrollments.map((row) => ({
      id: row.id, studentId: row.studentId, yearId: row.yearId,
      status: row.status, enrolledOn: row.enrolledOn, leftOn: row.leftOn,
    })).sort((a, b) => a.id.localeCompare(b.id));
    if (JSON.stringify(storedEnrollments) !== JSON.stringify(expectedEnrollments)) {
      throw new Error('Fixture enrollments differ from the reviewed manifest');
    }

    const storedPlacements = await tx<{
      id: string; enrollmentId: string; classId: string; sectionId: string;
      validFrom: string; validTo: string | null;
    }[]>`
      select id, enrollment_id as "enrollmentId", class_id as "classId",
             section_id as "sectionId", valid_from::text as "validFrom",
             valid_to::text as "validTo"
      from student_enrollment_placements order by id
    `;
    const expectedPlacementsRows = historyEnrollments.flatMap((row) => row.placements.map((placement) => ({
      id: placement.id, enrollmentId: row.id, classId: placement.classId,
      sectionId: placement.sectionId, validFrom: placement.validFrom, validTo: placement.validTo,
    }))).sort((a, b) => a.id.localeCompare(b.id));
    if (JSON.stringify(storedPlacements) !== JSON.stringify(expectedPlacementsRows)) {
      throw new Error('Fixture placements differ from the reviewed manifest');
    }

    const [{ feeCount, feeYear, unrelatedEnrollmentCount }] = await tx<{
      feeCount: number; feeYear: string; unrelatedEnrollmentCount: number;
    }[]>`
      select (select count(*)::int from fees) as "feeCount",
             (select academic_year from fees where id = 'history-fee-2025-aya') as "feeYear",
             (select count(*)::int from student_enrollments
              where student_id = 'history-student-08'
                and academic_year_id = 'history-year-2025') as "unrelatedEnrollmentCount"
    `;
    if (feeCount !== 1 || feeYear !== '2025-2026' || unrelatedEnrollmentCount !== 0) {
      throw new Error('Fee-only 2025-2026 fixture is inconsistent');
    }

    const actors = await tx<{ id: string; password: string }[]>`
      select id, password from users where id in ('history-admin', 'history-principal')
    `;
    const passwords = new Map([
      ['history-admin', adminPassword], ['history-principal', principalPassword],
    ]);
    if (actors.length !== 2 || !(await Promise.all(actors.map((actor) =>
      Bun.password.verify(passwords.get(actor.id)!, actor.password)))).every(Boolean)) {
      throw new Error('Fixture actor credentials do not match the supplied values');
    }
  });
  console.log('Academic history fixture committed: 3 years, 10 students, 23 enrollments');
} finally {
  await connection.end();
}
