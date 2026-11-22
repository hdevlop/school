import { describe, expect, it } from 'bun:test';
import { importExamPlanningDto, saveExamPlanningDto } from '../../src/modules/examPlanning/ExamPlanningDto';
import { ExamPlanningService } from '../../src/modules/examPlanning/ExamPlanningService';
import { ExamPlanningValidator } from '../../src/modules/examPlanning/ExamPlanningValidator';

const entry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
const valid = { month: '2026-11', entries: [entry] };
const principal = { id: 'principal-user', role: 'principal' };

function service(catalog = [{ id: 'cp', name: 'CP' }]) {
  const writes: unknown[] = [];
  const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
  Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
  Object.assign(instance, { t: (key: string) => key, validator: { ensureMayChange: async () => {}, plannableSubjects: async () => null }, repository: {
    getAll: async () => catalog.map(cls => ({ ...cls, visible: null, months: null })),
    saveMonth: async (...args: unknown[]) => { writes.push(args); },
    saveVisibility: async (...args: unknown[]) => { writes.push(args); },
    importDocument: async (...args: unknown[]) => { writes.push(args); },
    clearContent: async (...args: unknown[]) => { writes.push(args); },
    syncContext: async () => ({ classes: [], sections: [], assignments: [], subjects: [], subSubjects: [], planned: [] }),
    deleteExams: async () => {},
  } });
  return { instance, writes };
}

describe('independent exam planning', () => {
  it('clears content only for the classes returned by the owned year catalog', async () => {
    const { instance, writes } = service();
    await instance.clearContent();
    expect(writes).toEqual([[['cp']]]);
  });
  it('accepts bilingual plans without requiring an assessment, teacher assignment or semester field', () => {
    expect(saveExamPlanningDto.parse(valid)).toEqual(valid);
    expect(saveExamPlanningDto.parse({ month: '2026-11', entries: [] }).entries).toEqual([]);
  });
  it('rejects wrong-month dates, invalid calendar dates, duplicate IDs and oversized topics', () => {
    for (const entries of [[{ ...entry, date: '2026-10-09' }], [{ ...entry, date: '2026-11-31' }], [entry, entry], [{ ...entry, subject: ' ' }], [{ ...entry, lessons: ['x'.repeat(501)] }], [{ ...entry, lessons: Array(41).fill('Lesson') }], Array.from({ length: 201 }, (_, i) => ({ ...entry, id: `${i}` }))]) {
      expect(saveExamPlanningDto.safeParse({ ...valid, entries }).success).toBe(false);
    }
  });
  it('includes existing classes with no stored plan and defaults them to visible', async () => {
    expect(await service().instance.getAll()).toEqual([{ id: 'cp', name: 'CP', visible: true, months: {} }]);
  });
  it('refuses a class outside the scoped catalog and a month outside the selected year before writing', async () => {
    const { instance, writes } = service();
    await expect(instance.saveMonth('other-class', saveExamPlanningDto.parse(valid), principal)).rejects.toThrow();
    await expect(instance.saveMonth('cp', { month: '2025-11', entries: [] }, principal)).rejects.toThrow();
    await expect(instance.saveVisibility(['other-class'])).rejects.toThrow();
    expect(writes).toHaveLength(0);
  });
  it('saves empty months and class visibility without requiring any graded records', async () => {
    const { instance, writes } = service();
    await instance.saveMonth('cp', { month: '2026-11', entries: [] }, principal);
    await instance.saveVisibility([]);
    expect(writes).toEqual([['cp', { month: '2026-11', entries: [] }], [['cp'], []]]);
  });

  it('rejects a different year or any unknown class before importing the batch', async () => {
    const { instance, writes } = service();
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ name: 'CP', visible: false, months: {} }] } }).document;
    await expect(instance.importDocument({ ...document, schoolYear: '2025-2026' })).rejects.toThrow();
    await expect(instance.importDocument({ ...document, classes: [...document.classes, { ...document.classes[0], name: 'Foreign class' }] })).rejects.toThrow();
    expect(writes).toHaveLength(0);
    await instance.importDocument(document);
    expect(writes).toEqual([[document.classes.map(cls => ({ ...cls, id: 'cp' }))]]);
  });

  it('imports both ID-free and legacy files by name using only destination class IDs', async () => {
    const { instance, writes } = service([{ id: 'destination-cp', name: 'CP' }, { id: 'destination-ce1', name: 'CE1' }]);
    const legacy = { format: 'school-exam-planning', version: 1, schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [
      { id: 'source-cp', name: ' cp ', visible: false, months: { '2026-11': [entry], '2027-02': [] } },
      { id: 'source-ce1', name: 'CE1', visible: true, months: {} },
    ] };
    const document = importExamPlanningDto.parse({ document: legacy }).document;
    expect(document.classes.every(cls => !('id' in cls))).toBe(true);
    await instance.importDocument(document);
    await instance.importDocument(importExamPlanningDto.parse({ document }).document);
    const resolved = [
      { ...document.classes[0], id: 'destination-cp', name: 'CP' },
      { ...document.classes[1], id: 'destination-ce1' },
    ];
    expect(writes).toEqual([[resolved], [resolved]]);
  });

  it('rejects an unknown name even when a legacy ID matches a local class', async () => {
    const { instance, writes } = service();
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ id: 'cp', name: 'Foreign class', visible: true, months: {} }] } }).document;
    await expect(instance.importDocument(document)).rejects.toThrow('examPlanning.json.unknownClasses');
    expect(writes).toHaveLength(0);
  });

  it('rejects ambiguous destination names before writing any part of the batch', async () => {
    const { instance, writes } = service([{ id: 'one', name: 'CP' }, { id: 'two', name: ' cp ' }]);
    const document = importExamPlanningDto.parse({ document: { format: 'school-exam-planning', version: 1,
      schoolYear: '2026-2027', exportedAt: new Date().toISOString(), classes: [{ name: 'CP', visible: false, months: {} }] } }).document;
    await expect(instance.importDocument(document)).rejects.toThrow('examPlanning.json.ambiguousClasses');
    expect(writes).toHaveLength(0);
  });
});

