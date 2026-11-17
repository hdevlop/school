import { COMPETENCY_LIMITS as limits } from '@sms/contracts';
import { Err, I18n, Service } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { CompetencyCatalogRepository } from './CompetencyCatalogRepository';
import { CompetencyEvaluationRepository } from './CompetencyEvaluationRepository';

export type CompetencyActor = { id: string; role?: string | null };

const isSchoolWide = (actor: CompetencyActor) => SCHOOL_WIDE_ROLES.includes(actor.role ?? '');

/** The first day of a `YYYY-MM` month and the first day of the next one. */
export function monthBounds(month: string) {
  const [year, number] = month.split('-').map(Number);
  const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

@Service()
export class CompetencyValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('competencies.errors') private ct!: (key: string, params?: Record<string, unknown>) => string;

  constructor(
    private catalog: CompetencyCatalogRepository,
    private evaluations: CompetencyEvaluationRepository,
  ) {}

  /** The year's first month: the one every later month is compared with. */
  baselineMonth() {
    return this.year.reportingStartsOn.slice(0, 7);
  }

  ensureMonthInYear(month: string) {
    if (month < this.year.reportingStartsOn.slice(0, 7) || month > this.year.reportingEndsOn.slice(0, 7)) {
      Err(400, this.ct('monthOutsideYear'));
    }
  }

  /**
   * Who may change a list or a level once the route's permission let them in:
   * a teacher, in their own classes, and the school-wide roles. A monitor or
   * supervisor reads and writes nothing.
   */
  ensureMayWrite(actor: CompetencyActor) {
    if (actor.role !== 'teacher' && !isSchoolWide(actor)) Err(403, this.ct('writeNotAllowed'));
  }

  /** The assignment a list is built in: a teacher's own, or any for a school-wide role. */
  async ensureWritableAssignment(id: string, actor: CompetencyActor) {
    this.ensureMayWrite(actor);
    const assignment = await this.catalog.findAssignment(id);
    if (!assignment) Err(404, this.ct('assignmentNotFound'));
    if (actor.role === 'teacher' && assignment!.teacherUserId !== actor.id) Err(403, this.ct('notYourAssignment'));
    return assignment!;
  }

  /** The domain as this reader may see it; another teacher's or year's reads as not found. */
  async ensureDomain(id: string) {
    const domain = await this.catalog.findDomain(id);
    if (!domain) Err(404, this.ct('domainNotFound'));
    return domain!;
  }

  async ensureCompetency(id: string) {
    const competency = await this.catalog.findCompetency(id);
    if (!competency) Err(404, this.ct('competencyNotFound'));
    return competency!;
  }

  async ensureDomainRoom(teacherAssignmentId: string) {
    if (await this.catalog.countDomains(teacherAssignmentId) >= limits.domains) {
      Err(409, this.ct('tooManyDomains', { max: limits.domains }));
    }
  }

  async ensureCompetencyRoom(domainId: string) {
    if (await this.catalog.countCompetencies(domainId) >= limits.competencies) {
      Err(409, this.ct('tooManyCompetencies', { max: limits.competencies }));
    }
  }

  async ensureDomainNameFree(teacherAssignmentId: string, name: string, excludeId?: string) {
    if (await this.catalog.domainNameTaken(teacherAssignmentId, name, excludeId)) Err(409, this.ct('duplicateDomain', { name }));
  }

  async ensureCompetencyNameFree(domainId: string, name: string, excludeId?: string) {
    if (await this.catalog.competencyNameTaken(domainId, name, excludeId)) Err(409, this.ct('duplicateCompetency', { name }));
  }

  ensureSameList(fromAssignmentId: string, toAssignmentId: string) {
    if (fromAssignmentId !== toAssignmentId) Err(409, this.ct('otherList'));
  }

  /** A list is copied between two sections of one subject, into one that has none. */
  async ensureCopyable(from: { id: string; subjectId: string }, to: { id: string; subjectId: string }, sourceSize: number) {
    if (from.id === to.id) Err(400, this.ct('sameAssignment'));
    if (from.subjectId !== to.subjectId) Err(409, this.ct('otherSubject'));
    if (!sourceSize) Err(409, this.ct('emptySource'));
    if (await this.catalog.countDomains(to.id)) Err(409, this.ct('targetNotEmpty'));
  }

  /** The class and subject has a list to start from. */
  ensureDefaultList<T>(list: T | null): T {
    if (!list) Err(404, this.ct('noDefaultList'));
    return list!;
  }

  /** A default list starts an empty list only. */
  async ensureListEmpty(teacherAssignmentId: string) {
    if (await this.catalog.countDomains(teacherAssignmentId)) Err(409, this.ct('targetNotEmpty'));
  }

  /** A level is set only for a pupil who sat in the list's section that month. */
  async ensurePlaced(studentId: string, sectionId: string, month: string) {
    const { start, end } = monthBounds(month);
    if (!await this.evaluations.placedDuring(studentId, sectionId, start, end)) Err(409, this.ct('studentNotInSection'));
  }
}
