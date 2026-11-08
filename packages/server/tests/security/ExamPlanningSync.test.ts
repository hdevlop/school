import { describe, expect, it } from 'bun:test';
import { ExamPlanningService } from '../../src/modules/examPlanning/ExamPlanningService';
import { resolveSubject, suggestSubject } from '../../src/modules/examPlanning/planningSubjects';
import { SubjectService } from '../../src/modules/subjects/SubjectService';
import { SubjectValidator } from '../../src/modules/subjects/SubjectValidator';

const entry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
type Part = { id: string; subjectId: string; name: string };
type Planned = { id: string; planningEntryId: string; sectionIds: string[]; teacherAssignmentId: string; title: string; description: string | null; date: string; status: string; graded: boolean; startTime: string | null; endTime: string | null };

function syncing(options: { visible?: boolean; entries?: typeof entry[]; planned?: Planned[]; subSubjects?: Part[]; added?: unknown[]; cycle?: string; slot?: boolean } = {}) {
  const calls: string[] = [], inserted: unknown[] = [];
  const months = { '2026-11': options.entries ?? [entry] };
  const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
  Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
  Object.assign(instance, { t: (key: string) => key, repository: {
    getAll: async () => [{ id: 'cp', name: 'CP', visible: options.visible ?? true, months }],
    openPlans: async () => [{ academicYearId: 'next-year', id: 'cp', visible: options.visible ?? true, months }],
    renameEverywhere: async (renames: unknown[]) => { calls.push(`rename ${JSON.stringify(renames)}`); },
    saveMonth: async () => {},
    saveVisibility: async () => {},
    syncContext: async () => ({
      classes: [{ id: 'cp', level: options.cycle ?? 'Primaire', cycle: options.cycle ?? 'Primaire' }],
      sections: [{ id: 'cp-a', classId: 'cp' }, { id: 'cp-b', classId: 'cp' }],
      // CP A has an Arabic teacher; CP B does not.
      assignments: [{ id: 'arabic-a', classId: 'cp', sectionId: 'cp-a', subjectId: 'arabic', teacherId: 'salma' },
        ...(options.slot ? [{ id: 'slot-cp-b', classId: 'cp', sectionId: 'cp-b', subjectId: 'arabic', teacherId: null }] : [])],
      subjects: [{ id: 'arabic', name: 'العربية' }, { id: 'french', name: 'Français' }],
      // "اللغة العربية" is a sub-subject of العربية.
      subSubjects: options.subSubjects ?? [{ id: 'p1', subjectId: 'arabic', name: 'اللغة العربية' }],
      planned: options.planned ?? [],
    }),
    createSlot: async (classId: string, sectionId: string, subjectId: string) => { calls.push(`slot ${classId} ${sectionId} ${subjectId}`); return `slot-${sectionId}`; },
    insertExam: async (values: unknown) => { inserted.push(values); },
    updateExam: async (id: string, values: object) => { calls.push(`update ${id} ${JSON.stringify(values)}`); },
    deleteExams: async (ids: string[]) => { if (ids.length) calls.push(`delete ${ids.join(',')}`); },
  }, subjectRepository: {
    getAll: async () => [{ id: 'arabic', name: 'العربية', subSubjects: (options.subSubjects ?? []).filter(part => part.subjectId === 'arabic') }, { id: 'french', name: 'Français', subSubjects: [] }],
    addSubSubjects: async (items: unknown[]) => { options.added?.push(...items); },
  }, subjectValidator: { ensureNamesFree: async () => {} } });
  return { instance, calls, inserted };
}
const planned = (values: Partial<Planned> = {}): Planned => ({ id: 'exam-a', planningEntryId: 'arabic', sectionIds: ['cp-a'], teacherAssignmentId: 'arabic-a', title: 'اللغة العربية', description: 'الجملة الاسمية', date: '2026-11-09', status: 'scheduled', graded: false, startTime: null, endTime: null, ...values });
const exam = (section: string, assignment: string) => ({ teacherAssignmentId: assignment, academicYearId: 'year', title: 'اللغة العربية', description: 'الجملة الاسمية', type: 'test', date: '2026-11-09',
  startTime: null, endTime: null, duration: 60, totalMarks: '10', passingMarks: '5', status: 'scheduled', sectionIds: [section], planningEntryId: 'arabic' });

