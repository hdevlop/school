import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { getTransactionalMethods } from 'najm-database';
import { MassarService, storedUtc, summarizeSheet } from '../../src/modules/massar/MassarService';
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
    updateSheet: async (_id: string, data: any) => { Object.assign(row.sheet, data); row.sheet.revision++; return row.sheet; },
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
    const repository = { lock: async () => {}, setup: async () => setup, sheets: async () => [], allRoundsForManagement: async () => [], planningMonths: async () => [] };
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
    const original = process.env.MASSAR_FILLED_EXPORT_VERIFIED;
    try {
      process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true';
      await expect(service.exportSheets(['sheet-1'], false)).rejects.toThrow();
      expect(row.sheet.status).toBe('not_started');
    } finally { if (original === undefined) delete process.env.MASSAR_FILLED_EXPORT_VERIFIED; else process.env.MASSAR_FILLED_EXPORT_VERIFIED = original; }
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
  it('keeps empty and verified filled downloads unlocked', async () => {
    const original = process.env.MASSAR_FILLED_EXPORT_VERIFIED; delete process.env.MASSAR_FILLED_EXPORT_VERIFIED;
    try {
      const { service, row } = fixture();
      await expect(service.exportSheets(['sheet-1'], false)).rejects.toThrow();
      const zip = await service.exportSheets(['sheet-1'], true); expect(zip[0]).toBe(0x50); expect(row.sheet.status).toBe('not_started');
      process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true';
      await service.exportSheets(['sheet-1'], false); expect(row.sheet.status).toBe('not_started'); expect(row.round.status).toBe('open');
      await service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher); expect(row.sheet.status).toBe('in_progress');
      expect((await service.sheet('sheet-1', registrar)).sheet.missing).toBe(1);
    } finally { if (original === undefined) delete process.env.MASSAR_FILLED_EXPORT_VERIFIED; else process.env.MASSAR_FILLED_EXPORT_VERIFIED = original; }
  }, 30000);
  it('downloads the full control, then locks exactly those revisions on acceptance', async () => {
    const original = process.env.MASSAR_FILLED_EXPORT_VERIFIED, secret = process.env.JWT_ACCESS_SECRET;
    process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true'; process.env.JWT_ACCESS_SECRET = 'synthetic-receipt-test-secret';
    try {
      const { service, row, repository } = fixture();
      const second = structuredClone(row); second.sheet.id = 'sheet-2'; second.cls.name = '1APG-2';
      repository.sheets = async () => [row, second];
      repository.sheetById = async id => id === 'sheet-1' ? row : id === 'sheet-2' ? second : undefined;
      repository.updateSheet = async (id, data) => { const sheet = id === 'sheet-1' ? row.sheet : second.sheet; Object.assign(sheet, data); sheet.revision++; return sheet; };
      const result = await service.downloadRound('round-1');
      expect(Object.keys(unpack(result.bytes))).toHaveLength(2);
      expect(row.sheet.status).toBe('not_started'); expect(second.sheet.status).toBe('not_started');
      await expect(service.acceptDownload('round-1', result.receipt!.replace(/.$/, '!'))).rejects.toThrow();
      await expect(service.acceptDownload('other-round', result.receipt!)).rejects.toThrow();
      expect(await service.acceptDownload('round-1', result.receipt!)).toEqual({ locked: 2 });
      expect(row.sheet.status).toBe('exported'); expect(second.sheet.status).toBe('exported');
      expect((await service.sheet('sheet-1', registrar)).canEdit).toBe(false);
      expect((await service.sheet('sheet-1', registrar)).canReopen).toBe(true);
      await expect(service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher)).rejects.toThrow();
      await service.reopen('sheet-1', row.sheet.revision);
      expect((await service.sheet('sheet-1', teacher)).canEdit).toBe(true);
      expect(row.sheet.status).toBe('changed_after_export');
      const changed = await service.downloadRound('round-1');
      await service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, teacher);
      await expect(service.acceptDownload('round-1', changed.receipt!)).rejects.toThrow();
      expect(row.sheet.status).toBe('changed_after_export');
      expect((await service.sheet('sheet-1', { role: 'supervisor', id: 'reader' })).canEdit).toBe(false);
    } finally {
      if (original === undefined) delete process.env.MASSAR_FILLED_EXPORT_VERIFIED; else process.env.MASSAR_FILLED_EXPORT_VERIFIED = original;
      if (secret === undefined) delete process.env.JWT_ACCESS_SECRET; else process.env.JWT_ACCESS_SECRET = secret;
    }
  }, 30000);
});
