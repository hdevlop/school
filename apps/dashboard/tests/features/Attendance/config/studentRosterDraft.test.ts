import { describe, expect, it } from 'bun:test';
import {
  clearSavedStudentMarks, clearSubmittedStudentMarks, indexStudentMarks, stageStudentRoster,
  studentMarkKey, studentRosterChanges, studentRosterSubmission, type StudentRosterContext,
} from '@/features/Attendance/config/studentRosterDraft';

const date = '2026-11-05';
const sectionA = [{ id: 'a1', sectionId: 'A' }, { id: 'a2', sectionId: 'A' }];
const sectionB = [{ id: 'b1', sectionId: 'B' }];
const sectionC = [{ id: 'c1', sectionId: 'C' }];
const context = (sectionId: string, extra: Partial<StudentRosterContext> = {}): StudentRosterContext => ({
  date, attendanceMode: 'daily', allSections: false, sectionId, ...extra,
});
const empty = indexStudentMarks([]);

describe('sending student attendance across classes', () => {
  it('keeps edits across sections and sends both reviewed registers, without an unvisited class', () => {
    let draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    draft = stageStudentRoster(sectionB, draft, empty, context('B'), { b1: 'late' });
    const returningToA = studentRosterChanges(sectionA, draft, empty, context('A'));
    expect(returningToA.map(item => [item.studentId, item.status])).toEqual([['a1', 'absent'], ['a2', 'present']]);
    const sent = studentRosterSubmission(sectionB, draft, empty, context('B'));
    expect(sent.map(item => [item.studentId, item.sectionId, item.status])).toEqual([
      ['a1', 'A', 'absent'], ['a2', 'A', 'present'], ['b1', 'B', 'late'],
    ]);
    expect(sent.some(item => sectionC.some(person => person.id === item.studentId))).toBe(false);
  });

  it('does not stage the initial All Classes view just because a section was opened', () => {
    studentRosterSubmission([...sectionA, ...sectionB, ...sectionC], {}, empty, context('', { allSections: true }));
    const draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    expect(studentRosterSubmission(sectionA, draft, empty, context('A')).map(item => item.studentId)).toEqual(['a1', 'a2']);
  });

  it('keeps one daily mark per person when moving between All Classes and a section', () => {
    let draft = stageStudentRoster([...sectionA, ...sectionB], {}, empty, context('', { allSections: true }), { a1: 'absent' });
    draft = stageStudentRoster(sectionA, draft, empty, context('A'), { a1: 'late' });
    const sent = studentRosterSubmission([...sectionA, ...sectionB], draft, empty, context('', { allSections: true }));
    expect(sent).toHaveLength(3);
    expect(sent.find(item => item.studentId === 'a1')?.status).toBe('late');
    expect(new Set(sent.map(studentMarkKey)).size).toBe(sent.length);
  });

  it('updates a saved mark, and removes an edit reverted to its recorded status', () => {
    const saved = indexStudentMarks([{ id: 'held', studentId: 'a1', sectionId: 'A', date, status: 'absent' }]);
    let draft = stageStudentRoster(sectionA, {}, saved, context('A'), { a1: 'late' });
    expect(studentRosterSubmission(sectionA, draft, saved, context('A')).find(item => item.studentId === 'a1')?.id).toBe('held');
    draft = stageStudentRoster(sectionA, draft, saved, context('A'), { a1: 'absent' });
    expect(studentRosterSubmission(sectionA, draft, saved, context('A')).map(item => item.studentId)).toEqual(['a2']);
  });

  it('can send queued classes even when the newly selected class has no register', () => {
    const draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    expect(studentRosterSubmission([], draft, empty, context('')).map(item => item.studentId)).toEqual(['a1', 'a2']);
  });

  it('never sends a previous day under a newly selected date', () => {
    const draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    expect(studentRosterSubmission([], draft, empty, context('B', { date: '2026-11-06' }))).toEqual([]);
  });
});

describe('lesson-specific pending attendance', () => {
  const lesson = (id: string) => context('A', {
    attendanceMode: 'per_class', teacherAssignmentId: id, teacherId: 'teacher-' + id, subjectId: 'subject-' + id,
  });

  it('preserves independent marks and teacher/subject metadata for the same student in two lessons', () => {
    let draft = stageStudentRoster([sectionA[0]], {}, empty, lesson('math'), { a1: 'absent' });
    draft = stageStudentRoster([sectionA[0]], draft, empty, lesson('french'), { a1: 'late' });
    const sent = studentRosterSubmission([sectionA[0]], draft, empty, lesson('math'));
    expect(sent.map(item => [item.teacherAssignmentId, item.teacherId, item.subjectId, item.status]).sort()).toEqual([
      ['french', 'teacher-french', 'subject-french', 'late'], ['math', 'teacher-math', 'subject-math', 'absent'],
    ]);
  });

  it('does not queue marks without a selected lesson', () => {
    const invalid = context('A', { attendanceMode: 'per_class' });
    expect(stageStudentRoster(sectionA, {}, empty, invalid, { a1: 'absent' })).toEqual({});
    expect(studentRosterSubmission(sectionA, {}, empty, invalid)).toEqual([]);
  });
});

describe('finishing or retrying a multi-class send', () => {
  it('drops completed marks after a partial failure and keeps the failed class pending', () => {
    let draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    draft = stageStudentRoster(sectionB, draft, empty, context('B'), { b1: 'late' });
    const refreshed = indexStudentMarks([
      { id: 'saved-a1', studentId: 'a1', sectionId: 'A', date, status: 'absent' },
      { id: 'saved-a2', studentId: 'a2', sectionId: 'A', date, status: 'present' },
    ]);
    draft = clearSavedStudentMarks(draft, refreshed);
    expect(studentRosterSubmission(sectionB, draft, refreshed, context('B')).map(item => item.studentId)).toEqual(['b1']);
    expect(Object.values(draft).map(item => item.studentId)).toEqual(['b1']);
  });

  it('keeps a newer edit made while Send was in flight', () => {
    const draft = stageStudentRoster(sectionA, {}, empty, context('A'), { a1: 'absent' });
    const sent = studentRosterSubmission(sectionA, draft, empty, context('A'));
    const newer = stageStudentRoster(sectionA, draft, empty, context('A'), { a1: 'late' });
    expect(Object.values(clearSubmittedStudentMarks(newer, sent)).map(item => [item.studentId, item.status])).toEqual([['a1', 'late']]);
  });
});
