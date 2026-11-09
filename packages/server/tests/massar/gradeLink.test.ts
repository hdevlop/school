import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { massarPlanningControls } from '@sms/contracts';
import { MassarGradeLink, linkCells } from '../../src/modules/massar/MassarGradeLink';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';
import { massarTestI18n } from './fixtures';

let i18n: Awaited<ReturnType<typeof massarTestI18n>>;
beforeAll(async () => { i18n = await massarTestI18n(); });
afterAll(async () => { await i18n?.stop(); });

// Planning puts 1AC's exams in November: Contrôle 1 of semester 1.
const planning = [{ classId: 'class-1ac', months: { '2026-11': [{ date: '2026-11-04' }] } }];
const controls = massarPlanningControls(planning);
const roster = [{ id: 'student-1', studentCode: 'S1', name: 'One', dateOfBirth: '', massarStudentId: null, position: 0 }, { id: 'student-2', studentCode: 'S2', name: 'Two', dateOfBirth: '', massarStudentId: null, position: 1 }];
const place = { classId: 'class-1ac', sectionId: 'section-a', subjectId: 'subject-ar' };
const sheet = (over: Record<string, unknown> = {}) => ({ id: 'sheet', status: 'not_started', exportedAt: null as string | null, roster, components: [{ code: '1', name: 'الفرض الأول' }],
  ...place, kind: 'exam', maxMark: 20, term: 1, exam: 1, roundStatus: 'open', ...over });
const exam = (over: Record<string, unknown> = {}) => ({ id: 'exam-ar', title: 'العربية', date: '2026-11-06', totalMarks: '20', ...place, ...over });

describe('Which Planning exam a Massar grid column is', () => {
  it('links a collège test to its subject\'s only exam in the Contrôle\'s month, and nothing uncertain', () => {
    expect(linkCells([sheet()] as never, [exam()] as never, controls).map(cell => [cell.componentCode, cell.exam.id])).toEqual([['1', 'exam-ar']]);
    // Two exams of the subject that month, another month, another section: not linked.
    expect(linkCells([sheet()] as never, [exam(), exam({ id: 'exam-ar-2' })] as never, controls)).toEqual([]);
    expect(linkCells([sheet()] as never, [exam({ date: '2026-12-02' })] as never, controls)).toEqual([]);
    expect(linkCells([sheet()] as never, [exam({ sectionId: 'section-b' })] as never, controls)).toEqual([]);
  });
  it('links a primary part to the exam of the same name, however its letters are written', () => {
    const parts = sheet({ kind: 'components', maxMark: 10, components: [{ code: '1001', name: 'الإملاء' }, { code: '1002', name: 'القراءة' }] });
    const cells = linkCells([parts] as never, [exam({ id: 'exam-dictation', title: 'الاملاء', totalMarks: '10' }), exam({ id: 'exam-arabic', title: 'اللغة العربية', totalMarks: '10' })] as never, controls);
    expect(cells.map(cell => [cell.componentCode, cell.exam.id])).toEqual([['1001', 'exam-dictation']]);
  });
});

function link(over: { sheet?: Record<string, unknown>; exam?: Record<string, unknown>; marks?: any[]; grades?: any[] } = {}) {
  const state = { marks: [...(over.marks ?? [])], grades: [...(over.grades ?? [])], sheet: sheet(over.sheet), touched: [] as string[] };
  const theExam = exam(over.exam);
  const repository = {
    planningMonths: async () => planning,
    sheets: async () => [state.sheet],
    plannedExams: async () => [theExam],
    marks: async () => state.marks,
    grades: async () => state.grades,
    insertGrade: async (data: any) => { state.grades.push({ id: `grade-${state.grades.length + 1}`, ...data }); },
    updateGrade: async (id: string, data: any) => { Object.assign(state.grades.find(grade => grade.id === id), data); },
    deleteGrade: async (id: string) => { state.grades = state.grades.filter(grade => grade.id !== id); },
    saveMarks: async (_id: string, marks: any[]) => {
      for (const mark of marks) { state.marks = state.marks.filter(item => !(item.studentId === mark.studentId && item.componentCode === mark.componentCode)); state.marks.push({ sheetId: 'sheet', ...mark, mark: mark.mark === null ? null : String(mark.mark) }); }
    },
    touchSheet: async (_id: string, status: string) => { state.touched.push(status); },
  };
  return { service: new MassarGradeLink(repository as never, new MassarValidator()), state };
}

