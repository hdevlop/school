import { describe, expect, test } from 'bun:test';
import {
  averageOf, classGradesSummary, EACH_MARK_UP_TO, gradesOverview, sourceGradesSummary, type GradeRow,
} from '../../src/modules/grades/gradeChatSummary';

const exam = (id: string, title: string, totalMarks = 10, passingMarks: number | null = 5) =>
  ({ id, title, type: 'test', date: '2026-11-10', totalMarks, passingMarks });
const row = (student: string, mark: number | string, source = exam('e1', 'Grammaire'), subject = 'Français', section = 'A'): GradeRow => ({
  marksObtained: String(mark),
  student: { id: student, name: student, studentCode: `C-${student}` },
  assessment: null,
  exam: source,
  subject: { name: subject },
  teacher: { name: 'Achtouk ghizlane' },
  class: { name: 'CM1' },
  section: { name: section },
});

describe('grades summaries for the chat', () => {
  test('an average keeps one denominator, or is out of 20 when they differ', () => {
    expect(averageOf([row('a', 8), row('b', 9)])).toBe('8.5/10');
    expect(averageOf([row('a', 8), row('b', 15, exam('e2', 'Maths', 20))])).toBe('15.5/20');
    expect(averageOf([])).toBeNull();
    expect(averageOf([row('a', 'not a mark')])).toBeNull();
  });

  test('a small class lists each student\'s marks with the subject and the test', () => {
    const summary = classGradesSummary([row('AACHIR ZAKARIA', 7), row('BELHAD SHAMSS', 8.25),
      row('AACHIR ZAKARIA', 9, exam('e2', 'Conjugaison'))]);
    expect(summary).toMatchObject({ class: 'CM1 A', marks: 3, students: 2, average: '8.08/10' });
    expect(summary.byStudent[0]).toEqual({ student: 'AACHIR ZAKARIA', studentCode: 'C-AACHIR ZAKARIA', average: '8/10',
      marks: [{ subject: 'Français', title: 'Grammaire', mark: '7/10' }, { subject: 'Français', title: 'Conjugaison', mark: '9/10' }] });
    expect(summary.testsAndExams).toHaveLength(2);
  });

  test('a large class gives each student\'s subject averages instead of every mark', () => {
    const rows = Array.from({ length: EACH_MARK_UP_TO + 1 }, (_, i) =>
      row(`S${i % 25}`, i % 10, exam(`e${i % 12}`, `T${i % 12}`), i % 2 ? 'Français' : 'Mathématiques'));
    const summary = classGradesSummary(rows);
    expect(summary.byStudent).toHaveLength(25);
    expect(summary.byStudent[0]).not.toHaveProperty('marks');
    expect(Object.keys(summary.byStudent[0].subjects as object).sort()).toEqual(['Français', 'Mathématiques']);
    expect(JSON.stringify(summary).length).toBeLessThan(10_000);
  });

  test('the overview gives figures per class and subject, not per student', () => {
    const summary = gradesOverview([row('a', 8), row('b', 6, undefined, 'Français', 'B'), row('c', 10, exam('e2', 'Maths'), 'Mathématiques')]);
    expect(summary).toMatchObject({ marks: 3, students: 3, average: '8/10', teachers: ['Achtouk ghizlane'] });
    expect(summary.byClass).toEqual([
      { class: 'CM1 A', marks: 2, students: 2, average: '9/10' },
      { class: 'CM1 B', marks: 1, students: 1, average: '6/10' },
    ]);
    expect(summary.bySubject.map((group) => group.subject)).toEqual(['Français', 'Mathématiques']);
    expect(summary).not.toHaveProperty('byStudent');
  });

  test('many tests and exams are counted, not listed', () => {
    const rows = Array.from({ length: 60 }, (_, i) => row('a', 5, exam(`e${i}`, `T${i}`)));
    expect(gradesOverview(rows).testsAndExams).toBeUndefined();
  });

  test('one exam: each student\'s mark and how many passed', () => {
    const summary = sourceGradesSummary([row('a', 4), row('b', 5), row('c', 9.5)]);
    expect(summary).toMatchObject({ title: 'Grammaire', kind: 'exam', subject: 'Français', class: 'CM1 A', date: '2026-11-10',
      outOf: 10, marks: 3, average: '6.17/10', passingMark: 5, passed: 2 });
    expect(summary.byStudent[2]).toEqual({ student: 'c', studentCode: 'C-c', mark: '9.5/10' });
  });

  test('no rows is zero marks, not a failure', () => {
    expect(classGradesSummary([])).toMatchObject({ class: null, marks: 0, average: null, byStudent: [] });
    expect(gradesOverview([])).toMatchObject({ marks: 0, byClass: [] });
    expect(sourceGradesSummary([])).toMatchObject({ title: null, marks: 0, byStudent: [] });
  });
});