describe('Planning creates the Exams page exams', () => {
  it('creates one Contrôle per section, with an empty slot where the subject has no teacher yet', async () => {
    const { instance, calls, inserted } = syncing();
    await instance.saveMonth('cp', { month: '2026-11', entries: [entry] });
    expect(calls).toEqual(['slot cp cp-b arabic']);
    expect(inserted).toEqual([exam('cp-a', 'arabic-a'), exam('cp-b', 'slot-cp-b')]);
  });
  it('gives the exam the entry time, from and to, with the duration between them', async () => {
    const timed = { ...entry, startTime: '08:30', endTime: '10:00' };
    const created = syncing({ entries: [timed] });
    await created.instance.saveMonth('cp', { month: '2026-11', entries: [timed] });
    expect(created.inserted[0]).toMatchObject({ startTime: '08:30', endTime: '10:00', duration: 90 });
    // The database reads times back as "08:30:00": the same time is no change.
    const same = syncing({ entries: [timed], planned: [planned({ startTime: '08:30:00', endTime: '10:00:00' })] });
    await same.instance.saveMonth('cp', { month: '2026-11', entries: [timed] });
    expect(same.calls.filter(call => call.startsWith('update'))).toEqual([]);
    const moved = { ...timed, startTime: '10:00', endTime: '11:00' };
    const later = syncing({ entries: [moved], planned: [planned({ startTime: '08:30:00', endTime: '10:00:00' })] });
    await later.instance.saveMonth('cp', { month: '2026-11', entries: [moved] });
    expect(later.calls.find(call => call.startsWith('update exam-a'))).toContain('"startTime":"10:00","endTime":"11:00","duration":60');
  });
  it('marks collège out of 20', async () => {
    const { instance, inserted } = syncing({ cycle: 'Collège' });
    await instance.saveMonth('cp', { month: '2026-11', entries: [entry] });
    expect(inserted[0]).toMatchObject({ totalMarks: '20', passingMarks: '10' });
  });
  it('follows Planning: a moved entry moves its exam, a removed one is deleted, or cancelled once marked', async () => {
    const moved = syncing({ slot: true, entries: [{ ...entry, date: '2026-11-12' }], planned: [planned(), planned({ id: 'exam-b', sectionIds: ['cp-b'], teacherAssignmentId: 'slot-cp-b' })] });
    await moved.instance.saveMonth('cp', { month: '2026-11', entries: [{ ...entry, date: '2026-11-12' }] });
    // CP B already has its exam: no new slot, no new exam; both exams move.
    expect(moved.calls.map(call => call.split(' ').slice(0, 2).join(' '))).toEqual(['update exam-a', 'update exam-b']);
    expect(moved.calls[0]).toContain('"date":"2026-11-12"');
    expect(moved.inserted).toEqual([]);
    const removed = syncing({ entries: [], planned: [planned(), planned({ id: 'exam-b', sectionIds: ['cp-b'], graded: true })] });
    await removed.instance.saveMonth('cp', { month: '2026-11', entries: [] });
    expect(removed.calls).toEqual(['update exam-b {"status":"cancelled"}', 'delete exam-a']);
  });
  it('makes no exam for a name Subjects does not have, and removes the exams of a hidden class', async () => {
    const missing = syncing({ subSubjects: [] });
    await missing.instance.saveMonth('cp', { month: '2026-11', entries: [entry] });
    expect(missing.inserted).toEqual([]);
    const hidden = syncing({ visible: false, planned: [planned()] });
    await hidden.instance.saveVisibility([]);
    expect(hidden.calls).toEqual(['delete exam-a']);
  });
  it('follows a change in Subjects in every open year: renames first, then exams', async () => {
    const { instance, calls, inserted } = syncing();
    await instance.followSubjects([{ from: 'العربية', to: 'اللغة' }]);
    expect(calls[0]).toBe('rename [{"from":"العربية","to":"اللغة"}]');
    expect(inserted).toEqual([exam('cp-a', 'arabic-a'), exam('cp-b', 'slot-cp-b')].map(row => ({ ...row, academicYearId: 'next-year' })));
  });
  it('lists the names Subjects lacks with a suggestion, and adding them makes their exams', async () => {
    const added: unknown[] = [];
    const { instance, inserted } = syncing({ subSubjects: [], added });
    expect((await instance.subjectOptions()).missing).toEqual([{ name: 'اللغة العربية', suggestedSubjectId: 'arabic' }]);
    await instance.addSubSubjects([{ name: 'اللغة العربية', subjectId: 'arabic' }]);
    expect(added).toEqual([{ name: 'اللغة العربية', subjectId: 'arabic' }]);
    // Every open year follows, not only the one on screen.
    await expect(instance.addSubSubjects([{ name: 'x', subjectId: 'unknown' }])).rejects.toThrow('subjects.errors.notFound');
    // The mock store does not keep what was added: nothing resolves yet.
    expect(inserted).toEqual([]);
  });
});

