import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import { StorageService } from 'najm-storage';
import { Inject, LoggerService, Service, Transaction, TransactionService } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { massarPlanningControls, type MassarComponent, type MassarGradeSource, type MassarMark, type MassarSheetDetail, type MassarSheetRow } from '@sms/contracts';
import { MassarRepository } from './MassarRepository';
import { MassarValidator, mayManageMassar, type MassarActor } from './MassarValidator';
import { buildImportPreview, pendingWithSuggestions, proposeSubject, sameName, type ImportedFile, type RefusedFile, type Setup } from './importPreview';
import { massarModel } from './massarModel';
import { MassarGradeLink } from './MassarGradeLink';
import { StudentService } from '../students/StudentService';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import { readExport, unpack, MassarWorkbookError, type MassarExport } from './workbook/readExport';
import { writeSheet } from './workbook/writeSheet';
import { MASSAR_MIME } from './workbook/cells';
import type { MassarCommit, MassarMappings, MassarMarksInput, MassarPlanInput, MassarResolve, MassarRoundInput } from './MassarDto';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { resolveRoundLabels } from './roundLabels';

const NAMESPACE = 'massar';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
type Sheet = NonNullable<Awaited<ReturnType<MassarRepository['sheetById']>>>;
type PreviewPayload = { files: ImportedFile[]; template: string | null; base: string };
const setupHash = (setup: Setup) => hash([setup.year, ...[setup.levels, setup.classes, setup.subjects, setup.enrollments, setup.appStudents, setup.appClasses, setup.appSections, setup.appSubjects].map(rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))]);
const numericMarks = (marks: Awaited<ReturnType<MassarRepository['marks']>>): MassarMark[] => marks.map(mark => ({ ...mark, mark: mark.mark === null ? null : Number(mark.mark) }));
/**
 * `expires_at` is a timestamp without a zone holding UTC digits (written from
 * toISOString). Read it back as UTC: Date.parse would take the server's local
 * time, and in Morocco (UTC+1) every check would expire the moment it is made.
 */
export const storedUtc = (stamp: string) => Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(stamp) ? stamp : `${stamp.replace(' ', 'T')}Z`);
type ObservedRound = { term: number; exam: number; termLabel: string; examLabel: string; components: MassarComponent[] };
/**
 * The rounds a file shows Massar holds for its subject replace what earlier files (or the default model) said about them.
 * A whole-term export lists every test of its term, each as its own single-test file would, so it replaces the whole term.
 */
