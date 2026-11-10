import { describe, expect, it } from 'bun:test';
import { groupTeacherAssignments, subjectsForTeacherClass } from '@/features/Teachers/config/teacherAssignments';
import type { TeacherAssignmentFormValues } from '@/features/Teachers/config/teacherSchemas';

const pairs = (assignments: TeacherAssignmentFormValues[]) => [...new Set(assignments.flatMap(assignment =>
  assignment.sectionIds.flatMap(sectionId => assignment.subjectIds.map(subjectId =>
    JSON.stringify([assignment.classId, sectionId, subjectId]))),
))].sort();

describe('teacher assignment edit defaults', () => {
  it('reopens a class with two sections and the same subject as one assignment', () => {
    expect(groupTeacherAssignments([
      { classId: 'CP', sectionIds: ['B'], subjectIds: ['computing'] },
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['computing'] },
    ])).toEqual([{ classId: 'CP', sectionIds: ['B', 'A'], subjectIds: ['computing'] }]);
  });

  it('recognizes the same subject set regardless of API order and duplicate IDs', () => {
    expect(groupTeacherAssignments([
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['math', 'french', 'math'] },
      { classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['french', 'math'] },
    ])).toEqual([{ classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['math', 'french'] }]);
  });

  it('never introduces subjects into a section when grouping an edit', () => {
    const assignments = [
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['math', 'french'] },
      { classId: 'CP', sectionIds: ['B'], subjectIds: ['math'] },
      { classId: 'CP', sectionIds: ['C'], subjectIds: ['french'] },
      { classId: 'CP', sectionIds: ['D'], subjectIds: ['french', 'math'] },
      { classId: 'CE1', sectionIds: ['E'], subjectIds: ['math', 'french'] },
    ];
    const grouped = groupTeacherAssignments(assignments);
    expect(grouped).toHaveLength(4);
    expect(pairs(grouped)).toEqual(pairs(assignments));
  });

  it('preserves the loaded record and remains stable when reopened', () => {
    const assignments = [{ classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['computing'] }];
    const before = structuredClone(assignments);
    const grouped = groupTeacherAssignments(assignments);
    grouped[0].sectionIds.push('C');
    expect(assignments).toEqual(before);
    expect(groupTeacherAssignments(grouped)).toEqual(grouped);
    expect(groupTeacherAssignments([])).toEqual([]);
  });
});

describe('teacher subject choices by class', () => {
  const subjects = [
    { id: 'primary-science', code: 'SCI' },
    { id: 'secondary-science', code: 'SVT' },
    { id: 'math', code: 'MATH' },
    { id: 'computing', code: 'INFO' },
    { id: 'school-subject', code: 'ROBOTICS' },
  ];

  it.each(['Primaire', 'Primary School', 'الابتدائي', 'Primaria'])('offers primary science instead of SVT for %s', level => {
    const offered = subjectsForTeacherClass(subjects, level).map(subject => subject.code);
    expect(offered).toContain('SCI');
    expect(offered).not.toContain('SVT');
    expect(offered).toEqual(expect.arrayContaining(['MATH', 'INFO', 'ROBOTICS']));
  });

  it.each(['Collège', 'Lycée', 'Custom cycle', undefined])('preserves the subject catalogue outside primary (%s)', level => {
    expect(subjectsForTeacherClass(subjects, level)).toEqual(subjects);
  });

  it('recognizes normalized subject codes and preserves subjects without a code', () => {
    expect(subjectsForTeacherClass([{ id: 'svt', code: ' svt ' }, { id: 'sci', code: 'sci' }, { id: 'custom' }], 'Primaire'))
      .toEqual([{ id: 'sci', code: 'sci' }, { id: 'custom' }]);
  });
});