describe('Planning subject suggestions', () => {
  const subjects = [{ id: 'fr', name: 'Français' }, { id: 'ar', name: 'العربية' }, { id: 'islam', name: 'Éducation islamique' }, { id: 'art', name: 'Éducation artistique' }, { id: 'sci', name: 'Activité scientifique' }, { id: 'svt', name: 'Sciences de la vie et de la Terre' }, { id: 'hist', name: 'Histoire-géographie et éducation à la citoyenneté' }, { id: 'math', name: 'Mathématiques' }];
  it('suggests the School subject a Planning subject belongs to', () => {
    const cases: Array<[string, string | null]> = [['Mathématiques', 'math'], ['Grammaire', 'fr'], ['Dictée', 'fr'], ['Étude du son', 'fr'], ['الإملاء', 'ar'], ['التعبير الكتابي', 'ar'], ['التربية الإسلامية', 'islam'], ['التربية الفنية', 'art'], ['Sciences', 'sci'], ['الاجتماعيات', 'hist'], ['Robotique', null]];
    for (const [name, expected] of cases) expect([name, suggestSubject(name, subjects)]).toEqual([name, expected]);
  });
  it('finds the subject through its sub-subject, or a subject of the same name, ignoring case and accents', () => {
    const parts = [{ subjectId: 'fr', name: 'Grammaire' }, { subjectId: 'ar', name: 'الإملاء' }];
    expect(resolveSubject(' grammaire ', parts, subjects)).toBe('fr');
    expect(resolveSubject('الاملاء', parts, subjects)).toBe('ar');
    expect(resolveSubject('Mathematiques', parts, subjects)).toBe('math');
    expect(resolveSubject('Robotique', parts, subjects)).toBeNull();
  });
});

describe('Subjects own the sub-subjects Planning picks from', () => {
  const names = { subjects: [{ id: 'fr', name: 'Français' }, { id: 'ar', name: 'العربية' }], subSubjects: [{ id: 'p1', subjectId: 'ar', name: 'الإملاء' }] };
  const validator = (repository: object = { allNames: async () => names }) => Object.assign(new SubjectValidator(repository as any), { t: (key: string) => key });
  it('refuses a name written twice, a subject name, or another subject\'s sub-subject', async () => {
    const check = validator();
    await check.ensureNamesFree('fr', 'Français', ['Grammaire', 'Dictée']);
    await expect(check.ensureNamesFree('fr', 'Français', ['Grammaire', ' grammaire'])).rejects.toThrow('subSubjectTwice');
    await expect(check.ensureNamesFree('fr', 'Français', ['العربية'])).rejects.toThrow('subSubjectIsSubject');
    await expect(check.ensureNamesFree('fr', 'Français', ['الاملاء'])).rejects.toThrow('subSubjectTaken');
    await expect(check.ensureNamesFree('fr', 'Français', ['français'])).rejects.toThrow('subSubjectTwice');
    // Its own sub-subjects may stay as they are.
    await check.ensureNamesFree('ar', 'العربية', ['الإملاء']);
  });
  it('renames a renamed subject or sub-subject in Planning too', async () => {
    const renames: unknown[] = [];
    const repository = {
      getById: async () => ({ id: 'fr', name: 'Français', code: 'FR', subSubjects: [{ id: 'p2', name: 'Grammaire' }] }),
      allNames: async () => names,
      update: async () => {},
      saveSubSubjects: async () => [{ from: 'Grammaire', to: 'Grammaire et conjugaison' }],
    };
    const service = new SubjectService(repository as any, validator(repository) as any, { followSubjects: async (list: unknown[]) => { renames.push(...list); } } as any);
    await service.update('fr', { name: 'Langue française', subSubjects: [{ id: 'p2', name: 'Grammaire et conjugaison' }] });
    expect(renames).toEqual([{ from: 'Grammaire', to: 'Grammaire et conjugaison' }, { from: 'Français', to: 'Langue française' }]);
  });
});
