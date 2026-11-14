import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
import { StorageService } from 'najm-storage';
import { matchPermission } from 'najm-auth/client';
import {
  massarPlanningControls, withStatementDefaults,
  type MassarComponent, type MassarGradeSource, type MassarMark, type MassarSheetDetail, type MassarSheetRow, type MassarStudent,
} from '@sms/contracts';
import { Inject, LoggerService, Service, Transaction, TransactionService } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { StudentService } from '../students/StudentService';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { MassarRepository } from './MassarRepository';
import { MassarValidator, mayManageMassar, type MassarActor, type MassarEntry } from './MassarValidator';
import { MassarGradeLink } from './MassarGradeLink';
import {
  normalizeStatement,
  type MassarCommit, type MassarMappings, type MassarMarksInput, type MassarPlanInput, type MassarResolve, type MassarRoundInput, type MassarStatementInput,
} from './MassarDto';
import {
  buildImportPreview, pendingWithSuggestions, proposeSubject, sameName,
  type ImportedFile, type RefusedFile, type Setup,
} from './importPreview';
import { massarModel } from './massarModel';
import { resolveRoundLabels } from './roundLabels';
import { readExport, unpack, MassarWorkbookError, type MassarExport } from './workbook/readExport';
import { writeSheet } from './workbook/writeSheet';
import { MASSAR_MIME } from './workbook/cells';

// ─── Constants ──────────────────────────────────────────────────────────────

const NAMESPACE = 'massar';
const MB = 1024 * 1024;
/** Upload limits for one import check: files sent, their total size, and what their zips expand to. */
const MAX_UPLOAD_FILES = 200;
const MAX_UPLOAD_BYTES = 15 * MB;
const MAX_EXPANDED_BYTES = 30 * MB;
/** How long an import check can still be committed. */
const PREVIEW_TTL_MS = 60 * 60 * 1000;
/** A Contrôle download holds at most this many sheets. */
const MAX_ROUND_SHEETS = 400;
/** The enrollment note left when the import places a student in a class. */
const PLACED_BY_IMPORT = 'Placed by the Massar import';

/** When the sheet list last brought every grid of a year up to date (teachers, rosters, new subjects), by year id. */
const FULL_REFRESH = new Map<string, number>();
const FULL_REFRESH_MS = 60_000;

// ─── Types ──────────────────────────────────────────────────────────────────

type Sheet = NonNullable<Awaited<ReturnType<MassarRepository['sheetById']>>>;
type YearConfig = NonNullable<Awaited<ReturnType<MassarRepository['yearConfig']>>>;
type ImportView = ReturnType<typeof buildImportPreview>['preview'];
type PreviewPayload = { files: ImportedFile[]; template: string | null; base: string };
type ObservedRound = { term: number; exam: number; termLabel: string; examLabel: string; components: MassarComponent[] };
type RoundKey = { term: number; exam: number };
/** The Massar data an enrollment keeps about a student: from a file row or a pending student. */
type MassarStudentSource = Pick<MassarExport['students'][number], 'massarStudentId' | 'name' | 'dateOfBirth'>;