describe('a teacher plans the subjects they teach in their own classes', () => {
  const subjects = [
    { id: 'fr', name: 'Langue française', subSubjects: [{ name: 'Grammaire' }, { name: 'Dictée' }] },
    { id: 'ar', name: 'اللغة العربية', subSubjects: [{ name: 'الإملاء' }] },
    { id: 'math', name: 'Mathématiques', subSubjects: [] },
  ];
  const french = { id: 'fr-1', date: '2026-11-10', subject: 'Grammaire', lessons: ['Le nom'] };
  const arabic = { id: 'ar-1', date: '2026-11-11', subject: 'الإملاء', lessons: ['الهمزة'] };
  const teacher = { id: 'teacher-user', role: 'teacher' };

  function validator(taught: Array<{ classId: string; subjectId: string }>) {
    const asked: unknown[] = [];
    const instance = Object.create(ExamPlanningValidator.prototype) as ExamPlanningValidator;
    Object.assign(instance, { et: (key: string) => key,
      repository: { taughtSubjects: async (...args: unknown[]) => { asked.push(args); return taught; } },
      // Every list's names, as the repository reads them for Planning.
      subjectRepository: { allNames: async () => ({ subjects, subSubjects: subjects.flatMap(subject => subject.subSubjects.map(part => ({ subjectId: subject.id, name: part.name }))) }) } });
    return { instance, asked };
  }

  it('lets the school-wide roles plan every subject without looking up assignments', async () => {
    const { instance, asked } = validator([]);
    await instance.ensureMayChange({ id: 'u', role: 'principal' }, 'cp', [french], [arabic]);
    expect(await instance.plannableSubjects({ id: 'u', role: 'secretary' }, ['cp'])).toBeNull();
    expect(asked).toHaveLength(0);
  });

  it('accepts adding, editing and removing an entry of a subject the teacher teaches there, through its sub-subject', async () => {
    const { instance, asked } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    await instance.ensureMayChange(teacher, 'cp', [arabic], [arabic, french], french.date);
    await instance.ensureMayChange(teacher, 'cp', [arabic, french], [arabic, { ...french, subject: 'Dictée', lessons: ['Les accents'] }]);
    await instance.ensureMayChange(teacher, 'cp', [arabic, french], [arabic]);
    expect(asked[0]).toEqual([teacher.id, ['cp']]);
  });

  it("accepts another subject's entry sent back unchanged, in any order, with whitespace trimmed", async () => {
    const { instance } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    await instance.ensureMayChange(teacher, 'cp', [arabic, french], [french, { ...arabic, subject: ' الإملاء ' }]);
  });

  it("refuses a change to another subject's entry, moving an entry to another subject, and a name Subjects lacks", async () => {
    const { instance } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    for (const [before, after] of [
      [[arabic], [{ ...arabic, lessons: ['x'] }]],
      [[arabic], []],
      [[], [{ ...arabic, id: 'new' }]],
      [[french], [{ ...french, subject: 'Mathématiques' }]],
      [[], [{ ...french, id: 'new', subject: 'Robotique' }]],
    ] as const) {
      await expect(instance.ensureMayChange(teacher, 'cp', before, after)).rejects.toThrow('notYourSubject');
    }
  });

  it('leaves the day and time to the school: a teacher keeps them, and a new exam takes the Contrôle’s first day with no time', async () => {
    const { instance } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    const timed = { ...french, startTime: '08:30', endTime: '09:30' };
    for (const [before, after, firstDay] of [
      [[french], [{ ...french, date: '2026-11-12' }], '2026-11-09'],
      [[french], [timed], '2026-11-09'],
      [[timed], [{ ...timed, startTime: '10:00', endTime: '11:00' }], '2026-11-09'],
      [[], [{ ...french, id: 'new' }], '2026-11-09'],
      [[], [{ ...timed, id: 'new', date: '2026-11-09' }], '2026-11-09'],
    ] as const) {
      await expect(instance.ensureMayChange(teacher, 'cp', before, after, firstDay)).rejects.toThrow('scheduleBySchool');
    }
    // The lessons are the teacher's: changing them keeps the school's day and time.
    await instance.ensureMayChange(teacher, 'cp', [timed], [{ ...timed, lessons: ['Le verbe'] }], '2026-11-09');
    await instance.ensureMayChange(teacher, 'cp', [], [{ ...french, id: 'new', date: '2026-11-09' }], '2026-11-09');
  });

  it('refuses a new exam in a month the school has not opened as a Contrôle', async () => {
    const { instance } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    await expect(instance.ensureMayChange(teacher, 'cp', [], [{ ...french, id: 'new' }], null)).rejects.toThrow('controlNotOpen');
  });

  it('lets the school-wide roles set any day and time', async () => {
    const { instance } = validator([]);
    await instance.ensureMayChange({ id: 'u', role: 'principal' }, 'cp', [french], [{ ...french, date: '2026-11-20', startTime: '10:00', endTime: '11:00' }], null);
  });

  it('refuses a subject the teacher teaches only in another class', async () => {
    const { instance } = validator([{ classId: 'ce1', subjectId: 'ar' }]);
    await expect(instance.ensureMayChange(teacher, 'cp', [], [arabic])).rejects.toThrow('notYourSubject');
  });

  it('refuses any other role granted the permission, and offers it nothing to plan', async () => {
    const { instance, asked } = validator([{ classId: 'cp', subjectId: 'fr' }]);
    await expect(instance.ensureMayChange({ id: 'u', role: 'monitor' }, 'cp', [], [french])).rejects.toThrow('notAllowed');
    expect(await instance.plannableSubjects({ id: 'u', role: 'supervisor' }, ['cp'])).toEqual({ cp: [] });
    expect(asked).toHaveLength(0);
  });

  it("lists each class's taught subjects once", async () => {
    const { instance } = validator([{ classId: 'cp', subjectId: 'fr' }, { classId: 'cp', subjectId: 'fr' }, { classId: 'ce1', subjectId: 'ar' }]);
    expect(await instance.plannableSubjects(teacher, ['cp', 'ce1', 'ce2'])).toEqual({ cp: ['fr'], ce1: ['ar'], ce2: [] });
  });

  it('checks the stored month against the saved one before writing', async () => {
    const writes: unknown[] = [], checked: unknown[] = [];
    const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
    Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
    Object.assign(instance, { t: (key: string) => key,
      validator: { ensureMayChange: async (...args: unknown[]) => { checked.push(args); throw new Error('notYourSubject'); } },
      repository: { getAll: async () => [{ id: 'cp', name: 'CP', visible: true, months: { '2026-11': [arabic] } }], saveMonth: async (...args: unknown[]) => { writes.push(args); } } });
    await expect(instance.saveMonth('cp', { month: '2026-11', entries: [] }, teacher)).rejects.toThrow('notYourSubject');
    expect(checked).toEqual([[teacher, 'cp', [arabic], [], arabic.date]]);
    expect(writes).toHaveLength(0);
  });
});
