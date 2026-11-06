import { describe, expect, it } from 'bun:test';
import { translations } from '@sms/contracts/locales';
import { parseStudentRosterImport } from '@/features/Attendance/config/studentRosterImport';
import { indexStudentMarks, stageStudentRoster, studentRosterSubmission } from '@/features/Attendance/config/studentRosterDraft';

const students = [
  { id: 'a', studentCode: 'F001', sectionId: 'A' },
  { id: 'b', studentCode: 'F002', sectionId: 'A' },
  { id: 'c', studentCode: 'F003', sectionId: 'A' },
];
const labels = { codeHeader: 'Code élève', statusHeader: 'Statut', statuses: { present: 'Présent', absent: 'Absent', late: 'En retard' } };

describe('student attendance import', () => {
  it('matches codes to the current register and accepts raw export fields', () => {
    expect(parseStudentRosterImport([
      { studentCode: ' f001 ', status: ' ABSENT ', name: 'Ignored name', phone: 'Ignored field' },
      { student_code: 'F002', status: 'late' },
    ], students, labels)).toEqual({ ok: true, marks: { a: 'absent', b: 'late' }, count: 2 });
  });

  it('accepts translated Excel column labels and attendance labels', () => {
    expect(parseStudentRosterImport([
      { 'Code élève': 'F001', Statut: 'Présent' },
      { 'Code élève': 'F002', Statut: 'En retard' },
    ], students, labels)).toEqual({ ok: true, marks: { a: 'present', b: 'late' }, count: 2 });
  });

  it.each([
    { input: { studentCode: 'outside', status: 'absent' }, reason: 'unknownStudent' },
    { input: { studentCode: 'F001', status: 'absent' }, reason: 'duplicateStudent' },
    { input: { studentCode: 'F002', status: 'unmarked' }, reason: 'invalidStatus' },
    { input: { studentCode: 'F002' }, reason: 'missingFields' },
    { input: { name: 'Salma', status: 'absent' }, reason: 'missingFields' },
  ])('rejects the whole import for $reason without returning partial marks', ({ input, reason }) => {
    const result = parseStudentRosterImport([{ studentCode: 'F001', status: 'late' }, input], students, labels);
    expect(result).toMatchObject({ ok: false, issue: { row: 2, reason } });
    expect(result).not.toHaveProperty('marks');
  });

  it('rejects an empty file', () => {
    expect(parseStudentRosterImport([], students, labels)).toMatchObject({ ok: false, issue: { reason: 'missingFields' } });
  });

  it('stages imported marks while preserving other edits and saved records', () => {
    const context = { date: '2026-11-06', attendanceMode: 'daily' as const, allSections: false, sectionId: 'A' };
    const saved = indexStudentMarks([{ id: 'saved', studentId: 'b', sectionId: 'A', date: context.date, status: 'absent' }]);
    const draft = stageStudentRoster(students, {}, saved, context, { c: 'late' });
    const result = parseStudentRosterImport([{ studentCode: 'F001', status: 'absent' }, { studentCode: 'F002', status: 'present' }], students, labels);
    if (result.ok === false) throw new Error('Expected a valid import');
    const next = stageStudentRoster(students, draft, saved, context, result.marks);
    const changes = studentRosterSubmission(students, next, saved, context);
    expect(changes.map(({ studentId, status }) => [studentId, status])).toEqual([['a', 'absent'], ['b', 'present'], ['c', 'late']]);
    expect(changes.find(({ studentId }) => studentId === 'b')?.id).toBe('saved');
    expect(saved.get(JSON.stringify([context.date, 'b', 'A', false]))?.status).toBe('absent');
  });

  it('supports each locale’s Excel headers and includes every validation message', () => {
    for (const catalog of Object.values(translations)) {
      const roster = catalog.attendance.roster;
      const result = parseStudentRosterImport([
        { [catalog.students.table.studentCode]: 'F001', [catalog.common.status]: roster.late },
      ], students, { codeHeader: catalog.students.table.studentCode, statusHeader: catalog.common.status, statuses: { present: roster.present, absent: roster.absent, late: roster.late } });
      expect(result).toEqual({ ok: true, marks: { a: 'late' }, count: 1 });
      for (const reason of ['missingFields', 'unknownStudent', 'duplicateStudent', 'invalidStatus'] as const) expect(roster.importErrors[reason]).toBeTruthy();
    }
  });
});
