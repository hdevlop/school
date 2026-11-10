import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { getTransactionalMethods } from 'najm-database';
import { MassarService, mergeObservedRounds, storedUtc, summarizeSheet } from '../../src/modules/massar/MassarService';
import { getBusinessDateOnly } from '../../src/shared/businessDate';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';
import { massarMarkDto } from '../../src/modules/massar/MassarDto';
import { template, massarTestI18n } from './fixtures';
import { exportFixture, setupFixture } from './fixtures';
import { buildImportPreview } from '../../src/modules/massar/importPreview';
import { readExport, unpack } from '../../src/modules/massar/workbook/readExport';
let i18n: Awaited<ReturnType<typeof massarTestI18n>>;
beforeAll(async () => { i18n = await massarTestI18n(); });
afterAll(async () => { await i18n?.stop(); });
const teacher = { id: 'teacher-user', role: 'teacher', permissions: ['read:massar', 'update:massar-marks'] };
const registrar = { id: 'registrar-user', role: 'registrar', permissions: ['read:massar', 'manage:massar', 'update:massar-marks'] };
function fixture(status = 'not_started') {
  const row = { sheet: { id: 'sheet-1', roundId: 'round-1', status, revision: 0, teacherUnlocked: false, exportedAt: null as string | null, roster: [{ id: 'student-1', studentCode: 'SYNTHETIC1', name: 'Synthetic student', dateOfBirth: '01-01-2018', massarStudentId: 'hidden-1', position: 0 }], components: [{ code: '1001', name: 'الخط ' }] },
    cls: { id: 'class-1', name: '1APG-1', guid: 'synthetic-guid' }, level: { code: '1APG', levelCode: '1061101010', levelCodeNumeric: true, label: 'Synthetic level', maxMark: 10, kind: 'components' }, subject: { code: '0011', name: 'Synthetic subject', observedRounds: [], confirmed: true }, teacherName: 'Synthetic teacher', round: { id: 'round-1', term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', status: 'open', dueDate: null as string | null } };
  let marks: any[] = [];
  const repository = {
    lock: async () => {}, sheetById: async (id: string) => id === 'sheet-1' ? row : undefined,
    marks: async () => marks, saveMarks: async (_id: string, data: any[]) => { marks = data; },
    hiddenIds: async () => [], previousYearSubjects: async () => [], addModelSubject: async () => {},
    // Planning gives the ready class exams in October and the college class in October to December: Contrôles 1 to 3 of semester 1.
    planningMonths: async () => [{ classId: 'school-ready', months: { '2026-10': [{ date: '2026-10-20' }] } }, { classId: 'school-college', months: { '2026-10': [{ date: '2026-10-21' }], '2026-11': [{ date: '2026-11-18' }], '2026-12': [{ date: '2026-12-16' }] } }] as Array<{ classId: string; months: Record<string, Array<{ date?: string }>> }>,
    relinkTeachers: async () => {}, sheetRosters: async () => [], activeRosters: async () => new Map(), levelSubjectCodes: async () => [], updateSheet: async (_id: string, data: any) => { Object.assign(row.sheet, data); row.sheet.revision++; return row.sheet; },
    yearConfig: async () => ({ schoolCode: 'SYNTHETIC-SCHOOL', massarYearId: 19, schoolName: 'Synthetic school', academy: 'Synthetic academy', direction: 'Synthetic direction', templateFileId: 'template.xlsx' }),
    sheets: async () => [row], completedMarkCounts: async () => [{ sheetId: row.sheet.id, completed: marks.filter(mark => mark.mark !== null || mark.absence === 'justified').length }], updateRound: async (_id: string, status: string) => { row.round.status = status; },
  };
  const service = new MassarService(repository as any, new MassarValidator(), { get: async () => Buffer.from(template) } as any, {} as any, {} as any);
  Object.defineProperty(service, 'year', { value: { id: 'year-1', label: '2026-2027', status: 'open' } });
  return { service, row, repository };
}
describe('Massar import check expiry', () => {
  it('reads the stored expiry as UTC, whatever the server time zone', () => {
    // The database returns UTC digits without a zone; local parsing in UTC+1 would expire the check an hour early.
    expect(storedUtc('2026-11-07 01:40:31.082')).toBe(Date.UTC(2026, 10, 7, 1, 40, 31, 82));
    expect(storedUtc('2026-11-07T01:40:31.082Z')).toBe(Date.UTC(2026, 10, 7, 1, 40, 31, 82));
    expect(storedUtc('2026-11-07T02:40:31+01:00')).toBe(Date.UTC(2026, 10, 7, 1, 40, 31));
  });
});
describe('Massar waiting class', () => {
  function waiting() {
    const setup = { ...setupFixture(), classes: [{ id: 'waiting', name: '1APG-1', levelId: 'level', classId: 'class-cp', sectionId: 'section-a', unmatchedCodes: ['F200000009'],
      pendingStudents: [{ studentCode: 'F200000009', name: 'تلميذ منتظر', dateOfBirth: '14-01-2019', massarStudentId: null, position: 0 }] }] } as any;
    setup.appStudents.push({ ...setup.appStudents[0], id: 'school-pupil', studentCode: '8800009/26', name: 'WAITING PUPIL', dateOfBirth: '2019-01-14', sectionId: 'section-b' });
    const calls: string[] = [];
    const repository = { lock: async () => {}, setup: async () => setup, sheets: async () => [], relinkTeachers: async () => {}, sheetRosters: async () => [], activeRosters: async () => new Map(), allRoundsForManagement: async () => [], planningMonths: async () => [] };
    const students = { update: async (id: string, data: object) => { calls.push(`update ${id} ${JSON.stringify(data)}`); }, create: async (data: { studentCode: string; gender: string }) => { calls.push(`create ${data.studentCode} ${data.gender}`); } };
    const enrollments = { placeFromSource: async (id: string, place: { sectionId: string }) => { calls.push(`place ${id} ${place.sectionId}`); } };
    const service = new MassarService(repository as any, new MassarValidator(), {} as any, students as any, enrollments as any);
    Object.defineProperty(service, 'year', { value: { id: 'year-1', label: '2026-2027', status: 'open', reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-06-30' } });
    return { service, calls };
  }
  it('suggests the same student for a pending Massar student, and links it with its Massar code, class and birth date', async () => {
    const { service, calls } = waiting();
    const pending = (await service.setup()).classes[0].pendingStudents;
    expect(pending).toEqual([{ studentCode: 'F200000009', name: 'تلميذ منتظر', dateOfBirth: '2019-01-14', suggestion: expect.objectContaining({ studentId: 'school-pupil', reasons: ['birthDate'] }) }]);
    await service.resolvePending({ massarClassId: 'waiting', matches: [{ studentCode: 'F200000009', studentId: 'school-pupil' }], additions: [] }, registrar);
    expect(calls).toEqual(['update school-pupil {"studentCode":"F200000009"}', 'place school-pupil section-a']);
  });
  it('creates a pending student from Massar, and refuses a School student the check did not suggest', async () => {
    const { service, calls } = waiting();
    await service.resolvePending({ massarClassId: 'waiting', matches: [], additions: [{ studentCode: 'F200000009', gender: 'F' }] }, registrar);
    expect(calls).toEqual(['create F200000009 F']);
    let refused = false;
    try { await service.resolvePending({ massarClassId: 'waiting', matches: [{ studentCode: 'F200000009', studentId: 'student-1' }], additions: [] }, registrar); } catch { refused = true; }
    expect(refused).toBe(true);
  });
});
describe('Massar rounds seen in files', () => {
  const test = (exam: number, examLabel: string) => ({ exam, examLabel, components: [{ code: String(exam), name: examLabel }] });
  it('takes a whole-term export as the full list of its term\'s tests, keeping the other term', async () => {
    const source = { ...await exportFixture(), term: 1, exam: 0, termLabel: 'الدورة الأولى', examLabel: '', termRounds: [test(1, 'الفرض الأول'), test(2, 'الفرض الثاني'), test(4, 'الأنشطة المندمجة')] };
    // Test 3 came from the default model; this school's Massar has no third test this term.
    const earlier = [{ term: 1, termLabel: 'الدورة الأولى', ...test(1, 'old label') }, { term: 2, termLabel: 'الدورة الثانية', ...test(1, 'الفرض الأول') }, { term: 1, termLabel: 'الدورة الأولى', ...test(3, 'الفرض الثالث') }];
    expect(mergeObservedRounds(earlier, source)).toEqual([earlier[1], ...source.termRounds.map(round => ({ term: 1, termLabel: 'الدورة الأولى', ...round }))]);
  });
  it('records one test from a single-test export, replacing only that test', async () => {
    const source = { ...await exportFixture(), term: 1, exam: 2, termLabel: 'الدورة الأولى', examLabel: 'الفرض الثاني', components: [{ code: '2', name: 'الفرض الثاني' }] };
    const earlier = [{ term: 1, termLabel: 'الدورة الأولى', ...test(1, 'الفرض الأول') }, { term: 1, termLabel: 'الدورة الأولى', ...test(2, 'old label') }];
    expect(mergeObservedRounds(earlier, source)).toEqual([earlier[0], { term: 1, termLabel: 'الدورة الأولى', ...test(2, 'الفرض الثاني') }]);
  });
});
describe('Massar is the reference on import', () => {
  it('always takes the birth date from Massar, and the class only when not kept', async () => {
    const source = await exportFixture(), setup = setupFixture();
    setup.appStudents[0] = { ...setup.appStudents[0], dateOfBirth: '2018-02-01', sectionId: 'section-b' };
    const view = buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview;
    const calls: string[] = [];
    const service = new MassarService({} as any, new MassarValidator(), {} as any,
      { update: async (id: string, data: object) => { calls.push(`update ${id} ${JSON.stringify(data)}`); } } as any,
      { placeFromSource: async (id: string, place: { sectionId: string }) => { calls.push(`place ${id} ${place.sectionId}`); } } as any);
    const commit = (fixes: string[]) => (service as any).applyFixes({ classes: [], subjects: [], fixes }, view, registrar);
    // Kept: the class stays, the birth date still follows Massar.
    await commit([]);
    expect(calls).toEqual([`update student-1 {"dateOfBirth":"${view.classes[0].students[0].dateOfBirth}"}`]);
    calls.length = 0; await commit(['SYNTHETIC1']);
    expect(calls).toEqual([`update student-1 {"dateOfBirth":"${view.classes[0].students[0].dateOfBirth}"}`, 'place student-1 section-a']);
  });
});
describe('Marks a Massar file already holds', () => {
  const roster = [{ id: 'student-1', studentCode: 'S1' }, { id: 'student-2', studentCode: 'S2' }, { id: 'student-3', studentCode: 'S3' }];
  const student = (studentCode: string, marks: Array<[string, number | null, string?]>) => ({ studentCode, marks: marks.map(([componentCode, mark, absence]) => ({ componentCode, mark, absence: absence ?? 'none' })) });
  function importer(kind: 'exam' | 'components', sheets: Array<{ id: string; term: number; exam: number; status?: string; components: Array<{ code: string }> }>, filled: Record<string, string[]> = {}) {
    const saved: Record<string, unknown[]> = {}, statuses: Record<string, string> = {};
    const repository = {
      setup: async () => ({ classes: [{ id: 'class', name: '1APIC-1' }], levels: [{ id: 'level', code: '1APIC', kind }], subjects: [{ id: 'subject', levelId: 'level', code: '0012' }] }),
      openClassSheets: async () => sheets.map(sheet => ({ status: 'not_started', roster, ...sheet })),
      // A filled cell is "student:code:mark"; no mark stands for a justified absence.
      filledCells: async (id: string) => (filled[id] ?? []).map(cell => { const [studentId, componentCode, mark] = cell.split(':'); return { studentId, componentCode, mark: mark || null, absence: mark ? 'none' : 'justified' }; }),
      saveMarks: async (id: string, marks: unknown[]) => { saved[id] = marks; },
      updateSheet: async (id: string, data: { status?: string }) => { statuses[id] = data.status ?? 'new revision'; },
    };
    const service = new MassarService(repository as any, new MassarValidator(), {} as any, {} as any, {} as any);
    return { run: (files: unknown[]) => (service as any).marksFromFiles(files, registrar) as Promise<{ added: number; replaced: number }>, saved, statuses };
  }
  it('fills each collège test grid from a whole-term file, the file replacing what School holds', async () => {
    const { run, saved, statuses } = importer('exam', [{ id: 'test-1', term: 1, exam: 1, components: [{ code: '1' }] }, { id: 'test-2', term: 1, exam: 2, components: [{ code: '2' }] }, { id: 'term-2', term: 2, exam: 1, components: [{ code: '1' }] }],
      { 'test-1': ['student-1:1:14.00', 'student-3:1:11.00'], 'test-2': ['student-1:2:14.00'] });
    const file = { className: '1APIC-1', level: '1APIC', subjectCode: '0012', term: 1, exam: 0, termRounds: [{ exam: 1 }, { exam: 2 }],
      students: [student('S1', [['1', 16], ['2', 14]]), student('S2', [['1', 9.5], ['2', null, 'justified']]), student('S3', [['1', null], ['2', null]]), student('NOT-ON-GRID', [['1', 20]])] };
    expect(await run([file])).toEqual({ added: 2, replaced: 1 });
    // Student 1's test 1 was corrected in the file (14 to 16); the same 14 on test 2 is not rewritten; student 3's empty
    // cell erases nothing; the other term and a student off the grid are left alone.
    expect(saved).toEqual({ 'test-1': [{ studentId: 'student-1', componentCode: '1', mark: 16, absence: 'none' }, { studentId: 'student-2', componentCode: '1', mark: 9.5, absence: 'none' }],
      'test-2': [{ studentId: 'student-2', componentCode: '2', mark: null, absence: 'justified' }] });
    expect(statuses).toEqual({ 'test-1': 'in_progress', 'test-2': 'in_progress' });
  });
  it('fills only its own test from a single-test collège file, and the parts of a primary grid', async () => {
    const college = importer('exam', [{ id: 'test-1', term: 1, exam: 1, components: [{ code: '1' }] }, { id: 'test-2', term: 1, exam: 2, components: [{ code: '2' }] }]);
    expect(await college.run([{ className: '1APIC-1', level: '1APIC', subjectCode: '0012', term: 1, exam: 2, students: [student('S1', [['7', 16]])] }])).toEqual({ added: 1, replaced: 0 });
    expect(college.saved).toEqual({ 'test-2': [{ studentId: 'student-1', componentCode: '2', mark: 16, absence: 'none' }] });
    const primary = importer('components', [{ id: 'primary', term: 1, exam: 1, status: 'in_progress', components: [{ code: '1001' }] }]);
    expect(await primary.run([{ className: '1APIC-1', level: '1APIC', subjectCode: '0012', term: 1, exam: 1, students: [student('S1', [['1001', 8], ['9999', 5]])] }])).toEqual({ added: 1, replaced: 0 });
    expect(primary.saved).toEqual({ primary: [{ studentId: 'student-1', componentCode: '1001', mark: 8, absence: 'none' }] });
    // The status stays, but the revision moves on: a grid open on screen shows the file's marks at once.
    expect(primary.statuses).toEqual({ primary: 'new revision' });
  });
});
describe('Massar sheet workflow', () => {
  it('computes late using the school date, never making a late sheet read-only', async () => {
    const { service, row } = fixture();
    expect(summarizeSheet(row as any, 0).late).toBe(false);
    row.round.dueDate = getBusinessDateOnly();
    expect(summarizeSheet(row as any, 0).late).toBe(false);
    row.round.dueDate = '2000-01-01';
    expect(summarizeSheet(row as any, 0).late).toBe(true);
    expect(summarizeSheet(row as any, 1).late).toBe(false);
    expect((await service.sheet('sheet-1', teacher)).canEdit).toBe(true);
    await service.saveMarks('sheet-1', { revision: 0, marks: [] }, teacher);
  });
  it('creates sheets for ready classes while reporting only the unmatched class as blocked', async () => {
    const { service, repository } = fixture();
    const setup = { ...setupFixture(), year: { templateFileId: 'synthetic.xlsx' }, classes: [{ id: 'ready', name: '1APG-1', levelId: 'level', classId: 'school-ready', unmatchedCodes: [] }, { id: 'blocked', name: '1APG-2', levelId: 'level', classId: 'school-ready', unmatchedCodes: ['MISSING'] }], levels: [{ id: 'level', kind: 'components' }], subjects: [{ id: 'subject', levelId: 'level', observedRounds: [], components: [{ code: '1001', name: 'Synthetic' }], confirmed: true }] };
    const created: string[] = [];
    const round = { id: 'round-1', term: 1, exam: 1, termLabel: 'Term', examLabel: 'Assessment', status: 'open' };
    Object.assign(repository, { setup: async () => setup, createRound: async () => round, allRoundsForManagement: async () => [round], activeRoster: async () => [], createSheet: async (sheet: { massarClassId: string }) => { created.push(sheet.massarClassId); } });
    await service.createRound(round, registrar);
    expect(created).toEqual(['ready']);
    expect(await service.blockedClasses(round.id)).toEqual([{ className: '1APG-2', unmatchedCount: 1 }]);
    // Management still sees a round when all its classes are blocked.
    expect((await service.rounds(registrar)).map(row => row.id)).toEqual([round.id]);
  });
  it('follows Planning: a class has a Contrôle’s sheet only with exams in it, and a Contrôle Planning lacks is refused', async () => {
    const { service, repository } = fixture();
    const components = [{ code: '1001', name: 'Synthetic' }];
    const setup = { ...setupFixture(), year: { templateFileId: 'synthetic.xlsx' },
      classes: [{ id: 'primary-class', name: '1APG-1', levelId: 'primary', classId: 'school-ready', unmatchedCodes: [] }, { id: 'college-class', name: '1APIC-1', levelId: 'college', classId: 'school-college', unmatchedCodes: [] }],
      levels: [{ id: 'primary', kind: 'components' }, { id: 'college', kind: 'exam' }],
      subjects: [{ id: 'primary-subject', levelId: 'primary', observedRounds: [], components, confirmed: true }, { id: 'college-subject', levelId: 'college', observedRounds: [{ term: 1, exam: 3, termLabel: 'Term', examLabel: 'Assessment 3', components }], components, confirmed: true }] };
    const created: string[] = [], round = { id: 'round-3', term: 1, exam: 3, termLabel: 'Term', examLabel: 'Assessment 3', status: 'open' };
    Object.assign(repository, { setup: async () => setup, createRound: async () => round, allRoundsForManagement: async () => [round], activeRoster: async () => [], createSheet: async (sheet: { massarClassId: string }) => { created.push(sheet.massarClassId); } });
    await service.createRound({ term: 1, exam: 3 }, registrar);
    expect(created).toEqual(['college-class']); // December holds exams for the college class only.
    repository.planningMonths = async () => [{ classId: 'school-ready', months: { '2026-10': [{ date: '2026-10-20' }] } }];
    await expect(service.createRound({ term: 1, exam: 3 }, registrar)).rejects.toMatchObject({ status: 422 });
  });
  it('saves due dates only for the Contrôles Planning holds, inside the year', async () => {
    const saved: unknown[] = [];
    const planService = (rounds: Array<{ term: number; exam: number }>, status = 'open') => {
      const planningMonths = async () => [{ classId: 'school-ready', months: { '2026-10': [{ date: '2026-10-20' }], '2026-11': [{ date: '2026-11-18' }] } }];
      const repository = { lock: async () => {}, yearConfig: async () => ({ plan: null }), allRoundsForManagement: async () => rounds, planningMonths, savePlan: async (plan: unknown) => { saved.push(plan); } };
      const service = new MassarService(repository as any, new MassarValidator(), {} as any, {} as any, {} as any);
      Object.defineProperty(service, 'year', { value: { id: 'year-1', label: '2026-2027', status, reportingStartsOn: '2026-09-01', reportingEndsOn: '2027-06-30' } });
      return service;
    };
    await planService([{ term: 1, exam: 1 }]).savePlan({ primary: 2, college: 2, dates: [{ term: 1, exam: 1, dueDate: '2026-11-15' }, { term: 1, exam: 2, dueDate: null }] });
    expect(saved).toEqual([{ primary: 2, college: 2, dates: [{ term: 1, exam: 1, dueDate: '2026-11-15' }] }]);
    const refused = async (promise: Promise<unknown>, status: number) => { const error = await promise.then(() => null, (error: unknown) => error); expect(error).toMatchObject({ status }); };
    await refused(planService([]).savePlan({ primary: 2, college: 2, dates: [{ term: 1, exam: 3, dueDate: '2026-11-15' }] }), 422); // Planning has no third month of exams.
    await refused(planService([]).savePlan({ primary: 2, college: 2, dates: [{ term: 1, exam: 1, dueDate: '2026-11-15' }, { term: 1, exam: 1, dueDate: '2026-11-20' }] }), 422);
    await refused(planService([]).savePlan({ primary: 2, college: 2, dates: [{ term: 1, exam: 1, dueDate: '2030-01-01' }] }), 422); // Outside the year.
    await refused(planService([], 'closed').savePlan({ primary: 2, college: 3, dates: [] }), 409);
    expect(getTransactionalMethods(MassarService).map(method => method.propertyKey)).toContain('savePlan');
  });
  it('gives every grid, sent or not, the class as it is now, and leaves an unchanged one alone', async () => {
    const { service, repository, row } = fixture();
    const arrival = { id: 'student-2', studentCode: 'SYNTHETIC2', name: 'Late arrival', dateOfBirth: '02-02-2018', massarStudentId: 'hidden-2', position: 1 };
    const same = { ...row.sheet.roster[0] }, reordered = Object.fromEntries(Object.entries(same).reverse()); // jsonb returns its own key order.
    const replaced: Array<[string, string[], string | undefined]> = [];
    Object.assign(repository, {
      sheetRosters: async () => [{ id: 'open', massarClassId: 'class-1', roster: [reordered], status: 'in_progress' }, { id: 'sent', massarClassId: 'class-1', roster: [same], status: 'exported' },
        { id: 'unchanged', massarClassId: 'class-2', roster: [reordered], status: 'exported' }],
      activeRosters: async () => new Map([['class-1', [same, arrival]], ['class-2', [same]]]),
      replaceSheetRoster: async (id: string, roster: Array<{ id: string }>, status?: string) => { replaced.push([id, roster.map(student => student.id), status]); },
    });
    await service.sheets('round-1');
    expect(replaced).toEqual([['open', ['student-1', 'student-2'], undefined], ['sent', ['student-1', 'student-2'], 'changed_after_export']]);
  });
  it('counts only the marks of students still on the grid', () => {
    const { row } = fixture();
    const marks = [{ studentId: 'student-1', componentCode: '1001', mark: 8, absence: 'none' }, { studentId: 'withdrawn', componentCode: '1001', mark: 9, absence: 'none' }] as any;
    expect(summarizeSheet(row as any, marks)).toMatchObject({ total: 1, missing: 0 });
  });
  it('lists progress using aggregate counts without reading mark records', async () => {
    const { service, repository } = fixture();
    repository.marks = async () => { throw new Error('List must not load marks'); };
    repository.completedMarkCounts = async () => [{ sheetId: 'sheet-1', completed: 1 }];
    expect((await service.sheets('round-1'))[0]).toMatchObject({ total: 1, missing: 0 });
  });
  it('prints arrivals without hidden IDs but refuses their filled export even after verification', async () => {
    const { service, row } = fixture();
    row.sheet.roster[0].massarStudentId = null as any;
    const empty = await service.downloadEmpty('sheet-1');
    expect(empty.name).toBe('export_notesCC_1APG-1_0011.xlsx');
    expect((await readExport(empty.bytes)).students[0].massarStudentId).toBeNull();
    expect(Object.keys(unpack(await service.exportSheets(['sheet-1'], true)))).toEqual(['export_notesCC_1APG-1_0011.xlsx']);
    await expect(service.exportSheets(['sheet-1'], false)).rejects.toThrow();
    expect(row.sheet.status).toBe('not_started');
  });
  it('keeps a subject still to confirm out of the files for Massar, but exports its class files to check', async () => {
    const { service, row, repository } = fixture(); row.subject.confirmed = false;
    await expect(service.downloadEmpty('sheet-1')).rejects.toMatchObject({ status: 409 });
    await expect(service.exportSheets(['sheet-1'], true)).rejects.toMatchObject({ status: 409 });
    await expect(service.downloadRound('round-1')).rejects.toMatchObject({ status: 409 });
    // One subject is its .xlsx, read back as a Massar file; nothing is marked as sent.
    const file = await service.exportClass(['sheet-1']);
    expect(file.name).toBe('export_notesCC_1APG-1_0011.xlsx'); expect((await readExport(file.bytes)).students).toHaveLength(1);
    expect(row.sheet.status).toBe('not_started');
    // Every subject of the class is a zip; two classes at once are refused.
    const second = structuredClone(row); second.sheet.id = 'sheet-2'; second.subject.code = '0019';
    repository.sheetById = async (id: string) => id === 'sheet-1' ? row : id === 'sheet-2' ? second : undefined;
    const zip = await service.exportClass(['sheet-1', 'sheet-2']);
    expect(zip.type).toBe('application/zip'); expect(Object.keys(unpack(zip.bytes)).sort()).toEqual(['export_notesCC_1APG-1_0011.xlsx', 'export_notesCC_1APG-1_0019.xlsx']);
    second.cls = { ...second.cls, id: 'class-2', name: '1APG-2' };
    await expect(service.exportClass(['sheet-1', 'sheet-2'])).rejects.toMatchObject({ status: 422 });
    expect(getTransactionalMethods(MassarService).map(method => method.propertyKey)).toContain('exportClass');
  }, 30000);
  it('refuses unverified later collège rounds and integrated activities before creating records', async () => {
    for (const [kind, exam] of [['exam', 2], ['components', 4]] as const) {
      const { service, repository } = fixture();
      const setup = { ...setupFixture(), year: { templateFileId: 'synthetic.xlsx' }, classes: [{ id: 'class', unmatchedCodes: [] }], levels: [{ id: 'level', kind }], subjects: [{ levelId: 'level', observedRounds: [{ term: 1, exam: 1 }], confirmed: true }] };
      Object.assign(repository, { setup: async () => setup });
      await expect(service.createRound({ term: 1, exam }, registrar)).rejects.toMatchObject({ status: 409 });
    }
  });
  it('checks limits, justified absences, duplicates, foreign students and foreign components', async () => {
    const { service } = fixture(), good = { studentId: 'student-1', componentCode: '1001', mark: 5, absence: 'none' as const };
    expect(massarMarkDto.safeParse({ ...good, absence: 'justified' }).success).toBe(false);
    for (const marks of [[{ ...good, mark: 11 }], [{ ...good, studentId: 'other' }], [{ ...good, componentCode: 'other' }], [good, good]]) {
      await expect(service.saveMarks('sheet-1', { revision: 0, marks }, teacher)).rejects.toThrow();
    }
    expect((await service.saveMarks('sheet-1', { revision: 0, marks: [good] }, teacher)).status).toBe('in_progress');
  });
  it('refuses stale saves and missing marks on submit', async () => {
    const { service } = fixture();
    await expect(service.saveMarks('sheet-1', { revision: 1, marks: [] }, teacher)).rejects.toThrow();
    await expect(service.submit('sheet-1', 0, teacher)).rejects.toThrow();
  });
  it('allows legacy submitted sheets until sent, locks sent sheets for all writers, and gives supervisors no write', async () => {
    await fixture('submitted').service.saveMarks('sheet-1', { revision: 0, marks: [] }, teacher);
    for (const actor of [teacher, registrar]) for (const status of ['exported', 'changed_after_export']) await expect(fixture(status).service.saveMarks('sheet-1', { revision: 0, marks: [] }, actor)).rejects.toThrow();
    for (const role of ['supervisor','monitor','parent','student']) await expect(fixture().service.saveMarks('sheet-1', { revision: 0, marks: [] }, { id: 'reader', role, permissions: ['update:massar-marks'] })).rejects.toThrow();
  });
  it('reopens explicitly, retains the export record, and requires re-export after editing', async () => {
    const { service, row } = fixture('exported'); row.sheet.exportedAt = '2026-11-06T00:00:00Z';
    await service.reopen('sheet-1', 0); expect(row.sheet.teacherUnlocked).toBe(true); expect(row.sheet.status).toBe('changed_after_export');
    await service.saveMarks('sheet-1', { revision: 1, marks: [{ studentId: 'student-1', componentCode: '1001', mark: 0, absence: 'none' }] }, teacher);
    await service.submit('sheet-1', 2, teacher); expect(row.sheet.teacherUnlocked).toBe(false); expect(row.sheet.status).toBe('changed_after_export');
    expect(row.sheet.exportedAt).toBe('2026-11-06T00:00:00Z');
  });
  it('allows manager edits, refuses unowned sheets, and preserves transaction boundaries', async () => {
    await expect(fixture().service.sheet('foreign-sheet', teacher)).rejects.toThrow();
    expect((await fixture('submitted').service.saveMarks('sheet-1', { revision: 0, marks: [] }, registrar)).status).toBe('in_progress');
    const transactional = getTransactionalMethods(MassarService).map(method => method.propertyKey);
    for (const method of ['commit','mappings','createRound','saveMarks','submit','reopen','closeRound','exportSheets','resolvePending']) expect(transactional).toContain(method);
  });
  it('keeps empty and filled downloads unlocked', async () => {
    const { service, row } = fixture();
    const zip = await service.exportSheets(['sheet-1'], true); expect(zip[0]).toBe(0x50); expect(row.sheet.status).toBe('not_started');
    await service.exportSheets(['sheet-1'], false); expect(row.sheet.status).toBe('not_started'); expect(row.round.status).toBe('open');
    await service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher); expect(row.sheet.status).toBe('in_progress');
    expect((await service.sheet('sheet-1', registrar)).sheet.missing).toBe(1);
  }, 30000);
  it('locks exactly the sheets the full control download sends', async () => {
    const { service, row, repository } = fixture();
    const second = structuredClone(row); second.sheet.id = 'sheet-2'; second.cls.name = '1APG-2';
    repository.sheets = async () => [row, second];
    repository.sheetById = async id => id === 'sheet-1' ? row : id === 'sheet-2' ? second : undefined;
    repository.updateSheet = async (id, data) => { const sheet = id === 'sheet-1' ? row.sheet : second.sheet; Object.assign(sheet, data); sheet.revision++; return sheet; };
    const result = await service.downloadRound('round-1');
    expect(Object.keys(unpack(result.bytes))).toHaveLength(2);
    expect(result.locked).toBe(2);
    expect(row.sheet.status).toBe('exported'); expect(second.sheet.status).toBe('exported');
    expect((row.sheet as { exportHash?: string }).exportHash).toBeTruthy();
    expect((await service.sheet('sheet-1', registrar)).canEdit).toBe(false);
    expect((await service.sheet('sheet-1', registrar)).canReopen).toBe(true);
    await expect(service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher)).rejects.toThrow();
    await service.reopen('sheet-1', row.sheet.revision);
    expect((await service.sheet('sheet-1', teacher)).canEdit).toBe(true);
    expect(row.sheet.status).toBe('changed_after_export');
    await service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher);
    expect(row.sheet.status).toBe('changed_after_export');
    expect((await service.sheet('sheet-1', { role: 'supervisor', id: 'reader' })).canEdit).toBe(false);
  }, 30000);
});
