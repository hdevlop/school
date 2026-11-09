import { describe, expect, it } from 'bun:test';
import type { MassarGradeSource } from '@sms/contracts';
import { examSourcesWithMassar, massarMarkFromGrade, massarSourceLabels } from '../../../../src/features/Grades/config/massarGradeSources';

const component = (over: Partial<MassarGradeSource> = {}): MassarGradeSource => ({
  id: 'massar:sheet:1003', sheetId: 'sheet', componentCode: '1003', title: 'الإملاء',
  classId: 'cp', sectionId: 'a', subjectId: 'arabic', teacherId: null, totalMarks: 10,
  term: 1, exam: 1, termLabel: 'Semester 1', examLabel: 'Contrôle 1', linkedExamId: null, ...over,
});

describe('Massar components in Grades', () => {
  it('includes components without a planned exam and replaces only the exact linked exam', () => {
    const components = [component({ linkedExamId: 'dictation' }), component({ id: 'massar:sheet:1002', componentCode: '1002', title: 'القراءة' })];
    const sources = examSourcesWithMassar([{ id: 'dictation', title: 'الإملاء' }, { id: 'arabic', title: 'اللغة العربية' }], components);
    expect(sources.map(source => source.id)).toEqual(['massar:sheet:1003', 'massar:sheet:1002', 'arabic']);
    expect(examSourcesWithMassar([{ id: 'ordinary' }], [])).toEqual([{ id: 'ordinary' }]);
  });

  it('distinguishes rounds without making a component label longer because another section has it', () => {
    const first = component(), second = component({ id: 'massar:next:1003', sheetId: 'next', exam: 2, examLabel: 'Contrôle 2' });
    const otherSection = component({ id: 'massar:section-b:1003', sectionId: 'b' });
    const labels = massarSourceLabels([first, second, otherSection]);
    expect(labels.get(first.id)).toBe('الإملاء · Semester 1 · Contrôle 1');
    expect(labels.get(second.id)).toBe('الإملاء · Semester 1 · Contrôle 2');
    expect(labels.get(otherSection.id)).toBe('الإملاء');
  });

  it('keeps zero, clears blank cells, preserves decimal marks and writes absence to only the chosen component', () => {
    expect(massarMarkFromGrade('student', '1002', { marksObtained: 0 })).toEqual({ studentId: 'student', componentCode: '1002', mark: 0, absence: 'none' });
    expect(massarMarkFromGrade('student', '1002', { marksObtained: '' }).mark).toBeNull();
    expect(massarMarkFromGrade('student', '1002', { marksObtained: null }).mark).toBeNull();
    expect(massarMarkFromGrade('student', '1002', { marksObtained: '7.25' }).mark).toBe(7.25);
    expect(massarMarkFromGrade('student', '1003', { marksObtained: 8, status: 'missed' }))
      .toEqual({ studentId: 'student', componentCode: '1003', mark: null, absence: 'justified' });
  });
});
