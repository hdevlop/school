import { derivedExamControls, examControlTerm, monthEndOf, examPlanningMonths, planningDuration, resolveExamPlanningClasses, yearExamControls, type ExamControl, type ExamControlInput, type ExamPlanningEntry, type ExamPlanningJson } from '@sms/contracts';
import { Err, I18n, Service, Transaction } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { ExamPlanningRepository } from './ExamPlanningRepository';
import type { SaveExamPlanningDto } from './ExamPlanningDto';
import { SubjectRepository } from '../subjects/SubjectRepository';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { resolveSubject, suggestSubject } from './planningSubjects';
import { ExamPlanningValidator, type PlanningActor } from './ExamPlanningValidator';

/** Collège is marked out of 20, primary out of 10, as Massar does. */
const outOf = (cls: { level: string | null; cycle: string | null }) => /coll|إعداد|secondaire|middle/i.test(`${cls.level ?? ''} ${cls.cycle ?? ''}`) ? 20 : 10;

@Service()
export class ExamPlanningService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n() private t!: (key: string) => string;
  constructor(private repository: ExamPlanningRepository, private subjectRepository: SubjectRepository, private subjectValidator: SubjectValidator, private validator: ExamPlanningValidator) {}

  async getAll() {
    return (await this.repository.getAll()).map(row => ({ ...row, visible: row.visible ?? true, months: row.months ?? {} }));
  }

  @Transaction()
  async saveMonth(classId: string, data: SaveExamPlanningDto, actor: PlanningActor) {
    const classes = await this.getAll();
    const target = classes.find(row => row.id === classId);
    if (!target) Err(404, this.t('classes.errors.notFound'));
    if (!examPlanningMonths(this.year.label).includes(data.month)) Err(400, this.t('validation.theDateMustFallInsideThisSchoolYear'));
    // A teacher writes only the lessons of their subjects' exams; the school plans the exams themselves.
    await this.validator.ensureMayChange(actor, classId, target.months[data.month] ?? [], data.entries);
    await this.repository.saveMonth(classId, data);
    await this.syncExams([classId]);
    return this.getAll();
  }

  @Transaction()
  async saveVisibility(classIds: string[]) {
    const classes = await this.getAll();
    if (classIds.some(id => !classes.some(row => row.id === id))) Err(404, this.t('classes.errors.notFound'));
    await this.repository.saveVisibility(classes.map(row => row.id), classIds);
    await this.syncExams();
    return this.getAll();
  }

  @Transaction()
  async importDocument(document: ExamPlanningJson) {
    if (document.schoolYear !== this.year.label) Err(400, this.t('examPlanning.json.wrongYear'));
    const classes = await this.getAll();
    const resolved = resolveExamPlanningClasses(document, classes);
    if (resolved.success === false) {
      if (resolved.error === 'unknownClasses') Err(404, this.t('examPlanning.json.unknownClasses'));
      Err(409, this.t('examPlanning.json.ambiguousClasses'));
    }
    await this.repository.importDocument(resolved.classes);
    await this.syncExams();
    return this.getAll();
  }

  @Transaction()
  async clearContent() {
    const classes = await this.getAll();
    await this.repository.clearContent(classes.map(cls => cls.id));
    await this.syncExams();
    return this.getAll();
  }

  /**
   * What Planning picks from: every subject with its sub-subjects. And the
   * names this year's Planning uses that are in neither (typed before
   * sub-subjects existed, or imported): they have no exam until added.
   * `plannable` is what this account may plan in each class: null for the
   * school-wide roles, a teacher's own subjects otherwise.
   */
  async subjectOptions(actor: PlanningActor) {
    const classes = await this.getAll();
    const plannable = await this.validator.plannableSubjects(actor, classes.map(cls => cls.id));
    const subjects = await this.subjectRepository.getAll();
    // A name of any list (the school's or a level's) finds its subject.
    const { subSubjects: parts } = await this.subjectRepository.allNames();
    const names = [...new Set(classes.flatMap(cls => Object.values(cls.months).flat().map(entry => entry.subject.trim())).filter(Boolean))].sort((x, y) => x.localeCompare(y));
    const missing = names.filter(name => !resolveSubject(name, parts, subjects)).map(name => ({ name, suggestedSubjectId: suggestSubject(name, subjects) }));
    // Each subject's school list, and each level's own list (a class name: CE2, 3APG).
    const levels = await this.subjectRepository.levelLists();
    return { subjects: subjects.map(({ id, name, nameAr, subSubjects }) => ({ id, name, nameAr, subSubjects })), levels, missing, plannable };
  }

  /** The year's Contrôles: the saved ones, or Planning's months until one is saved. */
  async controls(): Promise<ExamControl[]> {
    const stored = await this.repository.storedControls();
    if (stored.length) return yearExamControls(stored, []);
    return yearExamControls([], (await this.repository.yearPlans()).map(plan => ({ classId: plan.classId, months: plan.months ?? {} })));
  }

  /**
   * The saved Contrôles, saving Planning's months as Contrôles first when the
   * year has none, so the first Contrôle opened keeps the ones before it.
   */
  private async savedControls() {
    const stored = await this.repository.storedControls();
    if (stored.length) return stored;
    const derived = derivedExamControls((await this.repository.yearPlans()).map(plan => ({ classId: plan.classId, months: plan.months ?? {} })));
    // Saved, a month's Contrôle keeps its first day and runs to the month's end: an exam moved later that month stays linked.
    await this.repository.insertControls(derived.map(({ term, dateFrom, dateTo, classIds }) => ({ term, dateFrom, dateTo: monthEndOf(dateTo), classIds, subjectIds: [], createdBy: null })));
    return this.repository.storedControls();
  }

  @Transaction()
  async createControl(input: ExamControlInput, actor: PlanningActor) {
    await this.validator.ensureMayManageControl(actor, input.classIds);
    const others = await this.savedControls();
    this.validator.ensureControlValid(input, others, this.year.label, await this.repository.yearClassIds(), await this.subjectIds());
    await this.repository.insertControls([{ ...input, term: examControlTerm(input.dateFrom), createdBy: actor.id }]);
    return this.controls();
  }

  /** Several Contrôles at once, all or none: each is checked against the year's and the ones before it. */
  @Transaction()
  async createControls(inputs: ExamControlInput[], actor: PlanningActor) {
    await this.validator.ensureMayManageControl(actor, inputs.flatMap(input => input.classIds));
    const others = await this.savedControls();
    const [classIds, subjectIds] = [await this.repository.yearClassIds(), await this.subjectIds()];
    const opened: ExamControl[] = [];
    for (const [index, input] of inputs.entries()) {
      this.validator.ensureControlValid(input, [...others, ...opened], this.year.label, classIds, subjectIds);
      opened.push({ ...input, id: `new-${index}`, term: examControlTerm(input.dateFrom) });
    }
    await this.repository.insertControls(inputs.map(input => ({ ...input, term: examControlTerm(input.dateFrom), createdBy: actor.id })));
    return this.controls();
  }

  /**
   * A saved Contrôle by id, with the year's saved ones. One read from
   * Planning's months (`derived-…`, while none is saved) is saved first with
   * the others, as opening a Contrôle does, so it is changed or removed like
   * any other: the saved one with its semester, first day and classes.
   */
  private async storedControlFor(id: string) {
    const derived = id.startsWith('derived-') ? (await this.controls()).find(control => control.derived && control.id === id) : undefined;
    const stored = derived ? await this.savedControls() : await this.repository.storedControls();
    const sameClasses = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(classId => b.includes(classId));
    const existing = derived
      ? stored.find(control => control.term === derived.term && control.dateFrom === derived.dateFrom && sameClasses(control.classIds, derived.classIds))
      : stored.find(control => control.id === id);
    if (!existing) Err(404, this.t('examPlanning.errors.controls.notFound'));
    return { stored, existing: existing! };
  }

  @Transaction()
  async updateControl(id: string, input: ExamControlInput, actor: PlanningActor) {
    const { stored, existing } = await this.storedControlFor(id);
    await this.validator.ensureMayManageControl(actor, existing.classIds, input.classIds);
    this.validator.ensureControlValid(input, stored.filter(control => control.id !== existing.id), this.year.label, await this.repository.yearClassIds(), await this.subjectIds());
    await this.repository.updateControl(existing.id, { ...input, term: examControlTerm(input.dateFrom) });
    return this.controls();
  }

  private async subjectIds() {
    return (await this.subjectRepository.getAll()).map(subject => subject.id);
  }

  /** The Contrôle goes; its classes' Planning and exams stay. */
  @Transaction()
  async deleteControl(id: string, actor: PlanningActor) {
    const { existing } = await this.storedControlFor(id);
    await this.validator.ensureMayManageControl(actor, existing.classIds);
    await this.repository.deleteControl(existing.id);
    return this.controls();
  }

  /** Adds Planning's missing names to Subjects as sub-subjects; their exams follow. */
  @Transaction()
  async addSubSubjects(items: Array<{ name: string; subjectId: string }>, actor: PlanningActor) {
    const subjects = await this.subjectRepository.getAll();
    for (const subjectId of new Set(items.map(item => item.subjectId))) {
      const subject = subjects.find(row => row.id === subjectId);
      if (!subject) Err(404, this.t('subjects.errors.notFound'));
      await this.subjectValidator.ensureNamesFree(subject.id, subject.name, [...subject.subSubjects.map(part => part.name), ...items.filter(item => item.subjectId === subjectId).map(item => item.name)], subject.nameAr);
    }
    await this.subjectRepository.addSubSubjects(items);
    await this.syncOpenYears();
    return this.subjectOptions(actor);
  }

  /**
   * Subjects changed (a subject or sub-subject added, renamed or moved):
   * Planning finds them by name, so renamed entries take the new name, and
   * the exams of every year still open follow.
   */
  async followSubjects(renames: Array<{ from: string; to: string }> = []) {
    await this.repository.renameEverywhere(renames);
    await this.syncOpenYears();
  }

  private async syncOpenYears() {
    const plans = await this.repository.openPlans();
    for (const yearId of new Set(plans.map(plan => plan.academicYearId))) {
      await this.syncYear(yearId, plans.filter(plan => plan.academicYearId === yearId).map(plan => ({ id: plan.id, visible: plan.visible ?? true, months: plan.months ?? {} })));
    }
  }

  /**
   * Planning is where exams are planned: every entry of a visible class is an
   * exam on the Exams page, one per section, of the subject its sub-subject
   * belongs to. A section whose subject has no teacher yet gets an empty slot,
   * filled when a teacher is assigned. Planning owns the title, lessons, date,
   * subject and time (from, to); room and marks are the exam's own. An exam whose entry
   * is gone is deleted, or cancelled when it already has marks.
   */
  private async syncExams(classIds?: string[]) {
    await this.syncYear(this.year.id, await this.getAll(), classIds);
  }

  private async syncYear(yearId: string, all: Array<{ id: string; visible: boolean; months: Record<string, ExamPlanningEntry[]> }>, classIds?: string[]) {
    const targets = classIds ? all.filter(cls => classIds.includes(cls.id)) : all;
    const context = await this.repository.syncContext(targets.map(cls => cls.id));
    const wanted = new Map<string, { entryId: string; sectionId: string; assignmentId: string; title: string; description: string | null; date: string; startTime: string | null; endTime: string | null; outOf: number }>();
    for (const cls of targets.filter(cls => cls.visible)) {
      const info = context.classes.find(row => row.id === cls.id), sections = context.sections.filter(section => section.classId === cls.id);
      for (const entry of Object.values(cls.months).flat()) {
        const subjectId = resolveSubject(entry.subject.trim(), context.subSubjects, context.subjects);
        if (!subjectId) continue; // Not in Subjects yet: no exam until it is added.
        for (const section of sections) {
          const candidates = context.assignments.filter(row => row.classId === cls.id && row.sectionId === section.id && row.subjectId === subjectId);
          let assignmentId = (candidates.find(row => row.teacherId) ?? candidates[0])?.id;
          if (!assignmentId) {
            assignmentId = await this.repository.createSlot(cls.id, section.id, subjectId);
            context.assignments.push({ id: assignmentId, classId: cls.id, sectionId: section.id, subjectId, teacherId: null });
          }
          wanted.set(`${entry.id}|${section.id}`, { entryId: entry.id, sectionId: section.id, assignmentId, title: entry.subject.trim(), description: entry.lessons.join('\n') || null, date: entry.date, startTime: entry.startTime ?? null, endTime: entry.endTime ?? null, outOf: info ? outOf(info) : 10 });
        }
      }
    }
    const gone: string[] = [];
    for (const exam of context.planned) {
      const key = `${exam.planningEntryId}|${exam.sectionIds?.[0] ?? ''}`, next = wanted.get(key);
      if (!next) { if (exam.graded) { if (exam.status !== 'cancelled') await this.repository.updateExam(exam.id, { status: 'cancelled' }); } else gone.push(exam.id); continue; }
      wanted.delete(key);
      if (exam.graded) continue; // A marked exam is history: Planning no longer changes it.
      // The database returns "08:30:00"; Planning stores "08:30".
      const startTime = exam.startTime?.slice(0, 5) ?? null, endTime = exam.endTime?.slice(0, 5) ?? null;
      if (exam.title !== next.title || (exam.description ?? null) !== next.description || exam.date !== next.date || exam.teacherAssignmentId !== next.assignmentId
        || startTime !== next.startTime || endTime !== next.endTime)
        await this.repository.updateExam(exam.id, { title: next.title, description: next.description, date: next.date, teacherAssignmentId: next.assignmentId, academicYearId: yearId,
          startTime: next.startTime, endTime: next.endTime, duration: planningDuration(next.startTime, next.endTime) });
    }
    await this.repository.deleteExams(gone);
    for (const next of wanted.values()) await this.repository.insertExam({
      teacherAssignmentId: next.assignmentId, academicYearId: yearId, title: next.title, description: next.description, type: 'test', date: next.date,
      startTime: next.startTime, endTime: next.endTime, duration: planningDuration(next.startTime, next.endTime), totalMarks: String(next.outOf), passingMarks: String(next.outOf / 2), status: 'scheduled', sectionIds: [next.sectionId], planningEntryId: next.entryId,
    });
  }
}
