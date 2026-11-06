import 'reflect-metadata';
import { afterAll, beforeAll, expect, it } from 'bun:test';
import { and, eq, sql } from 'drizzle-orm';
import { strFromU8, strToU8, zipSync } from 'fflate';
import { MassarRepository } from '../../src/modules/massar/MassarRepository';
import { MassarService } from '../../src/modules/massar/MassarService';
import { MassarValidator } from '../../src/modules/massar/MassarValidator';
import { readExport, unpack, type MassarExport } from '../../src/modules/massar/workbook/readExport';
import { writeSheet } from '../../src/modules/massar/workbook/writeSheet';
import { sheetPath } from '../../src/modules/massar/workbook/sheetPath';
import { template, massarTestI18n } from '../massar/fixtures';
import { scopedHistoryRepository } from '../academicYears/fixtures/scopedHistoryRepository';
const url = process.env.SCHOOL_HISTORY_TEST_DB_URL;
if (!url) throw new Error('SCHOOL_HISTORY_TEST_DB_URL is required');
const target = new URL(url);
if (!['localhost','127.0.0.1','[::1]'].includes(target.hostname) || target.pathname !== '/school_history_test') throw new Error('Only local school_history_test is allowed');
process.env.DB_URL = url;
const { db } = await import('../../src/database/db');
const { academicYears, classes, sections, students, studentEnrollments, studentEnrollmentPlacements, staff, teachers, teacherAssignments, supervisorAssignments, subjects, users, massarClasses, massarEnrollments, massarYears, massarImports, massarSheets } = await import('../../src/database/schema');
const rollback = Symbol('rollback Massar fixture');
let i18n: Awaited<ReturnType<typeof massarTestI18n>>;
beforeAll(async () => { i18n = await massarTestI18n(); });
afterAll(async () => { await i18n?.stop(); });
async function expectRefused(action: Promise<unknown>) {
  // Await database I/O before entering Bun's synchronous assertion matcher.
  const error = await action.then(() => null, (error: unknown) => error);
  expect(error).toBeDefined(); expect(error).not.toBeInstanceOf(TypeError);
}
async function cleanFile(data: MassarExport, name: string) {
  const files = unpack(await writeSheet(template, data)), path = sheetPath(files, 'NotesCC')!;
  files[path] = strToU8(strFromU8(files[path]).replace('<worksheet ', '<x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ').replace('</worksheet>', '</x:worksheet>'));
  return new File([new Uint8Array(zipSync(files))], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
it('imports, merges, generates, owns, edits and exports Massar sheets in the selected year', async () => {
  const originalVerification = process.env.MASSAR_FILLED_EXPORT_VERIFIED;
  try {
    await db.transaction(async raw => {
      const tx = raw as unknown as typeof db;
      const [identity] = await tx.execute<{ name: string }>(sql`select current_database() as name`); expect(identity.name).toBe('school_history_test');
      const year = (await tx.select().from(academicYears).where(eq(academicYears.id, 'history-year-2026')))[0]; expect(year).toBeDefined();
      expect(await tx.select().from(massarYears).where(eq(massarYears.academicYearId, year.id))).toHaveLength(0);
      const prefix = `massar-${crypto.randomUUID().slice(0, 8)}`, id = (name: string) => `${prefix}-${name}`;
      await tx.insert(users).values(['admin','teacher-a','teacher-math','teacher-b','supervisor'].map(name => ({ id: id(name), name: `Synthetic ${name}`, email: `${id(name)}@example.test`, password: 'unused-fixture-hash', status: 'active' as const })));
      for (const name of ['cp','ce1']) await tx.insert(classes).values({ id: id(name), name: id(name), academicYear: year.label });
      for (const [name, cls] of [['a','cp'],['b','cp'],['c','ce1']]) await tx.insert(sections).values({ id: id(name), name: name.toUpperCase(), classId: id(cls) });
      for (const [name, section, cls] of [['1','a','cp'],['2','b','cp'],['3','c','ce1'],['4','a','cp']]) {
        await tx.insert(students).values({ id: id(`student-${name}`), studentCode: id(`CODE${name}`), name: `Synthetic student ${name}`, dateOfBirth: '2018-01-01', enrollmentDate: year.instructionStartsOn, classId: id(cls), sectionId: id(section) });
        await tx.insert(studentEnrollments).values({ id: id(`enrollment-${name}`), studentId: id(`student-${name}`), academicYearId: year.id, enrolledOn: year.instructionStartsOn });
        await tx.insert(studentEnrollmentPlacements).values({ enrollmentId: id(`enrollment-${name}`), classId: id(cls), sectionId: id(section), validFrom: year.instructionStartsOn });
      }
      for (const subject of ['arabic','math','it']) await tx.insert(subjects).values({ id: id(subject), code: id(subject).toUpperCase(), name: `Synthetic ${subject}` });
      for (const [name, subject, section] of [['teacher-a','arabic','a'],['teacher-math','math','a'],['teacher-b','arabic','b']]) {
        await tx.insert(staff).values({ id: id(`staff-${name}`), userId: id(name), employeeCode: id(name), name: `Synthetic ${name}`, role: 'teacher', hireDate: '2020-01-01' });
        await tx.insert(teachers).values({ id: id(`record-${name}`), staffId: id(`staff-${name}`) });
        await tx.insert(teacherAssignments).values({ id: id(`assignment-${name}`), teacherId: id(`record-${name}`), classId: id('cp'), sectionId: id(section), subjectId: id(subject) });
      }
      await tx.insert(staff).values({ id: id('staff-supervisor'), userId: id('supervisor'), employeeCode: id('supervisor'), name: 'Synthetic supervisor', role: 'supervisor', hireDate: '2020-01-01' });
      await tx.insert(supervisorAssignments).values({ id: id('supervision'), staffId: id('staff-supervisor'), classId: id('cp'), startDate: '2020-01-01' });
      const { repo, inYear } = await scopedHistoryRepository(MassarRepository, tx);
      const objects = new Map<string, Buffer>();
      const storage = { save: async (_namespace: string, path: string, bytes: Buffer) => { objects.set(path, Buffer.from(bytes)); }, get: async (_namespace: string, path: string) => objects.get(path) ?? null, delete: async (_namespace: string, path: string) => objects.delete(path) };
      const service = new MassarService(repo, new MassarValidator(), storage as any); Object.defineProperty(service, 'year', { value: year });
      // This test owns an outer rollback and uses in-memory storage only.
      Object.defineProperty(service, 'transactions', { value: { afterCommit: async (callback: () => Promise<void>) => callback(), afterRollback: async () => {} } });
      const admin = { id: id('admin'), role: 'admin', permissions: ['*:*'] }, teacher = { id: id('teacher-a'), role: 'teacher', permissions: ['read:massar','update:massar-marks'] }, supervisor = { id: id('supervisor'), role: 'supervisor', permissions: ['read:massar'] };
      const run = <T>(action: () => T, actor = admin) => inYear(year.id, action, actor);
      const base = await readExport(template);
      const source = (name: string, index: string, code: string, subject: string): MassarExport => ({ ...base, className: name, classGuid: id(name), yearLabel: year.label.replace('-', '/'), level: name.startsWith('2') ? '2APG' : '1APG', subjectCode: code, subjectName: `Synthetic ${subject}`, students: [{ studentCode: id(`CODE${index}`), massarStudentId: Number(index) * 100, name: `Synthetic student ${index}`, dateOfBirth: '01-01-2018', marks: [] }] });
      const sources = [source('1APG-1','1','0011','arabic'), source('1APG-1','1','0019','math'), source('1APG-2','2','0011','arabic'), source('2APG-1','3','0011','arabic')];
      const files = await Promise.all(sources.map((data, index) => cleanFile(data, `synthetic-${index}.xlsx`)));
      const preview = await run(() => service.previewUploads(files, admin)); expect(preview.acceptedCount).toBe(4); expect(preview.refused).toHaveLength(0);
      expect(await tx.select().from(massarClasses).where(eq(massarClasses.academicYearId, year.id))).toHaveLength(0);
      const mappings = { classes: preview.classes.map(cls => ({ name: cls.name, classId: id(cls.name.startsWith('2') ? 'ce1' : 'cp'), sectionId: id(cls.name === '2APG-1' ? 'c' : cls.name === '1APG-2' ? 'b' : 'a') })), subjects: preview.subjects.map(subject => ({ level: subject.level, code: subject.code, subjectId: id(subject.code === '0019' ? 'math' : 'arabic') })) };
      await run(() => service.commit({ ...mappings, previewId: preview.previewId, digest: preview.digest, addMissingSheets: true }, admin));
      expect(objects.has(`${preview.previewId}_preview.txt`)).toBe(false);
      expect([...objects.keys()].filter(path => path.endsWith('_template.xlsx'))).toHaveLength(1);
      await expectRefused(run(() => service.commit({ ...mappings, previewId: preview.previewId, digest: preview.digest, addMissingSheets: true }, admin)));
      const round = await run(() => service.createRound({ term: 1, exam: 1, termLabel: 'الدورة الأولى', examLabel: 'الفرض الأول' }, admin));
      const all = await run(() => service.sheets(round.id)); expect(all).toHaveLength(5); // 2 CP classes × 2 subjects + CE1 Arabic.
      const own = await run(() => service.sheets(round.id), teacher); expect(own).toHaveLength(1); expect(own[0]).toMatchObject({ className: '1APG-1', subjectName: 'Synthetic arabic' });
      const foreign = all.find(sheet => sheet.className === '1APG-1' && sheet.subjectName === 'Synthetic math')!;
      await expectRefused(run(() => service.sheet(foreign.id, teacher), teacher));
      await expectRefused(run(() => service.saveMarks(foreign.id, { revision: 0, marks: [] }, teacher), teacher));
      expect(await run(() => service.sheets(round.id), supervisor)).toHaveLength(4);
      for (const actor of [supervisor, { ...supervisor, role: 'parent' }, { ...supervisor, role: 'student' }]) {
        if (actor.role !== 'supervisor') expect(await run(() => service.sheets(), actor)).toHaveLength(0);
        await expectRefused(run(() => service.saveMarks(own[0].id, { revision: 0, marks: [] }, { ...actor, permissions: ['update:massar-marks'] }), actor));
      }
      await tx.update(supervisorAssignments).set({ endDate: '2020-12-31' }).where(eq(supervisorAssignments.id, id('supervision')));
      expect(await run(() => service.sheets(), supervisor)).toHaveLength(0);
      expect(await inYear('history-year-2025', () => repo.sheets(), teacher)).toHaveLength(0);
      await run(() => service.saveMarks(own[0].id, { revision: 0, marks: [{ studentId: id('student-1'), componentCode: '1001', mark: 0, absence: 'none' }] }, teacher), teacher);
      expect((await run(() => service.sheets(round.id), teacher))[0].missing).toBe(0); // Zero counts as a completed mark.
      await expectRefused(run(() => service.saveMarks(own[0].id, { revision: 0, marks: [] }, teacher), teacher));
      await run(() => service.submit(own[0].id, 1, teacher), teacher);
      await expectRefused(run(() => service.saveMarks(own[0].id, { revision: 2, marks: [] }, teacher), teacher));
      // Re-import one class only: absent classes, subjects and students survive.
      const partial = await run(() => service.previewUploads([files[0]], admin));
      await run(() => service.commit({ ...mappings, previewId: partial.previewId, digest: partial.digest, addMissingSheets: true }, admin));
      expect(objects.has(`${partial.previewId}_preview.txt`)).toBe(false);
      expect([...objects.keys()].filter(path => path.endsWith('_template.xlsx'))).toHaveLength(1);
      expect((await run(() => service.sheets(round.id))).map(sheet => sheet.id).sort()).toEqual(all.map(sheet => sheet.id).sort());
      expect(await tx.select().from(massarEnrollments).where(eq(massarEnrollments.academicYearId, year.id))).toHaveLength(3);
      const setup = await run(() => service.setup()), massarClassId = setup.classes.find(cls => cls.name === '1APG-1')!.id;
      const stalePreview = await run(() => service.previewUploads([files[0]], admin));
      await run(() => service.addStudent(id('student-4'), massarClassId));
      await expectRefused(run(() => service.commit({ ...mappings, previewId: stalePreview.previewId, digest: stalePreview.digest, addMissingSheets: true }, admin)));
      expect((await run(() => service.sheet(own[0].id, admin))).students).toHaveLength(1);
      const secondRound = await run(() => service.createRound({ term: 1, exam: 2, termLabel: 'الدورة الأولى', examLabel: 'الفرض الثاني' }, admin));
      const later = (await run(() => service.sheets(secondRound.id), teacher))[0];
      expect((await run(() => service.sheet(later.id, teacher), teacher)).students).toHaveLength(2);
      const printableArrival = await run(() => service.downloadEmpty(later.id), teacher);
      expect((await readExport(printableArrival.bytes)).students).toHaveLength(2);
      process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true';
      await expectRefused(run(() => service.exportSheets([later.id], false)));
      const arrivalSource = { ...sources[0], students: [...sources[0].students, { ...sources[0].students[0], studentCode: id('CODE4'), massarStudentId: 400, name: 'Synthetic student 4' }] };
      const arrivalFile = await cleanFile(arrivalSource, 'arrival.xlsx');
      const arrivals = await run(() => service.previewUploads([arrivalFile], admin));
      await run(() => service.commit({ ...mappings, previewId: arrivals.previewId, digest: arrivals.digest, addMissingSheets: true }, admin));
      expect((await readExport((await run(() => service.downloadEmpty(later.id), teacher)).bytes)).students).toHaveLength(2);
      process.env.MASSAR_FILLED_EXPORT_VERIFIED = 'true';
      await run(() => service.exportSheets([own[0].id], false));
      expect((await run(() => service.sheet(own[0].id, admin))).sheet.status).toBe('exported');
      await run(() => service.saveMarks(own[0].id, { revision: 3, marks: [{ studentId: id('student-1'), componentCode: '1001', mark: 8.25, absence: 'none' }] }, admin));
      expect((await run(() => service.sheet(own[0].id, admin))).sheet.status).toBe('changed_after_export');
      expect(await tx.select().from(massarImports).where(and(eq(massarImports.academicYearId, year.id), eq(massarImports.id, arrivals.previewId)))).toHaveLength(0);
      const itSource = { ...arrivalSource, subjectCode: '0030', subjectName: 'Synthetic it' };
      const itFile = await cleanFile(itSource, 'new-subject.xlsx');
      const newSubject = await run(() => service.previewUploads([itFile], admin));
      await run(() => service.commit({ ...mappings, subjects: [...mappings.subjects, { level: '1APG', code: '0030', subjectId: id('it') }], previewId: newSubject.previewId, digest: newSubject.digest, addMissingSheets: true }, admin));
      expect(await tx.select().from(massarSheets).where(eq(massarSheets.academicYearId, year.id))).toHaveLength(14);
      const originalEnrollment = setup.enrollments.find(row => row.enrollment.studentId === id('student-1'))!.enrollment;
      await run(() => service.leaveStudent(originalEnrollment.id, year.instructionStartsOn));
      const thirdRound = await run(() => service.createRound({ term: 1, exam: 3, termLabel: 'الدورة الأولى', examLabel: 'الفرض الثالث' }, admin));
      const afterDeparture = (await run(() => service.sheets(thirdRound.id), teacher))[0];
      expect((await run(() => service.sheet(afterDeparture.id, teacher), teacher)).students.map(student => student.id)).toEqual([id('student-4')]);
      expect((await run(() => service.sheet(own[0].id, admin))).marks[0].mark).toBe(8.25);
      expect(await tx.select().from(massarSheets).where(eq(massarSheets.academicYearId, year.id))).toHaveLength(21);
      const blockedClassId = setup.classes.find(cls => cls.name === '1APG-2')!.id;
      await tx.update(massarClasses).set({ unmatchedCodes: ['SYNTHETIC-MISSING'] }).where(eq(massarClasses.id, blockedClassId));
      const partialRound = await run(() => service.createRound({ term: 2, exam: 1, termLabel: 'Synthetic term 2', examLabel: 'Synthetic assessment 1' }, admin));
      expect((await run(() => service.sheets(partialRound.id))).map(row => row.className)).not.toContain('1APG-2');
      expect(await run(() => service.blockedClasses(partialRound.id))).toEqual([{ className: '1APG-2', unmatchedCount: 1 }]);
      expect(await run(() => service.sheets(partialRound.id))).toHaveLength(4);
      await tx.update(massarClasses).set({ unmatchedCodes: [] }).where(eq(massarClasses.id, blockedClassId));
      await run(() => service.mappings(mappings));
      expect(await run(() => service.sheets(partialRound.id))).toHaveLength(7);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  finally { if (originalVerification === undefined) delete process.env.MASSAR_FILLED_EXPORT_VERIFIED; else process.env.MASSAR_FILLED_EXPORT_VERIFIED = originalVerification; }
}, 60000);
