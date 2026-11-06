import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import { StorageService } from 'najm-storage';
import { Inject, LoggerService, Service, Transaction, TransactionService } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { MassarComponent, MassarMark, MassarSheetDetail, MassarSheetRow } from '@sms/contracts';
import { MassarRepository } from './MassarRepository';
import { MassarValidator, mayManageMassar, type MassarActor } from './MassarValidator';
import { buildImportPreview, type ImportedFile, type RefusedFile, type Setup } from './importPreview';
import { readExport, unpack, MassarWorkbookError, type MassarExport } from './workbook/readExport';
import { writeSheet } from './workbook/writeSheet';
import { MASSAR_MIME } from './workbook/cells';
import type { MassarCommit, MassarMappings, MassarMarksInput, MassarRoundInput } from './MassarDto';
import { getBusinessDateOnly } from '../../shared/businessDate';

const NAMESPACE = 'massar';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Sheet = NonNullable<Awaited<ReturnType<MassarRepository['sheetById']>>>;
type PreviewPayload = { files: ImportedFile[]; template: string | null; base: string };
const setupHash = (setup: Setup) => hash([setup.year, ...[setup.levels, setup.classes, setup.subjects, setup.enrollments, setup.appStudents, setup.appClasses, setup.appSections, setup.appSubjects].map(rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))]);
const numericMarks = (marks: Awaited<ReturnType<MassarRepository['marks']>>): MassarMark[] => marks.map(mark => ({ ...mark, mark: mark.mark === null ? null : Number(mark.mark) }));
export const massarFilledExportVerified = () => process.env.MASSAR_FILLED_EXPORT_VERIFIED === 'true';
export const sheetComponents = (kind: string, components: MassarComponent[], round: MassarRoundInput) => kind === 'exam' ? [{ code: String(round.exam), name: round.examLabel }] : components;
export function summarizeSheet(row: Sheet, marks: MassarMark[] | number): MassarSheetRow {
  const completed = typeof marks === 'number' ? marks : marks.filter(mark => mark.mark !== null || mark.absence === 'justified').length;
  const total = row.sheet.roster.length * row.sheet.components.length;
  return { id: row.sheet.id, roundId: row.sheet.roundId, className: row.cls.name, subjectName: row.subject.name, teacherName: row.teacherName, status: row.sheet.status, revision: row.sheet.revision, total, missing: total - completed, termLabel: row.round.termLabel, examLabel: row.round.examLabel, roundStatus: row.round.status };
}
@Service()
export class MassarService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @Inject(TransactionService) private transactions!: TransactionService;
  @Inject(LoggerService) private log!: LoggerService;
  constructor(private repository: MassarRepository, private validator: MassarValidator, private storage: StorageService) {}
  private writable() { if (this.year.status === 'closed') this.validator.refuse('closedYear'); }
  private async removeStoredFiles(fileIds: string[]) {
    for (const fileId of fileIds) {
      try { await this.storage.delete(NAMESPACE, fileId); }
      catch (error) { this.log.error('Massar file deletion failed; maintenance will retry', error); }
    }
  }
  private async requireSheet(id: string) { const row = await this.repository.sheetById(id); if (!row) this.validator.refuse('notFound', 404); return row; }
  private async ownedOpenSheet(id: string, revision: number, actor: MassarActor) {
    this.writable();
    const row = await this.requireSheet(id);
    if (row.round.status === 'closed') this.validator.refuse('locked');
    this.validator.ensureWriter(actor, row.sheet, mayManageMassar(actor));
    if (row.sheet.revision !== revision) this.validator.refuse('staleSheet');
    return row;
  }
  async setup() {
    const setup = await this.repository.setup();
    return { ...setup, year: setup.year ? { ...setup.year, templateFileId: undefined, templateReady: true } : null, filledExportVerified: massarFilledExportVerified() };
  }
  async previewUploads(uploads: File[], actor: MassarActor) {
    this.writable();
    if (!uploads.length || uploads.length > 200 || uploads.reduce((n, file) => n + file.size, 0) > 15 * 1024 * 1024) this.validator.refuse('tooLarge', 413);
    const files: ImportedFile[] = [], refused: RefusedFile[] = [], originals = new Map<MassarExport, Uint8Array>();
    let template: Uint8Array | null = null, expanded = 0;
    const read = async (name: string, bytes: Uint8Array) => {
      expanded += bytes.length;
      if (expanded > 30 * 1024 * 1024 || files.length + refused.length >= 200) this.validator.refuse('tooLarge', 413);
      try { const data = await readExport(bytes); files.push({ name, data }); if (data.clean) originals.set(data, bytes); }
      catch (error) { if (!(error instanceof MassarWorkbookError)) throw error; refused.push({ name, key: error.key }); }
    };
    for (const upload of uploads) {
      const bytes = new Uint8Array(await upload.arrayBuffer());
      if (/\.zip$/i.test(upload.name)) {
        let entries: Record<string, Uint8Array>;
        try { entries = unpack(bytes, 30 * 1024 * 1024); } catch (error) { if (!(error instanceof MassarWorkbookError)) throw error; refused.push({ name: upload.name, key: error.key }); continue; }
        for (const [name, contents] of Object.entries(entries)) if (/\.xlsx$/i.test(name) && !name.startsWith('__MACOSX/')) await read(name, contents);
      } else if (/\.xlsx$/i.test(upload.name)) await read(upload.name, bytes);
      else refused.push({ name: upload.name, key: 'invalidWorkbook' });
    }
    const setup = await this.repository.setup();
    const result = buildImportPreview(files, setup, refused);
    const cleanFile = result.accepted.findLast(file => file.data.clean);
    if (cleanFile) template = originals.get(cleanFile.data) ?? null;
    const payload: PreviewPayload = { files: result.accepted, template: template ? Buffer.from(template).toString('base64') : null, base: setupHash(setup) };
    const id = crypto.randomUUID(), digest = hash(payload), fileId = `${id}_preview.txt`;
    await this.storage.save(NAMESPACE, fileId, Buffer.from(JSON.stringify(payload)), 'text/plain');
    try { await this.repository.createPreview({ id, actorId: actor.id, digest, fileId, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }); }
    catch (error) { await this.storage.delete(NAMESPACE, fileId); throw error; }
    return { ...result.preview, previewId: id, digest };
  }
  private validateMappings(mappings: MassarMappings, setup: Setup) {
    for (const cls of mappings.classes) {
      if ((cls.classId === null) !== (cls.sectionId === null) || (cls.classId && (!setup.appClasses.some(app => app.id === cls.classId) || !setup.appSections.some(section => section.id === cls.sectionId && section.classId === cls.classId)))) this.validator.refuse('invalidMapping', 422);
    }
    if (new Set(mappings.classes.map(cls => cls.name)).size !== mappings.classes.length || new Set(mappings.subjects.map(subject => `${subject.level}:${subject.code}`)).size !== mappings.subjects.length || mappings.subjects.some(subject => subject.subjectId && !setup.appSubjects.some(app => app.id === subject.subjectId))) this.validator.refuse('invalidMapping', 422);
  }
  @Transaction()
  async commit(data: MassarCommit, actor: MassarActor) {
    this.writable(); await this.repository.lock();
    const preview = await this.repository.previewById(data.previewId, actor.id);
    if (!preview || preview.digest !== data.digest || Date.parse(preview.expiresAt) <= Date.now()) this.validator.refuse('stalePreview');
    const bytes = await this.storage.get(NAMESPACE, preview.fileId);
    if (!bytes) this.validator.refuse('stalePreview');
    const payload: PreviewPayload = JSON.parse(bytes.toString('utf8'));
    const setup = await this.repository.setup();
    if (hash(payload) !== data.digest || setupHash(setup) !== payload.base) this.validator.refuse('stalePreview');
    const { accepted, preview: view } = buildImportPreview(payload.files, setup);
    if (!accepted.length || view.refused.length) this.validator.refuse('invalidWorkbook');
    if (!setup.year && !payload.template) this.validator.refuse('noCleanTemplate');
    this.validateMappings(data, setup);
    const classMappings = data.classes.length ? data.classes : view.classes;
    const subjectMappings = data.subjects.length ? data.subjects : view.subjects;
    const first = accepted[0].data;
    let templateFileId = setup.year?.templateFileId;
    if (payload.template) {
      templateFileId = `${crypto.randomUUID()}_template.xlsx`;
      await this.storage.save(NAMESPACE, templateFileId, Buffer.from(payload.template, 'base64'), MASSAR_MIME);
      const created = templateFileId;
      await this.transactions.afterRollback(() => this.removeStoredFiles([created]));
    }
    await this.repository.saveYear({ massarYearId: first.yearId, schoolCode: first.schoolCode, academy: first.academy, direction: first.direction, schoolName: first.schoolName, templateFileId: templateFileId!, importedBy: actor.id });
    for (const { data: source } of accepted) {
      const level = await this.repository.saveLevel({ code: source.level, label: source.levelLabel, levelCode: String(source.levelCode), levelCodeNumeric: typeof source.levelCode === 'number', maxMark: source.maxMark, kind: source.kind });
      const mapping = classMappings.find(cls => cls.name === source.className);
      if (!mapping) this.validator.refuse('invalidMapping', 422);
      const cls = await this.repository.saveClass({ name: source.className, guid: source.classGuid, levelId: level.id, classId: mapping.classId, sectionId: mapping.sectionId, unmatchedCodes: source.students.filter(student => !setup.appStudents.some(app => app.studentCode === student.studentCode)).map(student => student.studentCode) });
      const subjectMapping = subjectMappings.find(subject => subject.level === source.level && subject.code === source.subjectCode);
      if (!subjectMapping) this.validator.refuse('invalidMapping', 422);
      const current = await this.repository.subjectForImport(level.id, source.subjectCode);
      const observedRounds = [...(current?.observedRounds ?? []).filter(round => round.term !== source.term || round.exam !== source.exam), { term: source.term, exam: source.exam, termLabel: source.termLabel, examLabel: source.examLabel, components: source.components }];
      await this.repository.saveSubject({ levelId: level.id, code: source.subjectCode, name: source.subjectName, subjectId: subjectMapping.subjectId, components: source.exam === 4 && current ? current.components : source.components, observedRounds });
      for (const [position, student] of source.students.entries()) {
        const match = setup.appStudents.find(app => app.studentCode === student.studentCode);
        if (!match) continue; // Preview lists unmatched students; never invent identities.
        const old = setup.enrollments.find(row => row.enrollment.studentId === match.id)?.enrollment;
        if (old && old.massarClassId !== cls.id) this.validator.refuse('classConflict');
        await this.repository.saveEnrollment({ studentId: match.id, massarClassId: cls.id, massarStudentId: student.massarStudentId === null ? null : String(student.massarStudentId), massarStudentIdNumeric: typeof student.massarStudentId === 'number', name: student.name, dateOfBirth: student.dateOfBirth, position, leftOn: old?.leftOn ?? null });
      }
    }
    await this.refreshAssignments();
    if (data.addMissingSheets) await this.addMissingSheets();
    await this.repository.consumePreview(preview.id);
    await this.transactions.afterCommit(() => this.removeStoredFiles([preview.fileId, ...(setup.year?.templateFileId && setup.year.templateFileId !== templateFileId ? [setup.year.templateFileId] : [])]));
    return { importedFiles: accepted.length, unmatchedStudents: view.classes.flatMap(cls => cls.students).filter(student => !student.studentId).length };
  }
  @Transaction()
  async cancelPreview(id: string, actor: MassarActor) {
    await this.repository.lock();
    const preview = await this.repository.previewById(id, actor.id);
    if (preview) {
      await this.repository.consumePreview(preview.id);
      await this.transactions.afterCommit(() => this.removeStoredFiles([preview.fileId]));
    }
    return { cancelled: true };
  }
  @Transaction()
  async mappings(data: MassarMappings) {
    this.writable(); await this.repository.lock(); const setup = await this.repository.setup(); this.validateMappings(data, setup);
    for (const mapping of data.classes) {
      const cls = setup.classes.find(cls => cls.name === mapping.name); if (!cls) this.validator.refuse('notFound', 404);
      await this.repository.saveClass({ ...cls, ...mapping });
    }
    for (const mapping of data.subjects) {
      const level = setup.levels.find(level => level.code === mapping.level);
      const subject = setup.subjects.find(subject => subject.levelId === level?.id && subject.code === mapping.code); if (!subject) this.validator.refuse('notFound', 404);
      await this.repository.saveSubject({ ...subject, subjectId: mapping.subjectId });
    }
    await this.refreshAssignments();
    await this.addMissingSheets(); return { saved: true };
  }
  private async refreshAssignments() {
    const refreshed = await this.repository.setup();
    for (const row of await this.repository.sheets()) {
      if (row.round.status !== 'open' || row.sheet.exportedAt) continue;
      const cls = refreshed.classes.find(cls => cls.id === row.cls.id)!;
      const subject = refreshed.subjects.find(subject => subject.id === row.subject.id)!;
      const assignments = refreshed.assignments.filter(({ assignment }) => assignment.classId === cls.classId && assignment.sectionId === cls.sectionId && assignment.subjectId === subject.subjectId);
      const teacherAssignmentId = assignments.length === 1 ? assignments[0].assignment.id : null;
      if (teacherAssignmentId !== row.sheet.teacherAssignmentId) await this.repository.updateSheet(row.sheet.id, { teacherAssignmentId });
    }
  }
  private async addMissingSheets() {
    const setup = await this.repository.setup();
    for (const round of await this.repository.allRoundsForManagement()) {
      if (round.status !== 'open') continue;
      for (const cls of setup.classes) {
        if (cls.unmatchedCodes.length) continue;
        const level = setup.levels.find(level => level.id === cls.levelId)!;
        for (const subject of setup.subjects.filter(subject => subject.levelId === level.id)) {
          if ((level.kind === 'exam' && round.exam > 1 || round.exam === 4) && !subject.observedRounds.some(observed => observed.term === round.term && observed.exam === round.exam)) continue;
          const assignments = setup.assignments.filter(({ assignment }) => assignment.classId === cls.classId && assignment.sectionId === cls.sectionId && assignment.subjectId === subject.subjectId);
          await this.repository.createSheet({ roundId: round.id, massarClassId: cls.id, massarSubjectId: subject.id, teacherAssignmentId: assignments.length === 1 ? assignments[0].assignment.id : null,
            roster: await this.repository.activeRoster(cls.id), components: sheetComponents(level.kind, subject.observedRounds.find(observed => observed.term === round.term && observed.exam === round.exam)?.components ?? subject.components, round) });
        }
      }
    }
  }
  async rounds(actor: MassarActor) { return mayManageMassar(actor) ? this.repository.allRoundsForManagement() : this.repository.rounds(); }
  async blockedClasses(roundId: string) {
    if (!(await this.repository.allRoundsForManagement()).some(round => round.id === roundId)) this.validator.refuse('notFound', 404);
    const setup = await this.repository.setup();
    return setup.classes.filter(cls => cls.unmatchedCodes.length).map(cls => ({ className: cls.name, unmatchedCount: cls.unmatchedCodes.length }));
  }
  @Transaction()
  async createRound(data: MassarRoundInput, actor: MassarActor) {
    this.writable(); await this.repository.lock();
    const setup = await this.repository.setup(); if (!setup.year || !setup.classes.length || !setup.subjects.length) this.validator.refuse('setupRequired');
    if (setup.subjects.some(subject => {
      const level = setup.levels.find(level => level.id === subject.levelId)!;
      return (data.exam === 4 || level.kind === 'exam' && data.exam > 1) && !subject.observedRounds.some(round => round.term === data.term && round.exam === data.exam);
    })) this.validator.refuse('unverifiedRound');
    const round = await this.repository.createRound({ ...data, createdBy: actor.id }); if (!round) this.validator.refuse('roundExists');
    await this.addMissingSheets(); return round;
  }
  async sheets(roundId?: string) {
    const [rows, counts] = await Promise.all([this.repository.sheets(roundId), this.repository.completedMarkCounts(roundId)]);
    const completed = new Map(counts.map(row => [row.sheetId, row.completed]));
    return rows.map(row => summarizeSheet(row, completed.get(row.sheet.id) ?? 0));
  }
  async sheet(id: string, actor: MassarActor): Promise<MassarSheetDetail> {
    const row = await this.requireSheet(id), marks = numericMarks(await this.repository.marks(id)), manager = mayManageMassar(actor);
    return { sheet: summarizeSheet(row, marks), round: row.round, components: row.sheet.components, maxMark: row.level.maxMark, students: row.sheet.roster, marks,
      canEdit: this.year.status !== 'closed' && row.round.status !== 'closed' && (manager || actor.role === 'teacher' && !['submitted', 'exported'].includes(row.sheet.status) && (row.sheet.status !== 'changed_after_export' || row.sheet.teacherUnlocked)), canReopen: manager && this.year.status !== 'closed' && row.round.status !== 'closed' };
  }
  @Transaction()
  async saveMarks(id: string, data: MassarMarksInput, actor: MassarActor) {
    await this.repository.lock(); const row = await this.ownedOpenSheet(id, data.revision, actor);
    this.validator.ensureMarks(data, row.sheet.roster, row.sheet.components, row.level.maxMark);
    await this.repository.saveMarks(id, data.marks, actor.id);
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'in_progress' });
  }
  @Transaction()
  async submit(id: string, revision: number, actor: MassarActor) {
    await this.repository.lock(); const row = await this.ownedOpenSheet(id, revision, actor);
    if (summarizeSheet(row, numericMarks(await this.repository.marks(id))).missing) this.validator.refuse('missingMarks');
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'submitted', teacherUnlocked: false });
  }
  @Transaction()
  async reopen(id: string, revision: number) {
    this.writable(); await this.repository.lock(); const row = await this.requireSheet(id);
    if (row.sheet.revision !== revision) this.validator.refuse('staleSheet');
    if (row.round.status === 'closed') this.validator.refuse('locked');
    // Clearing the export lock is explicit; the prior export hash/time remain.
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'in_progress', teacherUnlocked: true });
  }
  @Transaction()
  async closeRound(id: string) {
    this.writable(); await this.repository.lock();
    const round = (await this.repository.allRoundsForManagement()).find(round => round.id === id); if (!round) this.validator.refuse('notFound', 404);
    await this.repository.updateRound(id, 'closed'); return { closed: true };
  }
  @Transaction()
  async reopenRound(id: string) {
    this.writable(); await this.repository.lock();
    if (!(await this.repository.allRoundsForManagement()).some(round => round.id === id)) this.validator.refuse('notFound', 404);
    await this.repository.updateRound(id, 'open'); await this.addMissingSheets(); return { reopened: true };
  }
  @Transaction()
  async addStudent(studentId: string, massarClassId: string) {
    this.writable(); await this.repository.lock(); const setup = await this.repository.setup();
    const student = setup.appStudents.find(student => student.id === studentId), cls = setup.classes.find(cls => cls.id === massarClassId);
    if (!student || !cls) this.validator.refuse('notFound', 404);
    if (setup.enrollments.some(row => row.enrollment.studentId === studentId)) this.validator.refuse('classConflict');
    const roster = setup.enrollments.filter(row => row.enrollment.massarClassId === massarClassId);
    await this.repository.saveEnrollment({ studentId, massarClassId, massarStudentId: null, position: Math.max(-1, ...roster.map(row => row.enrollment.position)) + 1, name: student.arabicName || student.name, dateOfBirth: student.dateOfBirth?.split('-').reverse().join('-') ?? '' }); return { saved: true };
  }
  @Transaction()
  async leaveStudent(id: string, leftOn: string) {
    this.writable(); await this.repository.lock();
    if (leftOn > getBusinessDateOnly() || leftOn < this.year.reportingStartsOn || leftOn > this.year.reportingEndsOn) this.validator.refuse('invalidDate', 422);
    if (!(await this.repository.leave(id, leftOn)).length) this.validator.refuse('notFound', 404); return { saved: true };
  }
  private async workbook(row: Sheet, empty: boolean, template: Uint8Array, config: NonNullable<Awaited<ReturnType<MassarRepository['yearConfig']>>>) {
    const [storedMarks, hiddenIds] = await Promise.all([this.repository.marks(row.sheet.id), this.repository.hiddenIds(row.sheet.id)]);
    const marks = numericMarks(storedMarks);
    const data: MassarExport = { schoolCode: config.schoolCode, classGuid: row.cls.guid, yearId: config.massarYearId, academy: config.academy, direction: config.direction, schoolName: config.schoolName,
      levelCode: row.level.levelCodeNumeric ? Number(row.level.levelCode) : row.level.levelCode, level: row.level.code, levelLabel: row.level.label, className: row.cls.name,
      term: row.round.term, exam: row.round.exam, termLabel: row.round.termLabel, examLabel: row.round.examLabel, yearLabel: this.year.label.replace('-', '/'), subjectCode: row.subject.code, subjectName: row.subject.name,
      kind: row.level.kind, maxMark: row.level.maxMark, components: row.sheet.components, clean: false,
      students: row.sheet.roster.map(student => ({ ...student, massarStudentId: student.massarStudentId || hiddenIds.find(enrollment => enrollment.studentId === student.id)?.massarStudentId || null, marks: marks.filter(mark => mark.studentId === student.id) })) };
    if (!empty && data.students.some(student => !student.massarStudentId)) this.validator.refuse('missingHiddenId');
    return { bytes: await writeSheet(template, data, empty), digest: hash(marks.sort((a, b) => `${a.studentId}:${a.componentCode}`.localeCompare(`${b.studentId}:${b.componentCode}`))) };
  }
  async downloadEmpty(id: string) {
    const row = await this.requireSheet(id), config = await this.repository.yearConfig(); if (!config) this.validator.refuse('setupRequired');
    const template = await this.storage.get(NAMESPACE, config.templateFileId); if (!template) this.validator.refuse('noCleanTemplate');
    return { ...await this.workbook(row, true, template, config), name: exportName(row) };
  }
  @Transaction()
  async exportSheets(ids: string[], empty: boolean) {
    this.writable(); if (!empty && !massarFilledExportVerified()) this.validator.refuse('exportUnverified');
    await this.repository.lock();
    const config = await this.repository.yearConfig(); if (!config) this.validator.refuse('setupRequired');
    const template = await this.storage.get(NAMESPACE, config.templateFileId); if (!template) this.validator.refuse('noCleanTemplate');
    const files: Record<string, Uint8Array> = {}, exported: Sheet[] = [];
    if (new Set(ids).size !== ids.length) this.validator.refuse('invalidSelection', 422);
    for (const id of ids) {
      const row = await this.requireSheet(id);
      if (exported.length && exported[0].round.id !== row.round.id) this.validator.refuse('invalidSelection', 422);
      if (row.round.status === 'closed') this.validator.refuse('locked');
      const result = await this.workbook(row, empty, template, config), name = exportName(row);
      if (files[name]) this.validator.refuse('invalidSelection', 422);
      files[name] = result.bytes; exported.push(row);
      if (!empty) await this.repository.updateSheet(id, { status: 'exported', teacherUnlocked: false, exportedAt: new Date().toISOString(), exportHash: result.digest });
    }
    // Compression must succeed before recording any export in the transaction.
    const bytes = zipSync(files);
    if (!empty) for (const roundId of new Set(exported.map(row => row.round.id))) {
      const sheets = await this.repository.sheets(roundId);
      if (sheets.length && sheets.every(row => row.sheet.status === 'exported')) await this.repository.updateRound(roundId, 'exported');
    }
    return bytes;
  }
  async progressCsv(roundId: string) {
    const rows = await this.sheets(roundId), cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/^\s*[=+@-]/, "'$&")}"`;
    return strToU8('\ufeff' + [['class', 'subject', 'teacher', 'status', 'missing', 'total'], ...rows.map(row => [row.className, row.subjectName, row.teacherName, row.status, row.missing, row.total])].map(row => row.map(cell).join(',')).join('\r\n'));
  }
}
function exportName(row: Sheet) {
  const safe = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.+$/g, '').slice(0, 150);
  return `export_notesCC_${safe(row.cls.name)}_${safe(row.subject.code)}.xlsx`;
}
