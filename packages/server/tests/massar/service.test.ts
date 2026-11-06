import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { getTransactionalMethods } from 'najm-database';
import { MassarService } from '../../src/modules/massar/MassarService';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';
import { massarMarkDto } from '../../src/modules/massar/MassarDto';
import { template, massarTestI18n } from './fixtures';
import { setupFixture } from './fixtures';
import { readExport, unpack } from '../../src/modules/massar/workbook/readExport';
let i18n: Awaited<ReturnType<typeof massarTestI18n>>;
beforeAll(async () => { i18n = await massarTestI18n(); });
afterAll(async () => { await i18n?.stop(); });
const teacher = { id: 'teacher-user', role: 'teacher', permissions: ['read:massar', 'update:massar-marks'] };
const registrar = { id: 'registrar-user', role: 'registrar', permissions: ['read:massar', 'manage:massar', 'update:massar-marks'] };
function fixture(status = 'not_started') {
  const row = { sheet: { id: 'sheet-1', roundId: 'round-1', status, revision: 0, teacherUnlocked: false, exportedAt: null as string | null, roster: [{ id: 'student-1', studentCode: 'SYNTHETIC1', name: 'Synthetic student', dateOfBirth: '01-01-2018', massarStudentId: 'hidden-1', position: 0 }], components: [{ code: '1001', name: 'الخط ' }] },
    cls: { id: 'class-1', name: '1APG-1', guid: 'synthetic-guid' }, level: { code: '1APG', levelCode: '1061101010', levelCodeNumeric: true, label: 'Synthetic level', maxMark: 10, kind: 'components' }, subject: { code: '0011', name: 'Synthetic subject' }, teacherName: 'Synthetic teacher', round: { id: 'round-1', term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول', status: 'open' } };
  let marks: any[] = [];
  const repository = {
    lock: async () => {}, sheetById: async (id: string) => id === 'sheet-1' ? row : undefined,
    marks: async () => marks, saveMarks: async (_id: string, data: any[]) => { marks = data; },
    hiddenIds: async () => [],
    updateSheet: async (_id: string, data: any) => { Object.assign(row.sheet, data); row.sheet.revision++; return row.sheet; },
    yearConfig: async () => ({ schoolCode: 'SYNTHETIC-SCHOOL', massarYearId: 19, schoolName: 'Synthetic school', academy: 'Synthetic academy', direction: 'Synthetic direction', templateFileId: 'template.xlsx' }),
    sheets: async () => [row], completedMarkCounts: async () => [{ sheetId: row.sheet.id, completed: marks.filter(mark => mark.mark !== null || mark.absence === 'justified').length }], updateRound: async (_id: string, status: string) => { row.round.status = status; },
  };
  const service = new MassarService(repository as any, new MassarValidator(), { get: async () => Buffer.from(template) } as any);
  Object.defineProperty(service, 'year', { value: { id: 'year-1', label: '2026-2027', status: 'open' } });
  return { service, row, repository };
}
describe('Massar sheet workflow', () => {
  it('creates sheets for ready classes while reporting only the unmatched class as blocked', async () => {
    const { service, repository } = fixture();
    const setup = { ...setupFixture(), year: { templateFileId: 'synthetic.xlsx' }, classes: [{ id: 'ready', name: '1APG-1', levelId: 'level', unmatchedCodes: [] }, { id: 'blocked', name: '1APG-2', levelId: 'level', unmatchedCodes: ['MISSING'] }], levels: [{ id: 'level', kind: 'components' }], subjects: [{ id: 'subject', levelId: 'level', observedRounds: [], components: [{ code: '1001', name: 'Synthetic' }] }] };
    const created: string[] = [];
    const round = { id: 'round-1', term: 1, exam: 1, termLabel: 'Term', examLabel: 'Assessment', status: 'open' };
    Object.assign(repository, { setup: async () => setup, createRound: async () => round, allRoundsForManagement: async () => [round], activeRoster: async () => [], createSheet: async (sheet: { massarClassId: string }) => { created.push(sheet.massarClassId); } });
    await service.createRound(round, registrar);
    expect(created).toEqual(['ready']);
    expect(await service.blockedClasses(round.id)).toEqual([{ className: '1APG-2', unmatchedCount: 1 }]);
    // Management still sees a round when all its classes are blocked.
    expect((await service.rounds(registrar)).map(row => row.id)).toEqual([round.id]);
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
  it('refuses unverified later collège rounds and integrated activities before creating records', async () => {
    for (const [kind, exam] of [['exam', 2], ['components', 4]] as const) {
      const { service, repository } = fixture();
      const setup = { ...setupFixture(), year: { templateFileId: 'synthetic.xlsx' }, classes: [{ id: 'class', unmatchedCodes: [] }], levels: [{ id: 'level', kind }], subjects: [{ levelId: 'level', observedRounds: [{ term: 1, exam: 1 }] }] };
      Object.assign(repository, { setup: async () => setup });
      await expect(service.createRound({ term: 1, exam, termLabel: 'الدورة الأولى', examLabel: 'Synthetic assessment' }, registrar)).rejects.toMatchObject({ status: 409 });
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
  it('locks submitted/exported sheets for teachers, and gives supervisors no write even if granted the permission', async () => {
    for (const status of ['submitted', 'exported', 'changed_after_export']) await expect(fixture(status).service.saveMarks('sheet-1', { revision: 0, marks: [] }, teacher)).rejects.toThrow();
    for (const role of ['supervisor','floor_manager','parent','student']) await expect(fixture().service.saveMarks('sheet-1', { revision: 0, marks: [] }, { id: 'reader', role, permissions: ['update:massar-marks'] })).rejects.toThrow();
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
    for (const method of ['commit','mappings','createRound','saveMarks','submit','reopen','closeRound','exportSheets','addStudent','leaveStudent']) expect(transactional).toContain(method);
  });
  it('keeps empty exports unlocked and records hashes only for verified filled exports', async () => {
    const original = process.env.MASSAR_FILLED_EXPORT_VERIFIED; delete process.env.MASSAR_FILLED_EXPORT_VERIFIED;
    try {
      const { service, row } = fixture();
      await expect(service.exportSheets(['sheet-1'], false)).rejects.toThrow();
      const zip = await service.exportSheets(['sheet-1'], true); expect(zip[0]).toBe(0x50); expect(row.sheet.status).toBe('not_started');
      process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true';
      await service.exportSheets(['sheet-1'], false); expect(row.sheet.status).toBe('exported'); expect(row.round.status).toBe('exported');
      await service.saveMarks('sheet-1', { revision: row.sheet.revision, marks: [] }, registrar); expect(row.sheet.status).toBe('changed_after_export');
      expect((await service.sheet('sheet-1', registrar)).sheet.missing).toBe(1);
    } finally { if (original === undefined) delete process.env.MASSAR_FILLED_EXPORT_VERIFIED; else process.env.MASSAR_FILLED_EXPORT_VERIFIED = original; }
  }, 30000);
});
