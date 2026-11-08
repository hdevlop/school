import { examPlanningMonths, planningDuration, resolveExamPlanningClasses, type ExamPlanningEntry, type ExamPlanningJson } from '@sms/contracts';
import { Err, I18n, Service, Transaction } from '../../najm';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { ExamPlanningRepository } from './ExamPlanningRepository';
import type { SaveExamPlanningDto } from './ExamPlanningDto';
import { SubjectRepository } from '../subjects/SubjectRepository';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { resolveSubject, suggestSubject } from './planningSubjects';

/** Collège is marked out of 20, primary out of 10, as Massar does. */
const outOf = (cls: { level: string | null; cycle: string | null }) => /coll|إعداد|secondaire|middle/i.test(`${cls.level ?? ''} ${cls.cycle ?? ''}`) ? 20 : 10;

@Service()
export class ExamPlanningService {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n() private t!: (key: string) => string;
  constructor(private repository: ExamPlanningRepository, private subjectRepository: SubjectRepository, private subjectValidator: SubjectValidator) {}

  async getAll() {
    return (await this.repository.getAll()).map(row => ({ ...row, visible: row.visible ?? true, months: row.months ?? {} }));
  }

  @Transaction()
  async saveMonth(classId: string, data: SaveExamPlanningDto) {
    const classes = await this.getAll();
    if (!classes.some(row => row.id === classId)) Err(404, this.t('classes.errors.notFound'));
    if (!examPlanningMonths(this.year.label).includes(data.month)) Err(400, this.t('validation.theDateMustFallInsideThisSchoolYear'));
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
   */
  async subjectOptions() {
    const classes = await this.getAll();
    const subjects = await this.subjectRepository.getAll();
    const parts = subjects.flatMap(subject => subject.subSubjects.map(part => ({ subjectId: subject.id, name: part.name })));
    const names = [...new Set(classes.flatMap(cls => Object.values(cls.months).flat().map(entry => entry.subject.trim())).filter(Boolean))].sort((x, y) => x.localeCompare(y));
    const missing = names.filter(name => !resolveSubject(name, parts, subjects)).map(name => ({ name, suggestedSubjectId: suggestSubject(name, subjects) }));
    return { subjects: subjects.map(({ id, name, subSubjects }) => ({ id, name, subSubjects })), missing };
  }

  /** Adds Planning's missing names to Subjects as sub-subjects; their exams follow. */
  @Transaction()
  async addSubSubjects(items: Array<{ name: string; subjectId: string }>) {
    const subjects = await this.subjectRepository.getAll();
    for (const subjectId of new Set(items.map(item => item.subjectId))) {
      const subject = subjects.find(row => row.id === subjectId);
      if (!subject) Err(404, this.t('subjects.errors.notFound'));
      await this.subjectValidator.ensureNamesFree(subject.id, subject.name, [...subject.subSubjects.map(part => part.name), ...items.filter(item => item.subjectId === subjectId).map(item => item.name)]);
    }
    await this.subjectRepository.addSubSubjects(items);
    await this.syncOpenYears();
    return this.subjectOptions();
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
