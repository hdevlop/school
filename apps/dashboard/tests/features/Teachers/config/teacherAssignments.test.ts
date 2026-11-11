import { describe, expect, it } from 'bun:test';
import {
  classesWithoutSection,
  expandTeacherAssignments,
  groupTeacherAssignments,
  parseTeacherSectionKey,
  subjectsForTeacherClass,
  subjectsForTeacherClasses,
  teacherSectionKey,
  type TeacherAssignmentRow,
} from '@/features/Teachers/config/teacherAssignments';

/** Every (class, section, subject) the rows grant, which a round trip must keep exactly. */
const pairs = (rows: TeacherAssignmentRow[]) => [...new Set(rows.flatMap(row =>
  row.sectionIds.flatMap(sectionId => row.subjectIds.map(subjectId =>
    JSON.stringify([row.classId, sectionId, subjectId]))),
))].sort();

describe('teacher assignment edit defaults', () => {
  it('reopens a class with two sections and the same subject as one assignment', () => {
    expect(groupTeacherAssignments([
      { classId: 'CP', sectionIds: ['B'], subjectIds: ['computing'] },
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['computing'] },
    ])).toEqual([{ classIds: ['CP'], sectionIds: ['CP::B', 'CP::A'], subjectIds: ['computing'] }]);
  });

  it('reopens the classes taught the same subjects as one assignment', () => {
    expect(groupTeacherAssignments([
      { classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['science'] },
      { classId: 'CE1', sectionIds: ['A'], subjectIds: ['science'] },
      { classId: 'CE2', sectionIds: ['C'], subjectIds: ['math'] },
    ])).toEqual([
      { classIds: ['CP', 'CE1'], sectionIds: ['CP::A', 'CP::B', 'CE1::A'], subjectIds: ['science'] },
      { classIds: ['CE2'], sectionIds: ['CE2::C'], subjectIds: ['math'] },
    ]);
  });

  it('recognizes the same subject set regardless of API order and duplicate IDs', () => {
    expect(groupTeacherAssignments([
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['math', 'french', 'math'] },
      { classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['french', 'math'] },
    ])).toEqual([{ classIds: ['CP'], sectionIds: ['CP::A', 'CP::B'], subjectIds: ['math', 'french'] }]);
  });

  it('never introduces subjects into a section when grouping an edit', () => {
    const rows = [
      { classId: 'CP', sectionIds: ['A'], subjectIds: ['math', 'french'] },
      { classId: 'CP', sectionIds: ['B'], subjectIds: ['math'] },
      { classId: 'CP', sectionIds: ['C'], subjectIds: ['french'] },
      { classId: 'CP', sectionIds: ['D'], subjectIds: ['french', 'math'] },
      { classId: 'CE1', sectionIds: ['E'], subjectIds: ['math', 'french'] },
    ];
    const grouped = groupTeacherAssignments(rows);
    expect(grouped).toHaveLength(3);
    expect(pairs(expandTeacherAssignments(grouped))).toEqual(pairs(rows));
  });

  it('keeps two classes whose sections share an ID apart', () => {
    const rows = [
      { classId: 'CP', sectionIds: ['same'], subjectIds: ['science'] },
      { classId: 'CE1', sectionIds: ['same'], subjectIds: ['science'] },
    ];
    expect(expandTeacherAssignments(groupTeacherAssignments(rows))).toEqual(rows);
  });

  it('preserves the loaded record and remains stable when reopened', () => {
    const rows = [{ classId: 'CP', sectionIds: ['A', 'B'], subjectIds: ['computing'] }];
    const before = structuredClone(rows);
    const grouped = groupTeacherAssignments(rows);
    grouped[0].sectionIds.push('CP::C');
    expect(rows).toEqual(before);
    expect(groupTeacherAssignments(expandTeacherAssignments(grouped))).toEqual(grouped);
    expect(groupTeacherAssignments([])).toEqual([]);
  });
});

describe('teacher assignment payload', () => {
  it('sends one row per class, each with only its own sections', () => {
    expect(expandTeacherAssignments([
      { classIds: ['PS', 'MS', 'GS'], sectionIds: ['PS::A', 'MS::A', 'MS::B', 'GS::A'], subjectIds: ['science'] },
    ])).toEqual([
      { classId: 'PS', sectionIds: ['A'], subjectIds: ['science'] },
      { classId: 'MS', sectionIds: ['A', 'B'], subjectIds: ['science'] },
      { classId: 'GS', sectionIds: ['A'], subjectIds: ['science'] },
    ]);
  });

  it('leaves out the sections of a class no longer chosen', () => {
    expect(expandTeacherAssignments([
      { classIds: ['CP'], sectionIds: ['CP::A', 'CE1::A'], subjectIds: ['math'] },
    ])).toEqual([{ classId: 'CP', sectionIds: ['A'], subjectIds: ['math'] }]);
  });

  it('names the chosen classes that have no section', () => {
    expect(classesWithoutSection({ classIds: ['CP', 'CE1', 'CE2'], sectionIds: ['CE1::A'] })).toEqual(['CP', 'CE2']);
    expect(classesWithoutSection({ classIds: ['CP'], sectionIds: ['CP::A'] })).toEqual([]);
  });

  it('reads back the class and section of a section key', () => {
    expect(parseTeacherSectionKey(teacherSectionKey('cls_1-x', 'sec-2_y'))).toEqual({ classId: 'cls_1-x', sectionId: 'sec-2_y' });
    expect(parseTeacherSectionKey('no-separator')).toBeNull();
    expect(parseTeacherSectionKey('::A')).toBeNull();
    expect(parseTeacherSectionKey('CP::')).toBeNull();
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

  it('offers across several classes only what every one of them may take', () => {
    const offered = (levels: string[]) => subjectsForTeacherClasses(subjects, levels).map(subject => subject.code);
    expect(offered(['Primaire', 'Collège'])).not.toContain('SVT');
    expect(offered(['Collège', 'Lycée'])).toContain('SVT');
    expect(subjectsForTeacherClasses(subjects, [])).toEqual(subjects);
  });

  it('recognizes normalized subject codes and preserves subjects without a code', () => {
    expect(subjectsForTeacherClass([{ id: 'svt', code: ' svt ' }, { id: 'sci', code: 'sci' }, { id: 'custom' }], 'Primaire'))
      .toEqual([{ id: 'sci', code: 'sci' }, { id: 'custom' }]);
  });
});
