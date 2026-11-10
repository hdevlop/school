import { describe, expect, it } from 'bun:test';
import { GradeService } from '../../src/modules/grades/GradeService';

const math = { id: 'math', name: 'Mathématiques' };
const french = { id: 'french', name: 'Français' };

/** One of the student's grades, out of 20, in section 1AC A. */
const grade = (id: string, subject: typeof math, marks: number) => ({
  id,
  subject,
  marksObtained: marks,
  status: 'graded',
  assessment: { id: `a-${id}`, totalMarks: 20 },
  section: { id: 'sec-a', name: 'A' },
  class: { name: '1AC' },
});

function report(totals: Array<{ studentId: string; subjectId: string; obtained: number; possible: number }>) {
  const repository = {
    getAll: async () => [grade('g1', math, 16), grade('g2', french, 12)],
    sectionTotals: async () => totals,
  };
  const validator = { ensureStudentExists: async () => {} };
  const service = new GradeService(repository as any, validator as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return service.getStudentReport('me');
}

describe("a student's report: rank and class average", () => {
  it('gives the class mean of the students\' averages, overall and per subject', async () => {
    const result = await report([
      { studentId: 'me', subjectId: 'math', obtained: 16, possible: 20 },
      { studentId: 'me', subjectId: 'french', obtained: 12, possible: 20 },
      { studentId: 's2', subjectId: 'math', obtained: 10, possible: 20 },
      { studentId: 's2', subjectId: 'french', obtained: 14, possible: 20 },
      { studentId: 's3', subjectId: 'math', obtained: 13, possible: 20 },
      { studentId: 's3', subjectId: 'french', obtained: 8, possible: 20 },
    ]);
    // Averages: me 70%, s2 60%, s3 52.5%.
    expect(result.rank).toEqual({ position: 1, total: 3, classAverage: 60.83, className: '1AC A' });
    const bySubject = Object.fromEntries(result.subjects.map((subject: any) => [subject.subject.id, subject.rank]));
    expect(bySubject.math).toEqual({ position: 1, total: 3, classAverage: 65 });
    expect(bySubject.french).toEqual({ position: 2, total: 3, classAverage: 56.67 });
  });

  it('withholds the class average with fewer than three students, where it would give away a classmate\'s', async () => {
    const result = await report([
      { studentId: 'me', subjectId: 'math', obtained: 16, possible: 20 },
      { studentId: 'me', subjectId: 'french', obtained: 12, possible: 20 },
      { studentId: 's2', subjectId: 'math', obtained: 10, possible: 20 },
    ]);
    expect(result.rank).toEqual({ position: 1, total: 2, classAverage: null, className: '1AC A' });
    const french = result.subjects.find((subject: any) => subject.subject.id === 'french');
    expect(french.rank).toEqual({ position: 1, total: 1, classAverage: null });
  });
});