export function mergeObservedRounds(current: ObservedRound[], source: MassarExport): ObservedRound[] {
  const seen = (source.termRounds ?? [{ exam: source.exam, examLabel: source.examLabel, components: source.components }])
    .map(round => ({ term: source.term, termLabel: source.termLabel, ...round }));
  return [...current.filter(round => round.term !== source.term || (!source.termRounds && !seen.some(item => item.exam === round.exam))), ...seen];
}
export const sheetComponents =(kind: string, components: MassarComponent[], round: MassarRoundInput & { examLabel: string }) => kind === 'exam' ? [{ code: String(round.exam), name: round.examLabel }] : components;
export function summarizeSheet(row: Sheet, marks: MassarMark[] | number): MassarSheetRow {
  const completed = typeof marks === 'number' ? marks : marks.filter(mark => mark.mark !== null || mark.absence === 'justified').length;
  const total = row.sheet.roster.length * row.sheet.components.length;
  const dueDate = row.round.dueDate ?? null;
  return { id: row.sheet.id, roundId: row.sheet.roundId, className: row.cls.name, subjectName: row.subject.name, subjectConfirmed: row.subject.confirmed, teacherName: row.teacherName, status: row.sheet.status, revision: row.sheet.revision, total, missing: total - completed, termLabel: row.round.termLabel, examLabel: row.round.examLabel, roundStatus: row.round.status, dueDate, late: !!dueDate && dueDate < getBusinessDateOnly() && total > completed && row.sheet.status !== 'exported' };
}
@Service()
export class MassarService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @Inject(TransactionService) private transactions!: TransactionService;
  @Inject(LoggerService) private log!: LoggerService;
  // `grades` keeps each grid and School's exam grades the same mark; tests that build the service by hand leave it out.
  constructor(private repository: MassarRepository, private validator: MassarValidator, private storage: StorageService, private students: StudentService, private enrollments: StudentEnrollmentService, private grades?: MassarGradeLink) {}
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
    const setup = await this.repository.setup(), pending = pendingWithSuggestions(setup);
    return { ...setup, classes: setup.classes.map(cls => ({ ...cls, pendingStudents: pending.get(cls.id) ?? [] })), year: setup.year ? { ...setup.year, templateFileId: undefined, templateReady: true } : null };
  }
  async availability() {
    const [config, rounds, planning] = await Promise.all([this.repository.yearConfig(), this.repository.allRoundsForManagement(), this.repository.planningMonths()]);
    // Every reader sees the year's planned Contrôles and their dates, opened or not,
    // with when Planning holds their exams.
    // Planning decides which Contrôles exist; Massar setup only adds a due date.
    const planned = config ? massarPlanningControls(planning).map(({ term, exam, examFrom, examTo }) => ({ term, exam, examFrom, examTo,
      dueDate: config.plan?.dates.find(date => date.term === term && date.exam === exam)?.dueDate ?? null })) : [];
    return { configured: !!config, hasRounds: rounds.length > 0, planned, plan: config?.plan ?? null };
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
    // A file confirming a subject from the model: count the marks its parts would no longer hold.
    for (const subject of result.preview.subjects) if (subject.confirms) {
      const level = setup.levels.find(level => level.code === subject.level), old = setup.subjects.find(item => item.levelId === level?.id && item.code === subject.code);
      if (old) subject.lostMarks = await this.repository.marksOutside(old.id, subject.components.map(component => component.code));
    }
    // Generated sheets hold one test: only a single-test export has that layout to copy.
    const cleanFile = result.accepted.findLast(file => file.data.clean && !file.data.termRounds);
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
  /**
   * Applies the import check's decisions inside the import transaction: a
   * "same student" gives the suggested School student its Massar code; an
   * addition creates the student from Massar's data (Arabic name, code, birth
   * date, mapped class) with the gender the registrar chose. Only the check's
   * own suggestions and unmatched Massar students are accepted.
   */
  private async applyStudentDecisions(data: MassarCommit, view: ReturnType<typeof buildImportPreview>['preview'], actor: MassarActor) {
    const rows = view.classes.flatMap(cls => cls.students.filter(student => !student.studentId).map(student => ({ cls, student })));
    const codes = [...data.matches.map(match => match.studentCode), ...data.additions.map(addition => addition.studentCode)];
    if (new Set(codes).size !== codes.length || new Set(data.matches.map(match => match.studentId)).size !== data.matches.length) this.validator.refuse('invalidStudentDecision', 422);
    for (const match of data.matches) {
      const row = rows.find(({ student }) => student.studentCode === match.studentCode && student.suggestion?.studentId === match.studentId);
      if (!row) this.validator.refuse('invalidStudentDecision', 422);
      await this.students.update(match.studentId, { studentCode: match.studentCode }, { id: actor.id, role: actor.role ?? '' });
    }
    for (const addition of data.additions) {
      const row = rows.find(({ student }) => student.studentCode === addition.studentCode);
      const mapping = row && (data.classes.find(cls => cls.name === row.cls.name) ?? row.cls);
      if (!row || !mapping?.classId || !mapping.sectionId) this.validator.refuse('invalidStudentDecision', 422);
      await this.createFromMassar(row.student, addition.gender, { classId: mapping.classId, sectionId: mapping.sectionId }, actor);
    }
  }
  /** A Massar student School does not have: created from Massar's data, to be completed in Students. */
  private async createFromMassar(source: { studentCode: string; name: string; dateOfBirth: string }, gender: 'M' | 'F', place: { classId: string; sectionId: string }, actor: MassarActor) {
    const today = getBusinessDateOnly();
    const enrolledOn = today < this.year.reportingStartsOn ? this.year.reportingStartsOn : today > this.year.reportingEndsOn ? this.year.reportingEndsOn : today;
    await this.students.create({
      studentCode: source.studentCode, name: source.name, arabicName: source.name, gender,
      dateOfBirth: source.dateOfBirth || undefined, ...place, enrollmentDate: enrolledOn, yearEnrolledOn: enrolledOn, status: 'active',
    }, { id: actor.id, role: actor.role ?? '' });
  }
  /**
   * Decisions for a class already imported that waits for students: the same
   * "same student?" and "add" choices as the import check. A recognised student
   * takes its code, class, birth date and Arabic name from Massar; the class
   * gets its sheets once nobody is missing.
   */
  @Transaction()
  async resolvePending(data: MassarResolve, actor: MassarActor) {
    this.writable(); await this.repository.lock();
    const setup = await this.repository.setup(), cls = setup.classes.find(item => item.id === data.massarClassId);
    if (!cls?.classId || !cls.sectionId) this.validator.refuse('invalidStudentDecision', 422);
    const place = { classId: cls.classId, sectionId: cls.sectionId }, pending = pendingWithSuggestions(setup).get(cls.id) ?? [], who = { id: actor.id, role: actor.role ?? '' };
    const codes = [...data.matches.map(match => match.studentCode), ...data.additions.map(addition => addition.studentCode)];
    if (new Set(codes).size !== codes.length || new Set(data.matches.map(match => match.studentId)).size !== data.matches.length) this.validator.refuse('invalidStudentDecision', 422);
    for (const match of data.matches) {
      const source = pending.find(student => student.studentCode === match.studentCode && student.suggestion?.studentId === match.studentId);
      const app = setup.appStudents.find(student => student.id === match.studentId);
      if (!source || !app) this.validator.refuse('invalidStudentDecision', 422);
      await this.students.update(app.id, { studentCode: source.studentCode, ...(source.dateOfBirth && source.dateOfBirth !== app.dateOfBirth ? { dateOfBirth: source.dateOfBirth } : {}),
        ...(app.arabicName && !sameName(app.arabicName, source.name) ? { arabicName: source.name } : {}) }, who);
      await this.enrollments.placeFromSource(app.id, place, who, 'Placed by the Massar import');
    }
    for (const addition of data.additions) {
      const source = pending.find(student => student.studentCode === addition.studentCode);
      if (!source || setup.appStudents.some(student => student.studentCode === source.studentCode)) this.validator.refuse('invalidStudentDecision', 422);
      await this.createFromMassar(source, addition.gender, place, actor);
    }
    const resolved = await this.reconcileStudents();
    await this.refreshAssignments(); await this.addMissingSheets();
    return { resolved };
  }
  /** Massar is the reference: a linked student takes its Massar class, birth date and Arabic name in School. */
  /**
   * Massar is the reference. The birth date is always taken from it; the
   * class and the Arabic name too, for every student not kept ("fixes").
   */
  private async applyFixes(data: MassarCommit, view: ReturnType<typeof buildImportPreview>['preview'], actor: MassarActor) {
    const fixes = new Set(data.fixes ?? []), rows = view.classes.flatMap(cls => cls.students.map(student => ({ cls, student })));
    if (fixes.size !== (data.fixes ?? []).length) this.validator.refuse('invalidStudentDecision', 422);
    for (const code of fixes) if (!rows.some(({ student }) => student.studentCode === code && student.studentId && student.school)) this.validator.refuse('invalidStudentDecision', 422);
    const who = { id: actor.id, role: actor.role ?? '' };
    for (const { cls, student } of rows) {
      if (!student.studentId || !student.school) continue;
      const fix = fixes.has(student.studentCode), { dateDiffers, nameDiffers } = student.school;
      const changes = { ...(dateDiffers ? { dateOfBirth: student.dateOfBirth } : {}), ...(fix && nameDiffers ? { arabicName: student.name } : {}) };
      if (Object.keys(changes).length) await this.students.update(student.studentId, changes, who);
      if (!fix) continue;
      const mapping = data.classes.find(item => item.name === cls.name) ?? cls;
      if (!mapping.classId || !mapping.sectionId) this.validator.refuse('invalidStudentDecision', 422);
      await this.enrollments.placeFromSource(student.studentId, { classId: mapping.classId, sectionId: mapping.sectionId }, who, 'Placed by the Massar import');
    }
  }
  @Transaction()
  async commit(data: MassarCommit, actor: MassarActor) {
    this.writable(); await this.repository.lock();
    const preview = await this.repository.previewById(data.previewId, actor.id);
    if (!preview || preview.digest !== data.digest || storedUtc(preview.expiresAt) <= Date.now()) this.validator.refuse('stalePreview');
    const bytes = await this.storage.get(NAMESPACE, preview.fileId);
    if (!bytes) this.validator.refuse('stalePreview');
    const payload: PreviewPayload = JSON.parse(bytes.toString('utf8'));
    let setup = await this.repository.setup();
    if (hash(payload) !== data.digest || setupHash(setup) !== payload.base) this.validator.refuse('stalePreview');
    let { accepted, preview: view } = buildImportPreview(payload.files, setup);
    if (!accepted.length || view.refused.length) this.validator.refuse('invalidWorkbook');
    if (!setup.year && !payload.template) this.validator.refuse('noCleanTemplate');
    this.validateMappings(data, setup);
    if (data.matches?.length || data.additions?.length) {
      await this.applyStudentDecisions({ ...data, matches: data.matches ?? [], additions: data.additions ?? [] }, view, actor);
      setup = await this.repository.setup();
      ({ accepted, preview: view } = buildImportPreview(payload.files, setup));
    }
    if (data.fixes?.length || view.classes.some(cls => cls.students.some(student => student.studentId && student.school?.dateDiffers))) {
      await this.applyFixes(data, view, actor);
      setup = await this.repository.setup();
      ({ accepted, preview: view } = buildImportPreview(payload.files, setup));
    }
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
      const pendingStudents = source.students.flatMap((student, position) => setup.appStudents.some(app => app.studentCode === student.studentCode) ? [] : [{ studentCode: student.studentCode, name: student.name, dateOfBirth: student.dateOfBirth, massarStudentId: student.massarStudentId, position }]);
      const cls = await this.repository.saveClass({ name: source.className, guid: source.classGuid, levelId: level.id, classId: mapping.classId, sectionId: mapping.sectionId, unmatchedCodes: pendingStudents.map(student => student.studentCode), pendingStudents });
      const subjectMapping = subjectMappings.find(subject => subject.level === source.level && subject.code === source.subjectCode);
      if (!subjectMapping) this.validator.refuse('invalidMapping', 422);
      const current = await this.repository.subjectForImport(level.id, source.subjectCode);
      const observedRounds = mergeObservedRounds(current?.observedRounds ?? [], source);
      const subject = await this.repository.saveSubject({ levelId: level.id, code: source.subjectCode, name: source.subjectName, subjectId: subjectMapping.subjectId, components: source.exam === 4 && current ? current.components : source.components, observedRounds, confirmed: true });
      if (current && !current.confirmed) await this.confirmSheets(subject, level.kind);
      for (const [position, student] of source.students.entries()) {
        const match = setup.appStudents.find(app => app.studentCode === student.studentCode);
        if (!match) continue; // Preview lists unmatched students; never invent identities.
        const old = setup.enrollments.find(row => row.enrollment.studentId === match.id)?.enrollment;
        if (old && old.massarClassId !== cls.id) this.validator.refuse('classConflict');
        await this.repository.saveEnrollment({ studentId: match.id, massarClassId: cls.id, massarStudentId: student.massarStudentId === null ? null : String(student.massarStudentId), massarStudentIdNumeric: typeof student.massarStudentId === 'number', name: student.name, dateOfBirth: student.dateOfBirth, position, leftOn: old?.leftOn ?? null });
      }
    }
    await this.applyModel();
    await this.refreshAssignments();
    if (data.addMissingSheets) await this.addMissingSheets();
    const importedMarks = await this.marksFromFiles(accepted.map(file => file.data), actor);
    await this.repository.consumePreview(preview.id);
    await this.transactions.afterCommit(() => this.removeStoredFiles([preview.fileId, ...(setup.year?.templateFileId && setup.year.templateFileId !== templateFileId ? [setup.year.templateFileId] : [])]));
    return { importedFiles: accepted.length, importedMarks: importedMarks.added, replacedMarks: importedMarks.replaced, unmatchedStudents: view.classes.flatMap(cls => cls.students).filter(student => !student.studentId).length };
  }
  /**
   * The marks a Massar file holds go into the matching open grid, so a test done
   * in Massar, or a mark a teacher corrected in the file, is not typed again: the
   * file's mark replaces School's. An empty cell in the file is "not entered" and
   * erases nothing. A sent grid or a closed Contrôle is never touched; a test with
   * no grid yet takes its marks when the file is imported again once it has one.
   */
  private async marksFromFiles(files: MassarExport[], actor: MassarActor) {
    const setup = await this.repository.setup();
    const counts = { added: 0, replaced: 0 };
    for (const source of files) {
      const cls = setup.classes.find(item => item.name === source.className), level = setup.levels.find(item => item.code === source.level);
      const subject = setup.subjects.find(item => item.levelId === level?.id && item.code === source.subjectCode);
      if (!cls || !level || !subject) continue;
      for (const sheet of await this.repository.openClassSheets(cls.id, subject.id)) {
        if (sheet.term !== source.term) continue;
        // A collège grid holds one test, coded with its number: a whole-term file codes each column so, a single-test file has one column.
        const fileCode = (code: string) => level.kind !== 'exam' ? code : source.termRounds ? (code === String(sheet.exam) ? code : null) : (source.exam === sheet.exam ? String(sheet.exam) : null);
        const codes = new Set(sheet.components.map(component => component.code));
        const held = new Map((await this.repository.filledCells(sheet.id)).map(cell => [`${cell.studentId}:${cell.componentCode}`, cell]));
        let replaced = 0;
        const marks: MassarMark[] = sheet.roster.flatMap(student => (source.students.find(row => row.studentCode === student.studentCode)?.marks ?? []).flatMap(mark => {
          const componentCode = fileCode(mark.componentCode);
          if (!componentCode || !codes.has(componentCode) || (mark.mark === null && mark.absence !== 'justified')) return [];
          const old = held.get(`${student.id}:${componentCode}`);
          if (old && old.absence === mark.absence && (old.mark === null ? null : Number(old.mark)) === mark.mark) return [];
          if (old) replaced++;
          return [{ studentId: student.id, componentCode, mark: mark.mark, absence: mark.absence }];
        }));
        if (!marks.length) continue;
        await this.repository.saveMarks(sheet.id, marks, actor.id);
        await this.grades?.fromMassar(sheet.id, marks, actor.id);
        if (sheet.status === 'not_started') await this.repository.updateSheet(sheet.id, { status: 'in_progress' });
        counts.added += marks.length - replaced; counts.replaced += replaced;
      }
    }
    return counts;
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
    await this.reconcileStudents();
    await this.refreshAssignments();
    await this.addMissingSheets(); return { saved: true };
  }
  private async reconcileStudents() {
    const setup = await this.repository.setup();
    let resolved = 0;
    const enrollmentClasses = new Map(setup.enrollments.map(row => [row.enrollment.studentId, row.enrollment.massarClassId]));
    for (const cls of setup.classes) {
      const ready = (cls.pendingStudents ?? []).flatMap(source => {
        const student = setup.appStudents.find(student => student.studentCode === source.studentCode && student.classId === cls.classId && student.sectionId === cls.sectionId);
        return student ? [{ source, student }] : [];
      });
      if (!ready.length) continue;
      for (const { source, student } of ready) {
        const previousClass = enrollmentClasses.get(student.id);
        if (previousClass && previousClass !== cls.id) this.validator.refuse('classConflict');
        const old = setup.enrollments.find(row => row.enrollment.studentId === student.id)?.enrollment;
        await this.repository.saveEnrollment({ studentId: student.id, massarClassId: cls.id, massarStudentId: source.massarStudentId === null ? null : String(source.massarStudentId), massarStudentIdNumeric: typeof source.massarStudentId === 'number', name: source.name, dateOfBirth: source.dateOfBirth, position: source.position, leftOn: old?.leftOn ?? null });
        enrollmentClasses.set(student.id, cls.id); resolved++;
      }
      const codes = new Set(ready.map(row => row.source.studentCode));
      await this.repository.saveClass({ ...cls, unmatchedCodes: cls.unmatchedCodes.filter(code => !codes.has(code)), pendingStudents: cls.pendingStudents.filter(student => !codes.has(student.studentCode)) });
    }
    return resolved;
  }
  @Transaction()
  async refreshStudents() {
    this.writable(); await this.repository.lock();
    const resolved = await this.reconcileStudents();
    await this.refreshAssignments(); await this.addMissingSheets();
    return { resolved };
  }
  private async refreshAssignments() { await this.repository.relinkTeachers(); }
  /**
   * Every Massar level the school has gets the model's subjects that no file
   * brought yet, so each class has all its grids. They stay "to confirm": a
   * file of this year confirms one, and export waits for it.
   */
  private async applyModel() {
    const setup = await this.repository.setup();
    if (!setup.levels.length) return;
    const model = massarModel(await this.repository.previousYearSubjects());
    for (const level of setup.levels) for (const subject of model.get(level.code)?.values() ?? []) {
      const known = setup.subjects.find(item => item.levelId === level.id && item.code === subject.code), subjectId = proposeSubject(setup.appSubjects, subject.code, subject.name)?.id ?? null;
      // A model subject still unlinked takes the School subject it now matches; a linked one keeps the registrar's choice.
      if (known) { if (!known.confirmed && !known.subjectId && subjectId) await this.repository.saveSubject({ ...known, subjectId }); continue; }
      await this.repository.addModelSubject({ levelId: level.id, code: subject.code, name: subject.name, components: subject.components, observedRounds: subject.rounds ?? [], subjectId });
    }
  }
  private async modelHasNewSubjects() {
    const levels = await this.repository.levelSubjectCodes();
    if (!levels.length) return false;
    const model = massarModel(await this.repository.previousYearSubjects());
    return levels.some(level => [...(model.get(level.code)?.keys() ?? [])].some(code => !level.subjects.has(code)));
  }
  @Transaction()
  private async applyModelToOpenRounds() {
    await this.repository.lock();
    await this.addMissingSheets();
  }
  /** A file of this year confirmed a model subject: its open grids take Massar's exact parts (the check counted any mark this drops). */
  private async confirmSheets(subject: Setup['subjects'][number], kind: string) {
    for (const sheet of await this.repository.subjectOpenSheets(subject.id)) {
      const components = sheetComponents(kind, subject.observedRounds.find(observed => observed.term === sheet.term && observed.exam === sheet.exam)?.components ?? subject.components, sheet);
      if (JSON.stringify(components) !== JSON.stringify(sheet.components)) await this.repository.replaceSheetComponents(sheet.id, components);
    }
  }
  private async addMissingSheets() {
    await this.applyModel();
    const setup = await this.repository.setup(), controls = massarPlanningControls(await this.repository.planningMonths());
    for (const round of await this.repository.allRoundsForManagement()) {
      if (round.status === 'closed') continue;
      for (const cls of setup.classes) {
        if (cls.unmatchedCodes.length) continue;
        const level = setup.levels.find(level => level.id === cls.levelId)!;
        // A class has a Contrôle's sheet when Planning gives it exams in that Contrôle.
        if (round.exam < 4 && !controls.find(control => control.term === round.term && control.exam === round.exam)?.classIds.includes(cls.classId ?? '')) continue;
        for (const subject of setup.subjects.filter(subject => subject.levelId === level.id)) {
          if ((level.kind === 'exam' && round.exam > 1 || round.exam === 4) && !subject.observedRounds.some(observed => observed.term === round.term && observed.exam === round.exam)) continue;
          const assignments = setup.assignments.filter(({ assignment }) => assignment.classId === cls.classId && assignment.sectionId === cls.sectionId && assignment.subjectId === subject.subjectId);
          await this.repository.createSheet({ roundId: round.id, massarClassId: cls.id, massarSubjectId: subject.id, teacherAssignmentId: assignments.length === 1 ? assignments[0].assignment.id : null,
            roster: await this.repository.activeRoster(cls.id), components: sheetComponents(level.kind, subject.observedRounds.find(observed => observed.term === round.term && observed.exam === round.exam)?.components ?? subject.components, round) });
        }
      }
    }
    // New grids meet their exams: marks on either side come together.
    await this.grades?.reconcile(null);
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
    await this.reconcileStudents();
    const setup = await this.repository.setup(); if (!setup.year || !setup.classes.length || !setup.subjects.length) this.validator.refuse('setupRequired');
    // A subject still to confirm has no file to show this round; it simply gets no grid for it.
    if (setup.subjects.some(subject => {
      if (!subject.confirmed) return false;
      const level = setup.levels.find(level => level.id === subject.levelId)!;
      return (data.exam === 4 || level.kind === 'exam' && data.exam > 1) && !subject.observedRounds.some(round => round.term === data.term && round.exam === data.exam);
    })) this.validator.refuse('unverifiedRound');
    // An ordinary Contrôle exists once Planning has its exams.
    if (data.exam < 4 && !massarPlanningControls(await this.repository.planningMonths()).some(control => control.term === data.term && control.exam === data.exam)) this.validator.refuse('notPlanned', 422);
    const { labelsUnseen, ...labels } = resolveRoundLabels(setup.subjects, data.term, data.exam);
    if (!labels.termLabel || !labels.examLabel) this.validator.refuse('unverifiedRound');
    this.ensureDueDate(data.dueDate ?? null);
    const round = await this.repository.createRound({ term: data.term, exam: data.exam, dueDate: data.dueDate ?? null, ...labels, createdBy: actor.id }); if (!round) this.validator.refuse('roundExists');
    await this.addMissingSheets(); return { ...round, labelsUnseen };
  }
  private ensureDueDate(dueDate: string | null) {
    if (dueDate && (dueDate < this.year.reportingStartsOn || dueDate > this.year.reportingEndsOn)) this.validator.refuse('invalidDueDate', 422);
  }
  /**
   * The school's Contrôles of the year. A plan never drops a Contrôle already
   * opened; dates are the default due date offered when one is opened.
   */
  @Transaction()
  async savePlan(data: MassarPlanInput) {
    this.writable(); await this.repository.lock();
    if (!await this.repository.yearConfig()) this.validator.refuse('setupRequired');
    // The Contrôles come from Planning; the plan keeps only their due dates.
    const controls = massarPlanningControls(await this.repository.planningMonths()), keys = data.dates.map(date => `${date.term}:${date.exam}`);
    if (new Set(keys).size !== keys.length || data.dates.some(date => !controls.some(control => control.term === date.term && control.exam === date.exam))) this.validator.refuse('invalidPlan', 422);
    for (const date of data.dates) this.ensureDueDate(date.dueDate);
    await this.repository.savePlan({ primary: data.primary, college: data.college, dates: data.dates.flatMap(date => date.dueDate ? [{ term: date.term, exam: date.exam, dueDate: date.dueDate }] : []) });
    return { saved: true };
  }
  @Transaction()
  async changeDueDate(id: string, dueDate: string | null) {
    this.writable(); await this.repository.lock(); this.ensureDueDate(dueDate);
    if (!(await this.repository.allRoundsForManagement()).some(round => round.id === id)) this.validator.refuse('notFound', 404);
    await this.repository.updateDueDate(id, dueDate); return { saved: true };
  }
  async sheets(roundId?: string) {
    if (this.year.status !== 'closed') {
      // A subject the default model gained since this year was set up gets its grids in the open Contrôles.
      if (await this.modelHasNewSubjects()) await this.applyModelToOpenRounds();
      // A teacher assigned in School since the sheets were made shows here (and finds their sheets) at once.
      await this.repository.relinkTeachers();
    }
    const [rows, counts] = await Promise.all([this.repository.sheets(roundId), this.repository.completedMarkCounts(roundId)]);
    const completed = new Map(counts.map(row => [row.sheetId, row.completed]));
    return rows.map(row => summarizeSheet(row, completed.get(row.sheet.id) ?? 0));
  }
  async gradeSources(): Promise<MassarGradeSource[]> {
    const rows = await this.repository.sheets();
    const links = await this.grades?.examLinks(rows.map(row => row.sheet.id)) ?? [];
    const linked = new Map(links.map(cell => [JSON.stringify([cell.sheet.id, cell.componentCode]), cell.exam.id]));
    return rows.flatMap(({ sheet, cls, subject, level, round, teacherId }) => {
      if (!cls.classId || !cls.sectionId || !subject.subjectId) return [];
      return sheet.components.map(component => ({
        id: `massar:${sheet.id}:${encodeURIComponent(component.code)}`,
        sheetId: sheet.id, componentCode: component.code, title: component.name.trim(),
        classId: cls.classId!, sectionId: cls.sectionId!, subjectId: subject.subjectId!, teacherId,
        totalMarks: Number(level.maxMark), term: round.term, exam: round.exam, termLabel: round.termLabel, examLabel: round.examLabel,
        linkedExamId: linked.get(JSON.stringify([sheet.id, component.code])) ?? null,
      }));
    });
  }
  async sheet(id: string, actor: MassarActor): Promise<MassarSheetDetail> {
    if (this.year.status !== 'closed') await this.repository.relinkTeachers();
    const row = await this.requireSheet(id), marks = numericMarks(await this.repository.marks(id)), manager = mayManageMassar(actor);
    const config = await this.repository.yearConfig();
    return { sheet: summarizeSheet(row, marks), round: row.round, components: row.sheet.components, maxMark: row.level.maxMark, students: row.sheet.roster, marks,
      schoolName: config?.schoolName ?? '', levelLabel: row.level.label, yearLabel: this.year.label,
      canEdit: this.year.status !== 'closed' && row.round.status !== 'closed' && (manager || actor.role === 'teacher') && row.sheet.status !== 'exported' && (row.sheet.status !== 'changed_after_export' || row.sheet.teacherUnlocked), canReopen: manager && this.year.status !== 'closed' && row.round.status !== 'closed' && row.sheet.status === 'exported' };
  }
  @Transaction()
  async saveMarks(id: string, data: MassarMarksInput, actor: MassarActor) {
    await this.repository.lock(); const row = await this.ownedOpenSheet(id, data.revision, actor);
    this.validator.ensureMarks(data, row.sheet.roster, row.sheet.components, row.level.maxMark);
    await this.repository.saveMarks(id, data.marks, actor.id);
    await this.grades?.fromMassar(id, data.marks, actor.id);
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
    await this.repository.updateRound(row.round.id, 'open');
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
  private async workbook(row: Sheet, empty: boolean, template: Uint8Array, config: NonNullable<Awaited<ReturnType<MassarRepository['yearConfig']>>>) {
    const [storedMarks, hiddenIds] = await Promise.all([this.repository.marks(row.sheet.id), this.repository.hiddenIds(row.sheet.id)]);
    const marks = numericMarks(storedMarks);
    const observed = row.subject.observedRounds.find(round => round.term === row.round.term && round.exam === row.round.exam);
    const data: MassarExport = { schoolCode: config.schoolCode, classGuid: row.cls.guid, yearId: config.massarYearId, academy: config.academy, direction: config.direction, schoolName: config.schoolName,
      levelCode: row.level.levelCodeNumeric ? Number(row.level.levelCode) : row.level.levelCode, level: row.level.code, levelLabel: row.level.label, className: row.cls.name,
      term: row.round.term, exam: row.round.exam, termLabel: observed?.termLabel ?? row.round.termLabel, examLabel: observed?.examLabel ?? row.round.examLabel, yearLabel: this.year.label.replace('-', '/'), subjectCode: row.subject.code, subjectName: row.subject.name,
      kind: row.level.kind, maxMark: row.level.maxMark, components: row.sheet.components, clean: false,
      students: row.sheet.roster.map(student => ({ ...student, massarStudentId: student.massarStudentId || hiddenIds.find(enrollment => enrollment.studentId === student.id)?.massarStudentId || null, marks: marks.filter(mark => mark.studentId === student.id) })) };
    if (!empty && data.students.some(student => !student.massarStudentId)) this.validator.refuse('missingHiddenId');
    return { bytes: await writeSheet(template, data, empty), digest: hash(marks.sort((a, b) => `${a.studentId}:${a.componentCode}`.localeCompare(`${b.studentId}:${b.componentCode}`))) };
  }
  async downloadEmpty(id: string) {
    const row = await this.requireSheet(id), config = await this.repository.yearConfig(); if (!config) this.validator.refuse('setupRequired');
    if (!row.subject.confirmed) this.validator.refuse('subjectUnconfirmed');
    const template = await this.storage.get(NAMESPACE, config.templateFileId); if (!template) this.validator.refuse('noCleanTemplate');
    return { ...await this.workbook(row, true, template, config), name: exportName(row) };
  }
  @Transaction()
  async exportSheets(ids: string[], empty: boolean) {
    return (await this.buildExport(ids, empty)).bytes;
  }
  @Transaction()
  async downloadRound(id: string) {
    this.writable(); await this.repository.lock();
    const all = await this.repository.sheets(id);
    if (!all.length || all.length > 400) this.validator.refuse('invalidSelection', 422);
    // A grid whose subject a Massar file of this year has not confirmed stays out of the download.
    const sheets = all.filter(row => row.subject.confirmed);
    if (!sheets.length) this.validator.refuse('subjectUnconfirmed');
    // The whole Contrôle is what goes to Massar: downloading it locks exactly the marks it carries, in the same transaction.
    const result = await this.buildExport(sheets.map(row => row.sheet.id), false);
    const exportedAt = new Date().toISOString();
    for (const [index, row] of result.rows.entries())
      await this.repository.updateSheet(row.sheet.id, { status: 'exported', teacherUnlocked: false, exportedAt, exportHash: result.digests[index] });
    const roundSheets = await this.repository.sheets(id);
    if (roundSheets.length && roundSheets.every(row => row.sheet.status === 'exported')) await this.repository.updateRound(id, 'exported');
    return { bytes: result.bytes, locked: result.rows.length };
  }
  /**
   * One class's sheets as Massar files, to check them: nothing is marked as
   * sent, so it does not wait for this year's file to confirm a subject (one
   * still to confirm keeps last year's spelling). One sheet comes as its .xlsx,
   * several as a zip.
   */
  @Transaction()
  async exportClass(ids: string[]) {
    const { bytes, files, rows } = await this.buildExport(ids, false, true);
    if (new Set(rows.map(row => row.cls.id)).size !== 1) this.validator.refuse('invalidSelection', 422);
    const names = Object.keys(files);
    return names.length === 1 ? { bytes: files[names[0]], name: names[0], type: MASSAR_MIME }
      : { bytes, name: `export_notesCC_${rows[0].cls.name.replace(/[^\w-]/g, '_')}.zip`, type: 'application/zip' };
  }
  private async buildExport(ids: string[], empty: boolean, check = false) {
    // Massar accepted School's filled files on 2026-11-08: sending is no longer held back by a first import test.
    this.writable();
    await this.repository.lock();
    const config = await this.repository.yearConfig(); if (!config) this.validator.refuse('setupRequired');
    const template = await this.storage.get(NAMESPACE, config.templateFileId); if (!template) this.validator.refuse('noCleanTemplate');
    const files: Record<string, Uint8Array> = {}, exported: Sheet[] = [], digests: string[] = [];
    if (new Set(ids).size !== ids.length) this.validator.refuse('invalidSelection', 422);
    for (const id of ids) {
      const row = await this.requireSheet(id);
      if (exported.length && exported[0].round.id !== row.round.id) this.validator.refuse('invalidSelection', 422);
      if (row.round.status === 'closed') this.validator.refuse('locked');
      // Sending waits for this year's file to confirm a subject; a check exports it with last year's spelling.
      if (!row.subject.confirmed && !check) this.validator.refuse('subjectUnconfirmed');
      const result = await this.workbook(row, empty, template, config), name = exportName(row);
      if (files[name]) this.validator.refuse('invalidSelection', 422);
      files[name] = result.bytes; exported.push(row); digests.push(result.digest);
    }
    const bytes = zipSync(files);
    return { bytes, files, rows: exported, digests };
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