describe('One mark in Massar and in Grades', () => {
  it('gives a Massar mark to the exam, converted to its scale; an absence is missed, an empty cell removes the grade', async () => {
    const { service, state } = link({ sheet: { kind: 'components', maxMark: 10, components: [{ code: '1001', name: 'الإملاء' }] }, exam: { title: 'الإملاء', totalMarks: '20' },
      grades: [{ id: 'old', examId: 'exam-ar', studentId: 'student-2', marksObtained: '12', status: 'graded' }] });
    await service.fromMassar('sheet', [{ studentId: 'student-1', componentCode: '1001', mark: 7.5, absence: 'none' }], 'user');
    expect(state.grades.find(grade => grade.studentId === 'student-1')).toMatchObject({ examId: 'exam-ar', marksObtained: '15', status: 'graded' });
    await service.fromMassar('sheet', [{ studentId: 'student-1', componentCode: '1001', mark: null, absence: 'justified' }], 'user');
    expect(state.grades.find(grade => grade.studentId === 'student-1')).toMatchObject({ marksObtained: '0', status: 'missed' });
    await service.fromMassar('sheet', [{ studentId: 'student-2', componentCode: '1001', mark: null, absence: 'none' }], 'user');
    expect(state.grades.some(grade => grade.studentId === 'student-2')).toBe(false);
  });
  it('gives a grade to its grid cell, marks a sent grid as changed, and leaves a student off the grid alone', async () => {
    const { service, state } = link({ sheet: { status: 'exported', exportedAt: '2026-11-10 10:00:00' } });
    await service.fromGrade('exam-ar', 'student-1', { marksObtained: '16', status: 'graded' }, 'user');
    expect(state.marks).toEqual([{ sheetId: 'sheet', studentId: 'student-1', componentCode: '1', mark: '16', absence: 'none' }]);
    expect(state.touched).toEqual(['changed_after_export']);
    await service.fromGrade('exam-ar', 'student-1', null, null);
    expect(state.marks[0]).toMatchObject({ mark: null, absence: 'none' });
    await service.fromGrade('exam-ar', 'not-on-grid', { marksObtained: '10', status: 'graded' }, 'user');
    expect(state.marks.map(mark => mark.studentId)).toEqual(['student-1']);
  });
  it('refuses a grade once the Contrôle is closed, and a mark Massar would not take', async () => {
    await expect(link({ sheet: { roundStatus: 'closed' } }).service.fromGrade('exam-ar', 'student-1', { marksObtained: '12', status: 'graded' }, 'user')).rejects.toMatchObject({ status: 409 });
    await expect(link({ exam: { totalMarks: '10' } }).service.fromGrade('exam-ar', 'student-1', { marksObtained: '12', status: 'graded' }, 'user')).rejects.toMatchObject({ status: 422 });
  });
  it('brings existing marks together: Massar wins, an empty cell of an unsent grid takes the grade', async () => {
    const { service, state } = link({
      marks: [{ sheetId: 'sheet', studentId: 'student-1', componentCode: '1', mark: '18.00', absence: 'none' }],
      grades: [{ id: 'g1', examId: 'exam-ar', studentId: 'student-1', marksObtained: '11', status: 'graded' }, { id: 'g2', examId: 'exam-ar', studentId: 'student-2', marksObtained: '9', status: 'graded' }],
    });
    await service.reconcile('user');
    expect(state.grades.find(grade => grade.id === 'g1')).toMatchObject({ marksObtained: '18' });
    expect(state.marks.find(mark => mark.studentId === 'student-2')).toMatchObject({ mark: '9', absence: 'none' });
    expect(state.touched).toEqual(['in_progress']);
    // A sent grid keeps its cells: only its marks reach Grades.
    const sent = link({ sheet: { exportedAt: '2026-11-10 10:00:00', status: 'exported' }, grades: [{ id: 'g2', examId: 'exam-ar', studentId: 'student-2', marksObtained: '9', status: 'graded' }] });
    await sent.service.reconcile('user');
    expect(sent.state.marks).toEqual([]);
  });
});
