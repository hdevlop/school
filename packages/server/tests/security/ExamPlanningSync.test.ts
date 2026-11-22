import { describe, expect, it } from 'bun:test';
import { ExamPlanningService } from '../../src/modules/examPlanning/ExamPlanningService';
import { resolveSubject, suggestSubject } from '../../src/modules/examPlanning/planningSubjects';
import { SubjectService } from '../../src/modules/subjects/SubjectService';
import { SubjectValidator } from '../../src/modules/subjects/SubjectValidator';

const entry = { id: 'arabic', date: '2026-11-09', subject: 'اللغة العربية', lessons: ['الجملة الاسمية'] };
const admin = { id: 'admin-user', role: 'admin' };
type Part = { id: string; subjectId: string; name: string };
type Planned = { id: string; planningEntryId: string; sectionIds: string[]; teacherAssignmentId: string; title: string; description: string | null; date: string; status: string; graded: boolean; startTime: string | null; endTime: string | null };

function syncing(options: { visible?: boolean; entries?: typeof entry[]; planned?: Planned[]; subSubjects?: Part[]; added?: unknown[]; cycle?: string; slot?: boolean; levels?: Array<{ subjectId: string; level: string; names: string[] }> } = {}) {
  const calls: string[] = [], inserted: unknown[] = [];
  const months = { '2026-11': options.entries ?? [entry] };
  const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
  Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
  Object.assign(instance, { t: (key: string) => key, validator: { ensureMayChange: async () => {}, plannableSubjects: async () => null }, repository: {
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
    allNames: async () => ({ subjects: [{ id: 'arabic', name: 'العربية' }, { id: 'french', name: 'Français' }], subSubjects: options.subSubjects ?? [] }),
    levelLists: async () => options.levels ?? [],
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
    await instance.saveMonth('cp', { month: '2026-11', entries: [entry] }, admin);
    expect(calls).toEqual(['slot cp cp-b arabic']);
    expect(inserted).toEqual([exam('cp-a', 'arabic-a'), exam('cp-b', 'slot-cp-b')]);
  });
  it('gives the exam the entry time, from and to, with the duration between them', async () => {
    const timed = { ...entry, startTime: '08:30', endTime: '10:00' };
    const created = syncing({ entries: [timed] });
    await created.instance.saveMonth('cp', { month: '2026-11', entries: [timed] }, admin);
    expect(created.inserted[0]).toMatchObject({ startTime: '08:30', endTime: '10:00', duration: 90 });
    // The database reads times back as "08:30:00": the same time is no change.
    const same = syncing({ entries: [timed], planned: [planned({ startTime: '08:30:00', endTime: '10:00:00' })] });
    await same.instance.saveMonth('cp', { month: '2026-11', entries: [timed] }, admin);
    expect(same.calls.filter(call => call.startsWith('update'))).toEqual([]);
    const moved = { ...timed, startTime: '10:00', endTime: '11:00' };
    const later = syncing({ entries: [moved], planned: [planned({ startTime: '08:30:00', endTime: '10:00:00' })] });
    await later.instance.saveMonth('cp', { month: '2026-11', entries: [moved] }, admin);
    expect(later.calls.find(call => call.startsWith('update exam-a'))).toContain('"startTime":"10:00","endTime":"11:00","duration":60');
  });
  it('marks collège out of 20', async () => {
    const { instance, inserted } = syncing({ cycle: 'Collège' });
    await instance.saveMonth('cp', { month: '2026-11', entries: [entry] }, admin);
    expect(inserted[0]).toMatchObject({ totalMarks: '20', passingMarks: '10' });
  });
  it('follows Planning: a moved entry moves its exam, a removed one is deleted, or cancelled once marked', async () => {
    const moved = syncing({ slot: true, entries: [{ ...entry, date: '2026-11-12' }], planned: [planned(), planned({ id: 'exam-b', sectionIds: ['cp-b'], teacherAssignmentId: 'slot-cp-b' })] });
    await moved.instance.saveMonth('cp', { month: '2026-11', entries: [{ ...entry, date: '2026-11-12' }] }, admin);
    // CP B already has its exam: no new slot, no new exam; both exams move.
    expect(moved.calls.map(call => call.split(' ').slice(0, 2).join(' '))).toEqual(['update exam-a', 'update exam-b']);
    expect(moved.calls[0]).toContain('"date":"2026-11-12"');
    expect(moved.inserted).toEqual([]);
    const removed = syncing({ entries: [], planned: [planned(), planned({ id: 'exam-b', sectionIds: ['cp-b'], graded: true })] });
    await removed.instance.saveMonth('cp', { month: '2026-11', entries: [] }, admin);
    expect(removed.calls).toEqual(['update exam-b {"status":"cancelled"}', 'delete exam-a']);
  });
  it('makes no exam for a name Subjects does not have, and removes the exams of a hidden class', async () => {
    const missing = syncing({ subSubjects: [] });
    await missing.instance.saveMonth('cp', { month: '2026-11', entries: [entry] }, admin);
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
    expect((await instance.subjectOptions(admin)).missing).toEqual([{ name: 'اللغة العربية', suggestedSubjectId: 'arabic' }]);
    await instance.addSubSubjects([{ name: 'اللغة العربية', subjectId: 'arabic' }], admin);
    expect(added).toEqual([{ name: 'اللغة العربية', subjectId: 'arabic' }]);
    // Every open year follows, not only the one on screen.
    await expect(instance.addSubSubjects([{ name: 'x', subjectId: 'unknown' }], admin)).rejects.toThrow('subjects.errors.notFound');
    // The mock store does not keep what was added: nothing resolves yet.
    expect(inserted).toEqual([]);
  });
  it("hands Planning each level's own list, and a name of a level's list is no longer missing", async () => {
    const levels = [{ subjectId: 'arabic', level: 'CE2', names: ['اللغة العربية'] }];
    const { instance } = syncing({ subSubjects: [{ id: 'p1', subjectId: 'arabic', name: 'اللغة العربية' }], levels });
    const options = await instance.subjectOptions(admin);
    expect(options.levels).toEqual(levels);
    expect(options.missing).toEqual([]);
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
  it('finds a subject by its Arabic name, which no longer has to be one of its sub-subjects', () => {
    const named = subjects.map(subject => subject.id === 'islam' ? { ...subject, nameAr: 'التربية الإسلامية' } : subject);
    expect(resolveSubject('التربية الاسلامية', [], named)).toBe('islam');
    expect(suggestSubject('التربية الإسلامية', named)).toBe('islam');
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
  it('keeps an Arabic name to one subject: not another subject\'s name, Arabic name or sub-subject, nor one of its own sub-subjects', async () => {
    const check = validator({ allNames: async () => ({ ...names, subjects: [...names.subjects, { id: 'islam', name: 'Éducation islamique', nameAr: 'التربية الإسلامية' }] }) });
    await check.ensureNamesFree('ar', 'العربية', ['الإملاء'], 'اللغة العربية');
    await expect(check.ensureNamesFree('ar', 'العربية', ['الإملاء'], 'التربية الاسلامية')).rejects.toThrow('nameExists');
    await expect(check.ensureNamesFree('ar', 'العربية', ['الإملاء'], 'Français')).rejects.toThrow('nameExists');
    await expect(check.ensureNamesFree('fr', 'Français', [], 'الإملاء')).rejects.toThrow('subSubjectTaken');
    await expect(check.ensureNamesFree('ar', 'العربية', ['اللغة العربية'], 'اللغة العربية')).rejects.toThrow('subSubjectTwice');
    // A sub-subject named like another subject's Arabic name would find that subject.
    await expect(check.ensureNamesFree('ar', 'العربية', ['التربية الإسلامية'])).rejects.toThrow('subSubjectIsSubject');
  });
  it("lets a level's list repeat its own subject's names, never another subject's", async () => {
    // الإملاء is in العربية's school list and in its CE2 list; Grammaire only in Français's CE2 list.
    const check = validator({ allNames: async () => ({ subjects: names.subjects, subSubjects: [...names.subSubjects, { id: 'p2', subjectId: 'ar', name: 'الإملاء', level: 'CE2' }, { id: 'p3', subjectId: 'fr', name: 'Grammaire', level: 'CE2' }] }) });
    await check.ensureNamesFree('ar', 'العربية', ['الإملاء', 'القراءة']);
    await expect(check.ensureNamesFree('ar', 'العربية', ['Grammaire'])).rejects.toThrow('subSubjectTaken');
  });
  it("lets the school-wide roles edit every level's list, and a teacher only a subject they teach in that class", async () => {
    const asked: unknown[] = [];
    const check = validator({ teachesInLevel: async (...args: unknown[]) => { asked.push(args); return args[1] === 'islam' && args[2] === 'CE2'; } });
    await check.ensureMayEditLevel({ id: 'u', role: 'principal' }, 'islam', '3APG');
    expect(asked).toHaveLength(0);
    await check.ensureMayEditLevel({ id: 'teacher-user', role: 'teacher' }, 'islam', 'CE2');
    expect(asked).toEqual([['teacher-user', 'islam', 'CE2']]);
    await expect(check.ensureMayEditLevel({ id: 'teacher-user', role: 'teacher' }, 'islam', '3APG')).rejects.toThrow('notYourLevel');
    await expect(check.ensureMayEditLevel({ id: 'teacher-user', role: 'teacher' }, 'fr', 'CE2')).rejects.toThrow('notYourLevel');
    // Any other role granted the permission edits none.
    await expect(check.ensureMayEditLevel({ id: 'u', role: 'monitor' }, 'islam', 'CE2')).rejects.toThrow('notYourLevel');
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
