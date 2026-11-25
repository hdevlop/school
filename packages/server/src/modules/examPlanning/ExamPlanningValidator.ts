import { changedPlanningEntries, examControlProblem, resolvePlanningSubject, type ExamControl, type ExamControlInput, type ExamPlanningEntry } from '@sms/contracts';
import { Err, I18n, Service } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import { SubjectRepository } from '../subjects/SubjectRepository';
import { ExamPlanningRepository } from './ExamPlanningRepository';

export type PlanningActor = { id: string; role?: string | null };

/** Which subjects an account may plan in each class; null is every subject of every class. */
export type PlannableSubjects = Record<string, string[]> | null;

@Service()
export class ExamPlanningValidator {
  @I18n('examPlanning.errors') private et!: (key: string) => string;

  constructor(private repository: ExamPlanningRepository, private subjectRepository: SubjectRepository) {}

  /**
   * The school-wide roles plan every class, a supervisor every subject of the
   * classes they supervise, a teacher the subjects they teach in their own
   * classes, and any other role (a monitor granted `update:exam-planning`) nothing.
   */
  async plannableSubjects(actor: PlanningActor, classIds: string[]): Promise<PlannableSubjects> {
    if (SCHOOL_WIDE_ROLES.includes(actor.role ?? '')) return null;
    const plannable: Record<string, string[]> = Object.fromEntries(classIds.map(id => [id, []]));
    if (actor.role === 'supervisor') {
      const supervised = await this.repository.supervisedClassIds(actor.id, classIds);
      if (!supervised.length) return plannable;
      const every = (await this.subjectRepository.getAll()).map(subject => subject.id);
      for (const classId of supervised) plannable[classId] = every;
      return plannable;
    }
    if (actor.role !== 'teacher') return plannable;
    for (const row of await this.repository.taughtSubjects(actor.id, classIds)) {
      if (row.classId && row.subjectId && !plannable[row.classId]?.includes(row.subjectId)) plannable[row.classId]?.push(row.subjectId);
    }
    return plannable;
  }

  /**
   * A teacher's save may add, edit or remove only entries of a subject they
   * teach in the class: an entry moved to or from another subject is both.
   * Another teacher's or the school's entries must come back as they were.
   *
   * The school sets when exams take place: a teacher keeps each entry's day,
   * time and `toPlace`, and a new entry takes the first day of a Contrôle the
   * class sits in its subject (`firstDays`) with no time, marked `toPlace`
   * until the school gives it its day. A class with no Contrôle in the subject
   * is not open to a teacher.
   * A supervisor plans the classes they supervise as the school does.
   */
  async ensureMayChange(actor: PlanningActor, classId: string, before: readonly ExamPlanningEntry[], after: readonly ExamPlanningEntry[],
    firstDays: (subjectId: string | null) => ReadonlySet<string> = () => new Set()) {
    if (SCHOOL_WIDE_ROLES.includes(actor.role ?? '')) return;
    if (actor.role === 'supervisor') {
      if (!(await this.repository.supervisedClassIds(actor.id, [classId])).length) Err(403, this.et('notYourClass'));
      return;
    }
    const plannable = await this.plannableSubjects(actor, [classId]);
    if (!plannable) return;
    if (actor.role !== 'teacher') Err(403, this.et('notAllowed'));
    const changed = changedPlanningEntries(before, after);
    if (!changed.length) return;
    const allowed = new Set(plannable[classId] ?? []);
    // Every list counts: the school's and each level's.
    const { subjects, subSubjects: parts } = await this.subjectRepository.allNames();
    const subjectOf = (entry: ExamPlanningEntry) => resolvePlanningSubject(entry.subject.trim(), parts, subjects) ?? null;
    if (changed.some(entry => { const subjectId = subjectOf(entry); return !subjectId || !allowed.has(subjectId); })) {
      Err(403, this.et('notYourSubject'));
    }
    const previous = new Map(before.map(entry => [entry.id, entry]));
    for (const entry of after) {
      const was = previous.get(entry.id);
      if (was) {
        if (was.date !== entry.date || (was.startTime ?? null) !== (entry.startTime ?? null) || (was.endTime ?? null) !== (entry.endTime ?? null)
          || !!was.toPlace !== !!entry.toPlace) Err(403, this.et('scheduleBySchool'));
      } else {
        const days = firstDays(subjectOf(entry));
        if (!days.size) Err(403, this.et('controlNotOpen'));
        if (!days.has(entry.date) || entry.startTime || entry.endTime || !entry.toPlace) Err(403, this.et('scheduleBySchool'));
      }
    }
  }

  /**
   * Who opens and changes a Contrôle: the school-wide roles for any class, a
   * supervisor only for classes they all supervise (before and after a change),
   * no other role whatever it is granted.
   */
  async ensureMayManageControl(actor: PlanningActor, ...classLists: ReadonlyArray<readonly string[]>) {
    if (SCHOOL_WIDE_ROLES.includes(actor.role ?? '')) return;
    if (actor.role !== 'supervisor') Err(403, this.et('notAllowed'));
    const classIds = [...new Set(classLists.flat())];
    const supervised = new Set(await this.repository.supervisedClassIds(actor.id, classIds));
    if (classIds.some(id => !supervised.has(id))) Err(403, this.et('controls.notYourClasses'));
  }

  /** A Contrôle's classes and subjects exist; its days lie in one semester of the year; a class sits one Contrôle of a subject a day. */
  ensureControlValid(candidate: ExamControlInput, others: readonly ExamControl[], academicYear: string, yearClassIds: readonly string[], subjectIds: readonly string[]) {
    if (candidate.classIds.some(id => !yearClassIds.includes(id))) Err(404, this.et('controls.unknownClass'));
    if (candidate.subjectIds.some(id => !subjectIds.includes(id))) Err(404, this.et('controls.unknownSubject'));
    const problem = examControlProblem(candidate, others, academicYear);
    if (problem) Err(problem === 'overlap' ? 409 : 400, this.et(`controls.${problem}`));
  }
}