// ─── Pure helpers ───────────────────────────────────────────────────────────

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** The setup a preview was checked against, whatever order the database returns its rows in. */
const setupHash = (setup: Setup) => {
  const tables = [setup.levels, setup.classes, setup.subjects, setup.enrollments, setup.appStudents, setup.appClasses, setup.appSections, setup.appSubjects];
  const sorted = tables.map(rows => [...rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
  return hash([setup.year, ...sorted]);
};

const numericMarks = (marks: Awaited<ReturnType<MassarRepository['marks']>>): MassarMark[] =>
  marks.map(mark => ({ ...mark, mark: mark.mark === null ? null : Number(mark.mark) }));

const sameRound = (a: RoundKey, b: RoundKey) => a.term === b.term && a.exam === b.exam;

/** The parts a subject's grid has in one round: what a file showed for that round, else the subject's own. */
const roundComponents = (subject: Setup['subjects'][number], round: RoundKey) =>
  subject.observedRounds.find(observed => sameRound(observed, round))?.components ?? subject.components;

/** The user a student change is made as. */
const asUser = (actor: MassarActor) => ({ id: actor.id, role: actor.role ?? '' });

/** What `saveEnrollment` stores for a student linked to a Massar class. */
const enrollmentRow = (studentId: string, massarClassId: string, source: MassarStudentSource, position: number, leftOn: string | null) => ({
  studentId,
  massarClassId,
  massarStudentId: source.massarStudentId === null ? null : String(source.massarStudentId),
  massarStudentIdNumeric: typeof source.massarStudentId === 'number',
  name: source.name,
  dateOfBirth: source.dateOfBirth,
  position,
  leftOn,
});

/** A CSV cell, quoted, with a leading formula character neutralised. */
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""').replace(/^\s*[=+@-]/, "'$&")}"`;

function exportName(row: Sheet) {
  const safe = (name: string) => name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.+$/g, '').slice(0, 150);
  return `export_notesCC_${safe(row.cls.name)}_${safe(row.subject.code)}.xlsx`;
}

/**
 * `expires_at` is a timestamp without a zone holding UTC digits (written from
 * toISOString). Read it back as UTC: Date.parse would take the server's local
 * time, and in Morocco (UTC+1) every check would expire the moment it is made.
 */
export const storedUtc = (stamp: string) =>
  Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(stamp) ? stamp : `${stamp.replace(' ', 'T')}Z`);

/**
 * The rounds a file shows Massar holds for its subject replace what earlier files (or the default model) said about them.
 * A whole-term export lists every test of its term, each as its own single-test file would, so it replaces the whole term.
 */
export function mergeObservedRounds(current: ObservedRound[], source: MassarExport): ObservedRound[] {
  const seen = (source.termRounds ?? [{ exam: source.exam, examLabel: source.examLabel, components: source.components }])
    .map(round => ({ term: source.term, termLabel: source.termLabel, ...round }));
  const kept = current.filter(round =>
    round.term !== source.term || (!source.termRounds && !seen.some(item => item.exam === round.exam)));
  return [...kept, ...seen];
}

/** A collège ("exam") grid holds one column, the test itself; a primary grid holds the subject's parts. */
export const sheetComponents = (kind: string, components: MassarComponent[], round: MassarRoundInput & { examLabel: string }) =>
  kind === 'exam' ? [{ code: String(round.exam), name: round.examLabel }] : components;

/** A roster's content, whatever key order the database returns it in. */
export const rosterKey = (roster: MassarStudent[]) =>
  JSON.stringify(roster.map(student => [student.id, student.studentCode, student.name, student.dateOfBirth, student.massarStudentId, student.position]));

export function summarizeSheet(row: Sheet, marks: MassarMark[] | number): MassarSheetRow {
  const listed = new Set(row.sheet.roster.map(student => student.id));
  const completed = typeof marks === 'number'
    ? marks
    : marks.filter(mark => listed.has(mark.studentId) && (mark.mark !== null || mark.absence === 'justified')).length;
  const total = row.sheet.roster.length * row.sheet.components.length;
  const dueDate = row.round.dueDate ?? null;
  const late = !!dueDate && dueDate < getBusinessDateOnly() && total > completed && row.sheet.status !== 'exported';
  return {
    id: row.sheet.id,
    roundId: row.sheet.roundId,
    className: row.cls.name,
    subjectName: row.subject.name,
    subjectConfirmed: row.subject.confirmed,
    teacherName: row.teacherName,
    status: row.sheet.status,
    revision: row.sheet.revision,
    total,
    missing: total - completed,
    termLabel: row.round.termLabel,
    examLabel: row.round.examLabel,
    roundStatus: row.round.status,
    dueDate,
    late,
  };
}

// ─── Service ────────────────────────────────────────────────────────────────

@Service()
export class MassarService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @Inject(TransactionService) private transactions!: TransactionService;
  @Inject(LoggerService) private log!: LoggerService;

  // `grades` keeps each grid and School's exam grades the same mark; tests that build the service by hand leave it out.
  constructor(
    private repository: MassarRepository,
    private validator: MassarValidator,
    private storage: StorageService,
    private students: StudentService,
    private enrollments: StudentEnrollmentService,
    private grades?: MassarGradeLink,
  ) {}

  // ── Guards ────────────────────────────────────────────────────────────────

  private writable() {
    if (this.year.status === 'closed') this.validator.refuse('closedYear');
  }

  private async requireSheet(id: string) {
    const row = await this.repository.sheetById(id);
    if (!row) this.validator.refuse('notFound', 404);
    return row;
  }

  /** A round of this year, as managers see them (opened, sent or closed). */
  private async requireManagedRound(id: string) {
    const round = (await this.repository.allRoundsForManagement()).find(item => item.id === id);
    if (!round) this.validator.refuse('notFound', 404);
    return round;
  }

  private async ownedOpenSheet(id: string, revision: number, actor: MassarActor, entry: MassarEntry = 'massar') {
    this.writable();
    const row = await this.requireSheet(id);
    if (row.round.status === 'closed') this.validator.refuse('locked');
    this.validator.ensureWriter(actor, row.sheet, mayManageMassar(actor), entry);
    if (row.sheet.revision !== revision) this.validator.refuse('staleSheet');
    return row;
  }

  private ensureDueDate(dueDate: string | null) {
    if (dueDate && (dueDate < this.year.reportingStartsOn || dueDate > this.year.reportingEndsOn)) this.validator.refuse('invalidDueDate', 422);
  }

  /** The same Massar student cannot be both matched and added, nor one School student matched twice. */
  private ensureDistinctDecisions(matches: Array<{ studentCode: string; studentId: string }>, additions: Array<{ studentCode: string }>) {
    const codes = [...matches.map(match => match.studentCode), ...additions.map(addition => addition.studentCode)];
    const studentIds = new Set(matches.map(match => match.studentId));
    if (new Set(codes).size !== codes.length || studentIds.size !== matches.length) this.validator.refuse('invalidStudentDecision', 422);
  }

  private validateMappings(mappings: MassarMappings, setup: Setup) {
    for (const cls of mappings.classes) {
      const halfMapped = (cls.classId === null) !== (cls.sectionId === null);
      const unknown = !!cls.classId && (
        !setup.appClasses.some(app => app.id === cls.classId)
        || !setup.appSections.some(section => section.id === cls.sectionId && section.classId === cls.classId));
      if (halfMapped || unknown) this.validator.refuse('invalidMapping', 422);
    }
    const duplicateClass = new Set(mappings.classes.map(cls => cls.name)).size !== mappings.classes.length;
    const duplicateSubject = new Set(mappings.subjects.map(subject => `${subject.level}:${subject.code}`)).size !== mappings.subjects.length;
    const unknownSubject = mappings.subjects.some(subject => subject.subjectId && !setup.appSubjects.some(app => app.id === subject.subjectId));
    if (duplicateClass || duplicateSubject || unknownSubject) this.validator.refuse('invalidMapping', 422);
  }

  private async removeStoredFiles(fileIds: string[]) {
    for (const fileId of fileIds) {
      try {
        await this.storage.delete(NAMESPACE, fileId);
      } catch (error) {
        this.log.error('Massar file deletion failed; maintenance will retry', error);
      }
    }
  }

  // ── Setup and availability ────────────────────────────────────────────────

  async setup() {
    const setup = await this.repository.setup();
    const pending = pendingWithSuggestions(setup);
    return {
      ...setup,
      classes: setup.classes.map(cls => ({ ...cls, pendingStudents: pending.get(cls.id) ?? [] })),
      year: setup.year ? { ...setup.year, templateFileId: undefined, templateReady: true } : null,
    };
  }

  async availability() {
    const [config, rounds, planning] = await Promise.all([
      this.repository.yearConfig(), this.repository.allRoundsForManagement(), this.repository.planningMonths(),
    ]);
    // Every reader sees the year's planned Contrôles and their dates, opened or not, with when Planning holds their exams.
    // Planning decides which Contrôles exist; Massar setup only adds a due date.
    const planned = config
      ? massarPlanningControls(planning).map(({ term, exam, examFrom, examTo }) => ({
        term, exam, examFrom, examTo,
        dueDate: config.plan?.dates.find(date => sameRound(date, { term, exam }))?.dueDate ?? null,
      }))
      : [];
    return {
      configured: !!config,
      hasRounds: rounds.length > 0,
      planned,
      plan: config?.plan ?? null,
      statement: config ? withStatementDefaults(config.statement) : null,
    };
  }

  // ── Import: check (preview) ───────────────────────────────────────────────

  async previewUploads(uploads: File[], actor: MassarActor) {
    this.writable();
    const uploadBytes = uploads.reduce((sum, file) => sum + file.size, 0);
    if (!uploads.length || uploads.length > MAX_UPLOAD_FILES || uploadBytes > MAX_UPLOAD_BYTES) this.validator.refuse('tooLarge', 413);

    const files: ImportedFile[] = [], refused: RefusedFile[] = [];
    const originals = new Map<MassarExport, Uint8Array>();
    let expanded = 0;
    const read = async (name: string, bytes: Uint8Array) => {
      expanded += bytes.length;
      if (expanded > MAX_EXPANDED_BYTES || files.length + refused.length >= MAX_UPLOAD_FILES) this.validator.refuse('tooLarge', 413);
      try {
        const data = await readExport(bytes);
        files.push({ name, data });
        if (data.clean) originals.set(data, bytes);
      } catch (error) {
        if (!(error instanceof MassarWorkbookError)) throw error;
        refused.push({ name, key: error.key });
      }
    };

    for (const upload of uploads) {
      const bytes = new Uint8Array(await upload.arrayBuffer());
      if (/\.zip$/i.test(upload.name)) {
        let entries: Record<string, Uint8Array>;
        try {
          entries = unpack(bytes, MAX_EXPANDED_BYTES);
        } catch (error) {
          if (!(error instanceof MassarWorkbookError)) throw error;
          refused.push({ name: upload.name, key: error.key });
          continue;
        }
        for (const [name, contents] of Object.entries(entries)) {
          if (/\.xlsx$/i.test(name) && !name.startsWith('__MACOSX/')) await read(name, contents);
        }
      } else if (/\.xlsx$/i.test(upload.name)) {
        await read(upload.name, bytes);
      } else {
        refused.push({ name: upload.name, key: 'invalidWorkbook' });
      }
    }

    const setup = await this.repository.setup();
    const result = buildImportPreview(files, setup, refused);
    // A file confirming a subject from the model: count the marks its parts would no longer hold.
    for (const subject of result.preview.subjects) {
      if (!subject.confirms) continue;
      const level = setup.levels.find(item => item.code === subject.level);
      const old = setup.subjects.find(item => item.levelId === level?.id && item.code === subject.code);
      if (old) subject.lostMarks = await this.repository.marksOutside(old.id, subject.components.map(component => component.code));
    }

    // Generated sheets hold one test: only a single-test export has that layout to copy.
    const cleanFile = result.accepted.findLast(file => file.data.clean && !file.data.termRounds);
    const template = cleanFile ? originals.get(cleanFile.data) ?? null : null;
    const payload: PreviewPayload = {
      files: result.accepted,
      template: template ? Buffer.from(template).toString('base64') : null,
      base: setupHash(setup),
    };

    const id = crypto.randomUUID(), digest = hash(payload), fileId = `${id}_preview.txt`;
    await this.storage.save(NAMESPACE, fileId, Buffer.from(JSON.stringify(payload)), 'text/plain');
    try {
      await this.repository.createPreview({ id, actorId: actor.id, digest, fileId, expiresAt: new Date(Date.now() + PREVIEW_TTL_MS).toISOString() });
    } catch (error) {
      await this.storage.delete(NAMESPACE, fileId);
      throw error;
    }
    return { ...result.preview, previewId: id, digest };
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

  // ── Import: commit ────────────────────────────────────────────────────────

  @Transaction()
  async commit(data: MassarCommit, actor: MassarActor) {
    this.writable();
    await this.repository.lock();

    // The check must be this actor's, unexpired, unchanged, and made against today's setup.
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

    // Student decisions change School's students: the check is built again over the result.
    const rebuild = async () => {
      setup = await this.repository.setup();
      ({ accepted, preview: view } = buildImportPreview(payload.files, setup));
    };
    if (data.matches?.length || data.additions?.length) {
      await this.applyStudentDecisions({ ...data, matches: data.matches ?? [], additions: data.additions ?? [] }, view, actor);
      await rebuild();
    }
    const birthDatesDiffer = view.classes.some(cls => cls.students.some(student => student.studentId && student.school?.dateDiffers));
    if (data.fixes?.length || birthDatesDiffer) {
      await this.applyFixes(data, view, actor);
      await rebuild();
    }

    const templateFileId = await this.storeTemplate(payload.template, setup.year?.templateFileId);
    const first = accepted[0].data;
    await this.repository.saveYear({
      massarYearId: first.yearId, schoolCode: first.schoolCode, academy: first.academy, direction: first.direction,
      schoolName: first.schoolName, templateFileId: templateFileId!, importedBy: actor.id,
    });

    const classMappings = data.classes.length ? data.classes : view.classes;
    const subjectMappings = data.subjects.length ? data.subjects : view.subjects;
    for (const { data: source } of accepted) await this.importFile(source, setup, classMappings, subjectMappings);

    await this.applyModel();
    await this.refreshAssignments();
    if (data.addMissingSheets) await this.addMissingSheets();
    else await this.syncRosters();

    const importedMarks = await this.marksFromFiles(accepted.map(file => file.data), actor);
    await this.repository.consumePreview(preview.id);
    const replacedTemplate = setup.year?.templateFileId && setup.year.templateFileId !== templateFileId ? [setup.year.templateFileId] : [];
    await this.transactions.afterCommit(() => this.removeStoredFiles([preview.fileId, ...replacedTemplate]));

    return {
      importedFiles: accepted.length,
      importedMarks: importedMarks.added,
      replacedMarks: importedMarks.replaced,
      unmatchedStudents: view.classes.flatMap(cls => cls.students).filter(student => !student.studentId).length,
    };
  }

  /** Saves a new clean template when the check brought one (removed again if the import rolls back); else keeps the current one. */
  private async storeTemplate(template: string | null, currentId: string | undefined) {
    if (!template) return currentId;
    const fileId = `${crypto.randomUUID()}_template.xlsx`;
    await this.storage.save(NAMESPACE, fileId, Buffer.from(template, 'base64'), MASSAR_MIME);
    await this.transactions.afterRollback(() => this.removeStoredFiles([fileId]));
    return fileId;
  }

  /** One file of a commit: its level, class, subject and the enrollments of the students School already has. */
  private async importFile(
    source: MassarExport,
    setup: Setup,
    classMappings: Array<{ name: string; classId?: string | null; sectionId?: string | null }>,
    subjectMappings: Array<{ level: string; code: string; subjectId?: string | null }>,
  ) {
    const level = await this.repository.saveLevel({
      code: source.level, label: source.levelLabel, levelCode: String(source.levelCode),
      levelCodeNumeric: typeof source.levelCode === 'number', maxMark: source.maxMark, kind: source.kind,
    });

    const mapping = classMappings.find(cls => cls.name === source.className);
    if (!mapping) this.validator.refuse('invalidMapping', 422);
    const known = (studentCode: string) => setup.appStudents.some(app => app.studentCode === studentCode);
    const pendingStudents = source.students.flatMap((student, position) => known(student.studentCode) ? [] : [{
      studentCode: student.studentCode, name: student.name, dateOfBirth: student.dateOfBirth, massarStudentId: student.massarStudentId, position,
    }]);
    const cls = await this.repository.saveClass({
      name: source.className, guid: source.classGuid, levelId: level.id, classId: mapping.classId, sectionId: mapping.sectionId,
      unmatchedCodes: pendingStudents.map(student => student.studentCode), pendingStudents,
    });

    const subjectMapping = subjectMappings.find(subject => subject.level === source.level && subject.code === source.subjectCode);
    if (!subjectMapping) this.validator.refuse('invalidMapping', 422);
    const current = await this.repository.subjectForImport(level.id, source.subjectCode);
    const subject = await this.repository.saveSubject({
      levelId: level.id, code: source.subjectCode, name: source.subjectName, subjectId: subjectMapping.subjectId,
      // The integrated activities' file (exam 4) does not describe the subject's parts.
      components: source.exam === 4 && current ? current.components : source.components,
      observedRounds: mergeObservedRounds(current?.observedRounds ?? [], source),
      confirmed: true,
    });
    if (current && !current.confirmed) await this.confirmSheets(subject, level.kind);

    for (const [position, student] of source.students.entries()) {
      const match = setup.appStudents.find(app => app.studentCode === student.studentCode);
      if (!match) continue; // Preview lists unmatched students; never invent identities.
      const old = setup.enrollments.find(row => row.enrollment.studentId === match.id)?.enrollment;
      if (old && old.massarClassId !== cls.id) this.validator.refuse('classConflict');
      await this.repository.saveEnrollment(enrollmentRow(match.id, cls.id, student, position, old?.leftOn ?? null));
    }
  }

  /**
   * Applies the import check's decisions inside the import transaction: a
   * "same student" gives the suggested School student its Massar code; an
   * addition creates the student from Massar's data (Arabic name, code, birth
   * date, mapped class) with the gender the registrar chose. Only the check's
   * own suggestions and unmatched Massar students are accepted.
   */
  private async applyStudentDecisions(data: MassarCommit, view: ImportView, actor: MassarActor) {
    const rows = view.classes.flatMap(cls => cls.students.filter(student => !student.studentId).map(student => ({ cls, student })));
    this.ensureDistinctDecisions(data.matches, data.additions);
    for (const match of data.matches) {
      const row = rows.find(({ student }) => student.studentCode === match.studentCode && student.suggestion?.studentId === match.studentId);
      if (!row) this.validator.refuse('invalidStudentDecision', 422);
      await this.students.update(match.studentId, { studentCode: match.studentCode }, asUser(actor));
    }
    for (const addition of data.additions) {
      const row = rows.find(({ student }) => student.studentCode === addition.studentCode);
      const mapping = row && (data.classes.find(cls => cls.name === row.cls.name) ?? row.cls);
      if (!row || !mapping?.classId || !mapping.sectionId) this.validator.refuse('invalidStudentDecision', 422);
      await this.createFromMassar(row.student, addition.gender, { classId: mapping.classId, sectionId: mapping.sectionId }, actor);
    }
  }

  /**
   * Massar is the reference. The birth date is always taken from it; the
   * class and the Arabic name too, for every student not kept ("fixes").
   */
  private async applyFixes(data: MassarCommit, view: ImportView, actor: MassarActor) {
    const fixes = new Set(data.fixes ?? []);
    const rows = view.classes.flatMap(cls => cls.students.map(student => ({ cls, student })));
    if (fixes.size !== (data.fixes ?? []).length) this.validator.refuse('invalidStudentDecision', 422);
    for (const code of fixes) {
      if (!rows.some(({ student }) => student.studentCode === code && student.studentId && student.school)) this.validator.refuse('invalidStudentDecision', 422);
    }

    const who = asUser(actor);
    for (const { cls, student } of rows) {
      if (!student.studentId || !student.school) continue;
      const fix = fixes.has(student.studentCode);
      const { dateDiffers, nameDiffers } = student.school;
      const changes = {
        ...(dateDiffers ? { dateOfBirth: student.dateOfBirth } : {}),
        ...(fix && nameDiffers ? { arabicName: student.name } : {}),
      };
      if (Object.keys(changes).length) await this.students.update(student.studentId, changes, who);
      if (!fix) continue;

      const mapping = data.classes.find(item => item.name === cls.name) ?? cls;
      if (!mapping.classId || !mapping.sectionId) this.validator.refuse('invalidStudentDecision', 422);
      await this.enrollments.placeFromSource(student.studentId, { classId: mapping.classId, sectionId: mapping.sectionId }, who, PLACED_BY_IMPORT);
    }
  }

  /** A Massar student School does not have: created from Massar's data, to be completed in Students. */
  private async createFromMassar(
    source: { studentCode: string; name: string; dateOfBirth: string },
    gender: 'M' | 'F',
    place: { classId: string; sectionId: string },
    actor: MassarActor,
  ) {
    // Enrolled today, kept inside the year's reporting period.
    const today = getBusinessDateOnly();
    const { reportingStartsOn, reportingEndsOn } = this.year;
    const enrolledOn = today < reportingStartsOn ? reportingStartsOn : today > reportingEndsOn ? reportingEndsOn : today;
    await this.students.create({
      studentCode: source.studentCode,
      name: source.name,
      arabicName: source.name,
      gender,
      dateOfBirth: source.dateOfBirth || undefined,
      ...place,
      enrollmentDate: enrolledOn,
      yearEnrolledOn: enrolledOn,
      status: 'active',
    }, asUser(actor));
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
      const cls = setup.classes.find(item => item.name === source.className);
      const level = setup.levels.find(item => item.code === source.level);
      const subject = setup.subjects.find(item => item.levelId === level?.id && item.code === source.subjectCode);
      if (!cls || !level || !subject) continue;

      for (const sheet of await this.repository.openClassSheets(cls.id, subject.id)) {
        if (sheet.term !== source.term) continue;
        // A collège grid holds one test, coded with its number: a whole-term file codes each column so, a single-test file has one column.
        const fileCode = (code: string) => {
          if (level.kind !== 'exam') return code;
          if (source.termRounds) return code === String(sheet.exam) ? code : null;
          return source.exam === sheet.exam ? String(sheet.exam) : null;
        };
        const codes = new Set(sheet.components.map(component => component.code));
        const held = new Map((await this.repository.filledCells(sheet.id)).map(cell => [`${cell.studentId}:${cell.componentCode}`, cell]));

        let replaced = 0;
        const marks: MassarMark[] = sheet.roster.flatMap(student => {
          const fileMarks = source.students.find(row => row.studentCode === student.studentCode)?.marks ?? [];
          return fileMarks.flatMap(mark => {
            const componentCode = fileCode(mark.componentCode);
            if (!componentCode || !codes.has(componentCode) || (mark.mark === null && mark.absence !== 'justified')) return [];
            const old = held.get(`${student.id}:${componentCode}`);
            if (old && old.absence === mark.absence && (old.mark === null ? null : Number(old.mark)) === mark.mark) return [];
            if (old) replaced++;
            return [{ studentId: student.id, componentCode, mark: mark.mark, absence: mark.absence }];
          });
        });
        if (!marks.length) continue;

        await this.repository.saveMarks(sheet.id, marks, actor.id);
        await this.grades?.fromMassar(sheet.id, marks, actor.id);
        // Always a new revision: a grid open on screen takes the file's marks only from a newer one.
        await this.repository.updateSheet(sheet.id, sheet.status === 'not_started' ? { status: 'in_progress' } : {});
        counts.added += marks.length - replaced;
        counts.replaced += replaced;
      }
    }
    return counts;
  }

  // ── Pending students and mappings ─────────────────────────────────────────

  /**
   * Decisions for a class already imported that waits for students: the same
   * "same student?" and "add" choices as the import check. A recognised student
   * takes its code, class, birth date and Arabic name from Massar; the class
   * gets its sheets once nobody is missing.
   */
  @Transaction()
  async resolvePending(data: MassarResolve, actor: MassarActor) {
    this.writable();
    await this.repository.lock();
    const setup = await this.repository.setup();
    const cls = setup.classes.find(item => item.id === data.massarClassId);
    if (!cls?.classId || !cls.sectionId) this.validator.refuse('invalidStudentDecision', 422);

    const place = { classId: cls.classId, sectionId: cls.sectionId };
    const pending = pendingWithSuggestions(setup).get(cls.id) ?? [];
    const who = asUser(actor);
    this.ensureDistinctDecisions(data.matches, data.additions);

    for (const match of data.matches) {
      const source = pending.find(student => student.studentCode === match.studentCode && student.suggestion?.studentId === match.studentId);
      const app = setup.appStudents.find(student => student.id === match.studentId);
      if (!source || !app) this.validator.refuse('invalidStudentDecision', 422);
      await this.students.update(app.id, {
        studentCode: source.studentCode,
        ...(source.dateOfBirth && source.dateOfBirth !== app.dateOfBirth ? { dateOfBirth: source.dateOfBirth } : {}),
        ...(app.arabicName && !sameName(app.arabicName, source.name) ? { arabicName: source.name } : {}),
      }, who);
      await this.enrollments.placeFromSource(app.id, place, who, PLACED_BY_IMPORT);
    }
    for (const addition of data.additions) {
      const source = pending.find(student => student.studentCode === addition.studentCode);
      if (!source || setup.appStudents.some(student => student.studentCode === source.studentCode)) this.validator.refuse('invalidStudentDecision', 422);
      await this.createFromMassar(source, addition.gender, place, actor);
    }

    const resolved = await this.reconcileStudents();
    await this.refreshAssignments();
    await this.addMissingSheets();
    return { resolved };
  }

  @Transaction()
  async mappings(data: MassarMappings) {
    this.writable();
    await this.repository.lock();
    const setup = await this.repository.setup();
    this.validateMappings(data, setup);

    for (const mapping of data.classes) {
      const cls = setup.classes.find(item => item.name === mapping.name);
      if (!cls) this.validator.refuse('notFound', 404);
      await this.repository.saveClass({ ...cls, ...mapping });
    }
    for (const mapping of data.subjects) {
      const level = setup.levels.find(item => item.code === mapping.level);
      const subject = setup.subjects.find(item => item.levelId === level?.id && item.code === mapping.code);
      if (!subject) this.validator.refuse('notFound', 404);
      await this.repository.saveSubject({ ...subject, subjectId: mapping.subjectId });
    }

    await this.reconcileStudents();
    await this.refreshAssignments();
    await this.addMissingSheets();
    return { saved: true };
  }

  @Transaction()
  async refreshStudents() {
    this.writable();
    await this.repository.lock();
    const resolved = await this.reconcileStudents();
    await this.refreshAssignments();
    await this.addMissingSheets();
    return { resolved };
  }

  /** A pending Massar student School now has in the class's place is enrolled, and leaves the class's waiting list. */
  private async reconcileStudents() {
    const setup = await this.repository.setup();
    let resolved = 0;
    const enrollmentClasses = new Map(setup.enrollments.map(row => [row.enrollment.studentId, row.enrollment.massarClassId]));
    for (const cls of setup.classes) {
      const ready = (cls.pendingStudents ?? []).flatMap(source => {
        const student = setup.appStudents.find(app =>
          app.studentCode === source.studentCode && app.classId === cls.classId && app.sectionId === cls.sectionId);
        return student ? [{ source, student }] : [];
      });
      if (!ready.length) continue;

      for (const { source, student } of ready) {
        const previousClass = enrollmentClasses.get(student.id);
        if (previousClass && previousClass !== cls.id) this.validator.refuse('classConflict');
        const old = setup.enrollments.find(row => row.enrollment.studentId === student.id)?.enrollment;
        await this.repository.saveEnrollment(enrollmentRow(student.id, cls.id, source, source.position, old?.leftOn ?? null));
        enrollmentClasses.set(student.id, cls.id);
        resolved++;
      }
      const codes = new Set(ready.map(row => row.source.studentCode));
      await this.repository.saveClass({
        ...cls,
        unmatchedCodes: cls.unmatchedCodes.filter(code => !codes.has(code)),
        pendingStudents: cls.pendingStudents.filter(student => !codes.has(student.studentCode)),
      });
    }
    return resolved;
  }

  // ── Grids: model subjects, sheets and rosters ─────────────────────────────

  private async refreshAssignments() {
    await this.repository.relinkTeachers();
  }

  /**
   * Every Massar level the school has gets the model's subjects that no file
   * brought yet, so each class has all its grids. They stay "to confirm": a
   * file of this year confirms one, and export waits for it.
   */
  private async applyModel() {
    const setup = await this.repository.setup();
    if (!setup.levels.length) return;
    const model = massarModel(await this.repository.previousYearSubjects());
    for (const level of setup.levels) {
      for (const subject of model.get(level.code)?.values() ?? []) {
        const known = setup.subjects.find(item => item.levelId === level.id && item.code === subject.code);
        const subjectId = proposeSubject(setup.appSubjects, subject.code, subject.name)?.id ?? null;
        if (known) {
          // A model subject still unlinked takes the School subject it now matches; a linked one keeps the registrar's choice.
          if (!known.confirmed && !known.subjectId && subjectId) await this.repository.saveSubject({ ...known, subjectId });
          continue;
        }
        await this.repository.addModelSubject({
          levelId: level.id, code: subject.code, name: subject.name, components: subject.components, observedRounds: subject.rounds ?? [], subjectId,
        });
      }
    }
  }

  private async modelHasNewSubjects() {
    const levels = await this.repository.levelSubjectCodes();
    if (!levels.length) return false;
    const model = massarModel(await this.repository.previousYearSubjects());
    return levels.some(level => [...(model.get(level.code)?.keys() ?? [])].some(code => !level.subjects.has(code)));
  }

  /**
   * Brings grids up to date with School: teachers assigned since the sheets were made, students who
   * joined or left a class, and, for the whole year, subjects the default model gained since setup.
   * These are writes made while reading, so they take the year's lock like every other Massar change,
   * but never wait for it: while an import or a round change holds it, this returns false and the
   * next read does the refresh.
   */
  @Transaction()
  private async refreshGrids(only?: { sheetId: string; massarClassId: string }) {
    if (!await this.repository.tryLock()) return false;
    if (only) {
      await this.repository.relinkTeachers(only.sheetId);
      await this.syncRosters(only.massarClassId);
      return true;
    }
    if (await this.modelHasNewSubjects()) await this.addMissingSheets();
    await this.repository.relinkTeachers();
    await this.syncRosters();
    return true;
  }

  /** A file of this year confirmed a model subject: its open grids take Massar's exact parts (the check counted any mark this drops). */
  private async confirmSheets(subject: Setup['subjects'][number], kind: string) {
    for (const sheet of await this.repository.subjectOpenSheets(subject.id)) {
      const components = sheetComponents(kind, roundComponents(subject, sheet), sheet);
      if (JSON.stringify(components) !== JSON.stringify(sheet.components)) await this.repository.replaceSheetComponents(sheet.id, components);
    }
  }

  private async addMissingSheets() {
    await this.applyModel();
    const setup = await this.repository.setup();
    const controls = massarPlanningControls(await this.repository.planningMonths());

    for (const round of await this.repository.allRoundsForManagement()) {
      if (round.status === 'closed') continue;
      for (const cls of setup.classes) {
        if (cls.unmatchedCodes.length) continue;
        const level = setup.levels.find(item => item.id === cls.levelId)!;
        // A class has a Contrôle's sheet when Planning gives it exams in that Contrôle.
        const plannedForClass = controls.find(control => sameRound(control, round))?.classIds.includes(cls.classId ?? '');
        if (round.exam < 4 && !plannedForClass) continue;

        for (const subject of setup.subjects.filter(item => item.levelId === level.id)) {
          // Later collège tests and the integrated activities exist only where a file showed them.
          const needsObservedRound = (level.kind === 'exam' && round.exam > 1) || round.exam === 4;
          if (needsObservedRound && !subject.observedRounds.some(observed => sameRound(observed, round))) continue;
          const assignments = setup.assignments.filter(({ assignment }) =>
            assignment.classId === cls.classId && assignment.sectionId === cls.sectionId && assignment.subjectId === subject.subjectId);
          await this.repository.createSheet({
            roundId: round.id,
            massarClassId: cls.id,
            massarSubjectId: subject.id,
            teacherAssignmentId: assignments.length === 1 ? assignments[0].assignment.id : null,
            roster: await this.repository.activeRoster(cls.id),
            components: sheetComponents(level.kind, roundComponents(subject, round), round),
          });
        }
      }
    }
    await this.syncRosters();
    // New grids meet their exams: marks on either side come together.
    await this.grades?.reconcile(null);
  }

  /**
   * Every grid lists its class as it is now, not as it was when the grid was
   * made: a student an import or a linked pending student brings in is added,
   * one withdrawn in Students is dropped. Marks stay with the student and come
   * back if they return. A sent grid whose list changed must be sent again.
   */
  private async syncRosters(classId?: string) {
    const [sheets, rosters] = await Promise.all([this.repository.sheetRosters(classId), this.repository.activeRosters(classId)]);
    for (const sheet of sheets) {
      const roster = rosters.get(sheet.massarClassId) ?? [];
      if (rosterKey(roster) === rosterKey(sheet.roster)) continue;
      await this.repository.replaceSheetRoster(sheet.id, roster, sheet.status === 'exported' ? 'changed_after_export' : undefined);
    }
  }

  // ── Rounds (Contrôles) ────────────────────────────────────────────────────

  async rounds(actor: MassarActor) {
    return mayManageMassar(actor) ? this.repository.allRoundsForManagement() : this.repository.rounds();
  }

  async blockedClasses(roundId: string) {
    await this.requireManagedRound(roundId);
    const setup = await this.repository.setup();
    return setup.classes
      .filter(cls => cls.unmatchedCodes.length)
      .map(cls => ({ className: cls.name, unmatchedCount: cls.unmatchedCodes.length }));
  }

  @Transaction()
  async createRound(data: MassarRoundInput, actor: MassarActor) {
    this.writable();
    await this.repository.lock();
    await this.reconcileStudents();
    const setup = await this.repository.setup();
    if (!setup.year || !setup.classes.length || !setup.subjects.length) this.validator.refuse('setupRequired');

    // A confirmed subject must have shown this round in a file; one still to confirm simply gets no grid for it.
    const unverified = setup.subjects.some(subject => {
      if (!subject.confirmed) return false;
      const level = setup.levels.find(item => item.id === subject.levelId)!;
      const needsObservedRound = data.exam === 4 || (level.kind === 'exam' && data.exam > 1);
      return needsObservedRound && !subject.observedRounds.some(round => sameRound(round, data));
    });
    if (unverified) this.validator.refuse('unverifiedRound');

    // An ordinary Contrôle exists once Planning has its exams.
    if (data.exam < 4) {
      const controls = massarPlanningControls(await this.repository.planningMonths());
      if (!controls.some(control => sameRound(control, data))) this.validator.refuse('notPlanned', 422);
    }

    const { labelsUnseen, ...labels } = resolveRoundLabels(setup.subjects, data.term, data.exam);
    if (!labels.termLabel || !labels.examLabel) this.validator.refuse('unverifiedRound');
    this.ensureDueDate(data.dueDate ?? null);

    const round = await this.repository.createRound({ term: data.term, exam: data.exam, dueDate: data.dueDate ?? null, ...labels, createdBy: actor.id });
    if (!round) this.validator.refuse('roundExists');
    await this.addMissingSheets();
    return { ...round, labelsUnseen };
  }

  /**
   * The school's Contrôles of the year. A plan never drops a Contrôle already
   * opened; dates are the default due date offered when one is opened.
   */
  @Transaction()
  async savePlan(data: MassarPlanInput) {
    this.writable();
    await this.repository.lock();
    if (!await this.repository.yearConfig()) this.validator.refuse('setupRequired');

    // The Contrôles come from Planning; the plan keeps only their due dates.
    const controls = massarPlanningControls(await this.repository.planningMonths());
    const keys = data.dates.map(date => `${date.term}:${date.exam}`);
    const unplanned = data.dates.some(date => !controls.some(control => sameRound(control, date)));
    if (new Set(keys).size !== keys.length || unplanned) this.validator.refuse('invalidPlan', 422);
    for (const date of data.dates) this.ensureDueDate(date.dueDate);

    await this.repository.savePlan({
      primary: data.primary,
      college: data.college,
      dates: data.dates.flatMap(date => date.dueDate ? [{ term: date.term, exam: date.exam, dueDate: date.dueDate }] : []),
    });
    return { saved: true };
  }

  /** How each student's statement prints this year: the order and coefficients of its subjects, and what it adds. */
  @Transaction()
  async saveStatement(data: MassarStatementInput) {
    this.writable();
    await this.repository.lock();
    if (!await this.repository.yearConfig()) this.validator.refuse('setupRequired');
    await this.repository.saveStatement(normalizeStatement(data));
    return { saved: true };
  }

  @Transaction()
  async changeDueDate(id: string, dueDate: string | null) {
    this.writable();
    await this.repository.lock();
    this.ensureDueDate(dueDate);
    await this.requireManagedRound(id);
    await this.repository.updateDueDate(id, dueDate);
    return { saved: true };
  }

  @Transaction()
  async closeRound(id: string) {
    this.writable();
    await this.repository.lock();
    await this.requireManagedRound(id);
    await this.repository.updateRound(id, 'closed');
    return { closed: true };
  }

  @Transaction()
  async reopenRound(id: string) {
    this.writable();
    await this.repository.lock();
    await this.requireManagedRound(id);
    await this.repository.updateRound(id, 'open');
    await this.addMissingSheets();
    return { reopened: true };
  }

  // ── Sheets: reading ───────────────────────────────────────────────────────

  async sheets(roundId?: string) {
    // The list is polled every few seconds by every open Massar page: the full pass over every grid of the
    // year runs at most once a minute per year, so the database is free for the sheets being opened.
    const last = FULL_REFRESH.get(this.year.id) ?? 0;
    if (this.year.status !== 'closed' && Date.now() - last >= FULL_REFRESH_MS) {
      // Claimed before it runs, so reads arriving meanwhile do not start their own.
      FULL_REFRESH.set(this.year.id, Date.now());
      if (!await this.refreshGrids()) FULL_REFRESH.set(this.year.id, last);
    }
    return this.sheetSummaries(roundId);
  }

  /** Each sheet's progress, as stored: no refresh. */
  private async sheetSummaries(roundId?: string) {
    const [rows, counts] = await Promise.all([this.repository.sheets(roundId), this.repository.completedMarkCounts(roundId)]);
    const completed = new Map(counts.map(row => [row.sheetId, row.completed]));
    return rows.map(row => summarizeSheet(row, completed.get(row.sheet.id) ?? 0));
  }

  async sheet(id: string, actor: MassarActor, entry: MassarEntry = 'massar'): Promise<MassarSheetDetail> {
    // Only this grid is brought up to date (its teacher, its class's students): it is read on every subject
    // tab and polled while open, and re-checking every grid of the year each time made opening one slow.
    // The sheet list still brings every grid up to date.
    const yearOpen = this.year.status !== 'closed';
    if (yearOpen) {
      const before = await this.requireSheet(id);
      await this.refreshGrids({ sheetId: id, massarClassId: before.sheet.massarClassId });
    }

    const [row, stored, config] = await Promise.all([this.requireSheet(id), this.repository.marks(id), this.repository.yearConfig()]);
    const marks = numericMarks(stored);
    const manager = mayManageMassar(actor);
    const { status, teacherUnlocked } = row.sheet;
    const roundOpen = yearOpen && row.round.status !== 'closed';
    const unlocked = status !== 'exported' && (status !== 'changed_after_export' || teacherUnlocked);

    return {
      sheet: summarizeSheet(row, marks),
      round: row.round,
      components: row.sheet.components,
      maxMark: row.level.maxMark,
      students: row.sheet.roster,
      marks,
      schoolName: config?.schoolName ?? '',
      levelLabel: row.level.label,
      yearLabel: this.year.label,
      // Notes asks its own permission: a teacher grades there without any of Massar's.
      canEdit: roundOpen && unlocked && (entry === 'notes' ? matchPermission(actor.permissions ?? [], 'update:grades') : manager || actor.role === 'teacher'),
      canReopen: roundOpen && manager && status === 'exported',
    };
  }

  /** Each part of every grid, as an exam School's Grades can show and link to. */
  async gradeSources(): Promise<MassarGradeSource[]> {
    const rows = await this.repository.sheets();
    const links = await this.grades?.examLinks(rows.map(row => row.sheet.id)) ?? [];
    const cellKey = (sheetId: string, componentCode: string) => JSON.stringify([sheetId, componentCode]);
    const linked = new Map(links.map(cell => [cellKey(cell.sheet.id, cell.componentCode), cell.exam.id]));

    return rows.flatMap(({ sheet, cls, subject, level, round, teacherId }) => {
      const { classId, sectionId } = cls, subjectId = subject.subjectId;
      if (!classId || !sectionId || !subjectId) return [];
      return sheet.components.map(component => ({
        id: `massar:${sheet.id}:${encodeURIComponent(component.code)}`,
        sheetId: sheet.id,
        componentCode: component.code,
        title: component.name.trim(),
        classId,
        sectionId,
        subjectId,
        teacherId,
        totalMarks: Number(level.maxMark),
        term: round.term,
        exam: round.exam,
        termLabel: round.termLabel,
        examLabel: round.examLabel,
        linkedExamId: linked.get(cellKey(sheet.id, component.code)) ?? null,
      }));
    });
  }

  async progressCsv(roundId: string) {
    const rows = await this.sheetSummaries(roundId);
    const header = ['class', 'subject', 'teacher', 'status', 'missing', 'total'];
    const lines = [header, ...rows.map(row => [row.className, row.subjectName, row.teacherName, row.status, row.missing, row.total])];
    return strToU8('﻿' + lines.map(line => line.map(csvCell).join(',')).join('\r\n'));
  }

  // ── Sheets: marks and workflow ────────────────────────────────────────────

  @Transaction()
  async saveMarks(id: string, data: MassarMarksInput, actor: MassarActor, entry: MassarEntry = 'massar') {
    await this.repository.lock();
    const row = await this.ownedOpenSheet(id, data.revision, actor, entry);
    this.validator.ensureMarks(data, row.sheet.roster, row.sheet.components, row.level.maxMark);
    await this.repository.saveMarks(id, data.marks, actor.id);
    await this.grades?.fromMassar(id, data.marks, actor.id);
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'in_progress' });
  }

  @Transaction()
  async submit(id: string, revision: number, actor: MassarActor) {
    await this.repository.lock();
    const row = await this.ownedOpenSheet(id, revision, actor);
    if (summarizeSheet(row, numericMarks(await this.repository.marks(id))).missing) this.validator.refuse('missingMarks');
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'submitted', teacherUnlocked: false });
  }

  @Transaction()
  async reopen(id: string, revision: number) {
    this.writable();
    await this.repository.lock();
    const row = await this.requireSheet(id);
    if (row.sheet.revision !== revision) this.validator.refuse('staleSheet');
    if (row.round.status === 'closed') this.validator.refuse('locked');
    // Clearing the export lock is explicit; the prior export hash/time remain.
    await this.repository.updateRound(row.round.id, 'open');
    return this.repository.updateSheet(id, { status: row.sheet.exportedAt ? 'changed_after_export' : 'in_progress', teacherUnlocked: true });
  }

  // ── Export ────────────────────────────────────────────────────────────────

  async downloadEmpty(id: string) {
    const row = await this.requireSheet(id);
    const config = await this.repository.yearConfig();
    if (!config) this.validator.refuse('setupRequired');
    if (!row.subject.confirmed) this.validator.refuse('subjectUnconfirmed');
    const template = await this.storage.get(NAMESPACE, config.templateFileId);
    if (!template) this.validator.refuse('noCleanTemplate');
    return { ...await this.workbook(row, true, template, config), name: exportName(row) };
  }

  @Transaction()
  async exportSheets(ids: string[], empty: boolean) {
    return (await this.buildExport(ids, empty)).bytes;
  }

  @Transaction()
  async downloadRound(id: string) {
    this.writable();
    await this.repository.lock();
    const all = await this.repository.sheets(id);
    if (!all.length || all.length > MAX_ROUND_SHEETS) this.validator.refuse('invalidSelection', 422);
    // A grid whose subject a Massar file of this year has not confirmed stays out of the download.
    const sheets = all.filter(row => row.subject.confirmed);
    if (!sheets.length) this.validator.refuse('subjectUnconfirmed');

    // The whole Contrôle is what goes to Massar: downloading it locks exactly the marks it carries, in the same transaction.
    const result = await this.buildExport(sheets.map(row => row.sheet.id), false);
    const exportedAt = new Date().toISOString();
    for (const [index, row] of result.rows.entries()) {
      await this.repository.updateSheet(row.sheet.id, { status: 'exported', teacherUnlocked: false, exportedAt, exportHash: result.digests[index] });
    }
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
    if (names.length === 1) return { bytes: files[names[0]], name: names[0], type: MASSAR_MIME };
    return { bytes, name: `export_notesCC_${rows[0].cls.name.replace(/[^\w-]/g, '_')}.zip`, type: 'application/zip' };
  }

  /** Every sheet as a Massar file, all of one round. `check` allows subjects still to confirm (nothing is sent). */
  private async buildExport(ids: string[], empty: boolean, check = false) {
    // Massar accepted School's filled files on 2026-11-08: sending is no longer held back by a first import test.
    this.writable();
    await this.repository.lock();
    const config = await this.repository.yearConfig();
    if (!config) this.validator.refuse('setupRequired');
    const template = await this.storage.get(NAMESPACE, config.templateFileId);
    if (!template) this.validator.refuse('noCleanTemplate');
    if (new Set(ids).size !== ids.length) this.validator.refuse('invalidSelection', 422);

    const files: Record<string, Uint8Array> = {}, exported: Sheet[] = [], digests: string[] = [];
    for (const id of ids) {
      const row = await this.requireSheet(id);
      if (exported.length && exported[0].round.id !== row.round.id) this.validator.refuse('invalidSelection', 422);
      if (row.round.status === 'closed') this.validator.refuse('locked');
      // Sending waits for this year's file to confirm a subject; a check exports it with last year's spelling.
      if (!row.subject.confirmed && !check) this.validator.refuse('subjectUnconfirmed');
      const result = await this.workbook(row, empty, template, config);
      const name = exportName(row);
      if (files[name]) this.validator.refuse('invalidSelection', 422);
      files[name] = result.bytes;
      exported.push(row);
      digests.push(result.digest);
    }
    return { bytes: zipSync(files), files, rows: exported, digests };
  }

  /** One sheet written into the school's Massar template, with a digest of exactly the marks it carries. */
  private async workbook(row: Sheet, empty: boolean, template: Uint8Array, config: YearConfig) {
    const [storedMarks, hiddenIds] = await Promise.all([this.repository.marks(row.sheet.id), this.repository.hiddenIds(row.sheet.id)]);
    const marks = numericMarks(storedMarks);
    const observed = row.subject.observedRounds.find(round => sameRound(round, row.round));
    const hiddenIdOf = (studentId: string) => hiddenIds.find(enrollment => enrollment.studentId === studentId)?.massarStudentId;

    const data: MassarExport = {
      schoolCode: config.schoolCode,
      classGuid: row.cls.guid,
      yearId: config.massarYearId,
      academy: config.academy,
      direction: config.direction,
      schoolName: config.schoolName,
      levelCode: row.level.levelCodeNumeric ? Number(row.level.levelCode) : row.level.levelCode,
      level: row.level.code,
      levelLabel: row.level.label,
      className: row.cls.name,
      term: row.round.term,
      exam: row.round.exam,
      termLabel: observed?.termLabel ?? row.round.termLabel,
      examLabel: observed?.examLabel ?? row.round.examLabel,
      yearLabel: this.year.label.replace('-', '/'),
      subjectCode: row.subject.code,
      subjectName: row.subject.name,
      kind: row.level.kind,
      maxMark: row.level.maxMark,
      components: row.sheet.components,
      clean: false,
      students: row.sheet.roster.map(student => ({
        ...student,
        massarStudentId: student.massarStudentId || hiddenIdOf(student.id) || null,
        marks: marks.filter(mark => mark.studentId === student.id),
      })),
    };
    if (!empty && data.students.some(student => !student.massarStudentId)) this.validator.refuse('missingHiddenId');

    const bytes = await writeSheet(template, data, empty);
    const sortedMarks = [...marks].sort((a, b) => `${a.studentId}:${a.componentCode}`.localeCompare(`${b.studentId}:${b.componentCode}`));
    return { bytes, digest: hash(sortedMarks) };
  }
}
