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
   * The school plans each exam: its subject, day and time, added and removed
   * by the school-wide roles and by a supervisor in the classes they
   * supervise. A teacher writes the lessons of their own subjects' exams and
   * nothing else: an exam added, removed, moved to another subject or day, or
   * placed, is refused (`lessonsOnly`). Another subject's exams must come back
   * as they were (`notYourSubject`).
   */
  async ensureMayChange(actor: PlanningActor, classId: string, before: readonly ExamPlanningEntry[], after: readonly ExamPlanningEntry[]) {
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
    const kept = new Set(after.map(entry => entry.id));
    // The same exam, its lessons aside: subject, day, time and whether it is placed.
    const sameExam = (was: ExamPlanningEntry, entry: ExamPlanningEntry) => was.subject.trim() === entry.subject.trim() && was.date === entry.date
      && (was.startTime ?? null) === (entry.startTime ?? null) && (was.endTime ?? null) === (entry.endTime ?? null) && !!was.toPlace === !!entry.toPlace;
    if (before.some(entry => !kept.has(entry.id)) || after.some(entry => { const was = previous.get(entry.id); return !was || !sameExam(was, entry); })) {
      Err(403, this.et('lessonsOnly'));
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
