#!/usr/bin/env bun

/** Idempotent Assessment and Attendance cases for the marked local history fixture. */
import postgres from 'postgres';
import {
  historyAssessmentCases, historyAttendanceCases, historyFixtureExpected, historyYears,
} from './alertsHistoryManifest';

const rawUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!rawUrl) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(rawUrl);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
  || target.pathname !== '/school_history_test') throw new Error('Expected local school_history_test');

const connection = postgres(rawUrl, { max: 1, prepare: false, onnotice: () => {} });
try {
  await connection.begin(async (transaction) => {
    const tx = transaction as unknown as typeof connection;
    const [identity] = await tx<{ database: string; marker: string; students: number }[]>`
      select current_database() as database,
             (select id from school_history_fixture_marker) as marker,
             (select count(*)::int from students) as students
    `;
    if (identity.database !== 'school_history_test'
      || identity.marker !== 'academic-history-alerts-v1'
      || identity.students !== historyFixtureExpected.studentIdentities) {
      throw new Error('History fixture identity or student count differs');
    }

    await tx`
      insert into staff (id, employee_code, name, role, hire_date)
      values ('history-staff-teacher', 'HISTORY-TEACHER', 'Nadia El Mansouri', 'teacher', '2024-09-01')
      on conflict (id) do nothing
    `;
    await tx`
      insert into teachers (id, staff_id)
      values ('history-teacher', 'history-staff-teacher') on conflict (id) do nothing
    `;
    await tx`
      insert into subjects (id, code, name)
      values ('history-subject-math', 'HISTORY-MATH', 'Mathematics') on conflict (id) do nothing
    `;
    for (const year of historyYears) {
      const suffix = year.label.slice(0, 4);
      await tx`
        insert into teacher_assignments (id, class_id, section_id, subject_id, teacher_id)
        values (${`history-assignment-${suffix}`}, ${`history-class-${suffix}`},
                ${`history-section-${suffix}-a`}, 'history-subject-math', 'history-teacher')
        on conflict (id) do nothing
      `;
    }

    for (const item of historyAssessmentCases) {
      const yearId = historyYears.find((year) => year.label === item.year)?.id ?? null;
      await tx`
        insert into assessments (id, teacher_assignment_id, academic_year_id, title,
                                 type, date, total_marks, passing_marks, status, section_ids)
        values (${item.id}, ${`history-assignment-${item.section.slice(16, 20)}`}, ${yearId},
                ${`History ${item.id}`}, 'quiz', ${item.date}, 20, 10, 'scheduled',
                ${tx.json([item.section])})
        on conflict (id) do nothing
      `;
    }
    for (const item of historyAttendanceCases) {
      const yearId = historyYears.find((year) => year.label === item.year)?.id ?? null;
      await tx`
        insert into attendance (id, type, student_id, section_id, academic_year_id,
                                date, status, marked_by)
        values (${item.id}, 'student', ${item.student}, ${item.section}, ${yearId},
                ${item.date}, 'present', 'history-admin')
        on conflict (id) do nothing
      `;
    }

    const actualAssessments = await tx<{ id: string; yearId: string | null; date: string }[]>`
      select id, academic_year_id as "yearId", date::text as date
      from assessments where id like 'history-assessment-%' order by id
    `;
    const actualAttendance = await tx<{ id: string; yearId: string | null; date: string;
      section: string | null; student: string | null }[]>`
      select id, academic_year_id as "yearId", date::text as date,
             section_id as section, student_id as student
      from attendance where id like 'history-attendance-%' order by id
    `;
    const yearId = (label: string | null) => historyYears.find((year) => year.label === label)?.id ?? null;
    const expectedAssessments = historyAssessmentCases.map((item) => ({
      id: item.id, yearId: yearId(item.year), date: item.date,
    })).sort((a, b) => a.id.localeCompare(b.id));
    const expectedAttendance = historyAttendanceCases.map((item) => ({
      id: item.id, yearId: yearId(item.year), date: item.date,
      section: item.section, student: item.student,
    })).sort((a, b) => a.id.localeCompare(b.id));
    if (JSON.stringify(actualAssessments) !== JSON.stringify(expectedAssessments)
      || JSON.stringify(actualAttendance) !== JSON.stringify(expectedAttendance)) {
      throw new Error('Academic record fixture rows differ from the reviewed manifest');
    }
  });
  console.log('Academic history Assessment and Attendance cases committed: 5 each');
} finally {
  await connection.end();
}
