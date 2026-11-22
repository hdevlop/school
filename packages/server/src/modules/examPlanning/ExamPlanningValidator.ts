import { changedPlanningEntries, resolvePlanningSubject, type ExamPlanningEntry } from '@sms/contracts';
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
   * The school-wide roles plan every class, a teacher the subjects they
   * teach in their own classes, and any other role (a monitor or supervisor
   * granted `update:exam-planning`) nothing.
   */
  async plannableSubjects(actor: PlanningActor, classIds: string[]): Promise<PlannableSubjects> {
    if (SCHOOL_WIDE_ROLES.includes(actor.role ?? '')) return null;
    const plannable: Record<string, string[]> = Object.fromEntries(classIds.map(id => [id, []]));
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
   */
  async ensureMayChange(actor: PlanningActor, classId: string, before: readonly ExamPlanningEntry[], after: readonly ExamPlanningEntry[]) {
    const plannable = await this.plannableSubjects(actor, [classId]);
    if (!plannable) return;
    if (actor.role !== 'teacher') Err(403, this.et('notAllowed'));
    const changed = changedPlanningEntries(before, after);
    if (!changed.length) return;
    const allowed = new Set(plannable[classId] ?? []);
    const subjects = await this.subjectRepository.getAll();
    const parts = subjects.flatMap(subject => subject.subSubjects.map(part => ({ subjectId: subject.id, name: part.name })));
    if (changed.some(entry => { const subjectId = resolvePlanningSubject(entry.subject.trim(), parts, subjects); return !subjectId || !allowed.has(subjectId); })) {
      Err(403, this.et('notYourSubject'));
    }
  }
}
