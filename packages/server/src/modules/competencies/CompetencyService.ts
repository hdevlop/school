import { catalogInMonths, previousMonth, type CompetencyYearLevels, type StudentCompetencySheet } from '@sms/contracts';
import { Service, Transaction } from '../../najm';
import { StudentValidator } from '../students/StudentValidator';
import { CompetencyCatalogRepository } from './CompetencyCatalogRepository';
import { CompetencyEvaluationRepository } from './CompetencyEvaluationRepository';
import { CompetencyRemarkRepository } from './CompetencyRemarkRepository';
import { CompetencyValidator, monthBounds, type CompetencyActor } from './CompetencyValidator';
import { defaultCompetencyList } from './defaultCatalogs';
import type {
  ApplyDefaultDto, CopyCatalogDto, CreateCompetencyDto, CreateDomainDto, EvaluationsQuery, SetEvaluationDto, SetRemarkDto, StudentSheetQuery,
  UpdateCompetencyDto, UpdateDomainDto,
} from './CompetencyDto';

const defined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;

@Service()
export class CompetencyService {
  constructor(
    private catalog: CompetencyCatalogRepository,
    private evaluations: CompetencyEvaluationRepository,
    private remarks: CompetencyRemarkRepository,
    private validator: CompetencyValidator,
    private students: StudentValidator,
  ) {}

  // The list.

  /** What the page offers: a teacher's own classes and subjects, else those with a list the reader may see. */
  async listAssignments(actor: CompetencyActor) {
    const rows = actor.role === 'teacher' ? await this.catalog.assignmentsOfTeacher(actor.id) : await this.catalog.listedAssignments();
    return rows.map(({ subjectCode, ...row }) => ({ ...row, hasDefaultList: !!defaultCompetencyList(subjectCode, row.className) }));
  }

  async getCatalog(teacherAssignmentId: string) {
    return this.catalog.catalog(teacherAssignmentId);
  }

  // A list changes from the month the teacher is looking at: the months before
  // keep their sub-domains, competencies and levels as they were.

  /** A sub-domain added in a month is followed from that month on. */
  async createDomain({ month, ...data }: CreateDomainDto, actor: CompetencyActor) {
    this.validator.ensureMonthInYear(month);
    await this.validator.ensureWritableAssignment(data.teacherAssignmentId, actor);
    await this.validator.ensureDomainRoom(data.teacherAssignmentId, month);
    const fromMonth = this.validator.storedFromMonth(month);
    await this.validator.ensureDomainNameFree(data.teacherAssignmentId, data.name, { fromMonth, untilMonth: null });
    const position = await this.catalog.nextDomainPosition(data.teacherAssignmentId);
    const created = await this.catalog.createDomain({ ...data, altName: data.altName ?? null, position, fromMonth });
    return this.validator.ensureDomain(created.id);
  }

  /** A sub-domain's name is a heading: a rename corrects it in every month. */
  async updateDomain(id: string, data: UpdateDomainDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    const domain = await this.validator.ensureDomain(id);
    if (data.name !== undefined) await this.validator.ensureDomainNameFree(domain.teacherAssignmentId, data.name, domain, id);
    await this.catalog.updateDomain(id, defined(data));
    return this.validator.ensureDomain(id);
  }

  /**
   * Removing a sub-domain in a month removes its competencies from that month
   * on; it ends the month before, unless it started in that month and nothing
   * of it is left.
   */
  @Transaction()
  async deleteDomain(id: string, month: string, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    this.validator.ensureMonthInYear(month);
    const domain = await this.validator.ensureDomain(id);
    this.validator.ensureInMonth(domain, month);
    const startsHere = this.validator.startOf(domain) >= month;
    for (const item of await this.catalog.competenciesOfDomain(id)) {
      if (item.untilMonth && item.untilMonth < month && !startsHere) continue;
      await this.removeFrom(item, month, startsHere);
    }
    if (startsHere || !(await this.catalog.countCompetencies(id))) return this.catalog.deleteDomain(id);
    await this.catalog.updateDomain(id, { untilMonth: previousMonth(month) });
    return { id };
  }

  /** A competency added in a month is followed from that month on, in a sub-domain followed then. */
  async createCompetency({ month, ...data }: CreateCompetencyDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    this.validator.ensureMonthInYear(month);
    const domain = await this.validator.ensureDomain(data.domainId);
    this.validator.ensureInMonth(domain, month);
    await this.validator.ensureCompetencyRoom(data.domainId, month);
    const fromMonth = this.validator.storedFromMonth(month);
    await this.validator.ensureCompetencyNameFree(data.domainId, data.name, { fromMonth, untilMonth: null });
    const position = await this.catalog.nextCompetencyPosition(data.domainId);
    const created = await this.catalog.createCompetency({ ...data, altName: data.altName ?? null, position, fromMonth });
    return this.validator.ensureCompetency(created.id);
  }

  /**
   * A rename `fromMonth` replaces the competency from that month on: it ends
   * the month before with its earlier levels, and a new one under the new name
   * takes its place and the levels of that month and after. Otherwise a change
   * applies in every month the competency is followed in.
   */
  @Transaction()
  async updateCompetency(id: string, { month, scope, ...data }: UpdateCompetencyDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    const competency = await this.validator.ensureCompetency(id);
    const domainId = data.domainId ?? competency.domainId;
    const span = { fromMonth: competency.fromMonth, untilMonth: competency.untilMonth };
    if (scope === 'fromMonth' && month) {
      this.validator.ensureMonthInYear(month);
      this.validator.ensureInMonth(span, month);
      if (this.validator.startOf(competency) < month) return this.replaceFrom(competency, { ...data, domainId }, month);
    }
    if (domainId !== competency.domainId) {
      const target = await this.validator.ensureDomain(domainId);
      this.validator.ensureSameList(target.teacherAssignmentId, competency.teacherAssignmentId);
      await this.validator.ensureCompetencyRoom(domainId, this.validator.startOf(competency));
    }
    if (data.name !== undefined || domainId !== competency.domainId) {
      await this.validator.ensureCompetencyNameFree(domainId, data.name ?? competency.name, span, id);
    }
    await this.catalog.updateCompetency(id, defined(data));
    return this.validator.ensureCompetency(id);
  }

  private async replaceFrom(
    competency: Awaited<ReturnType<CompetencyValidator['ensureCompetency']>>,
    data: Omit<UpdateCompetencyDto, 'month' | 'scope'> & { domainId: string },
    month: string,
  ) {
    const name = data.name ?? competency.name;
    const span = { fromMonth: month, untilMonth: competency.untilMonth };
    if (data.domainId !== competency.domainId) {
      const target = await this.validator.ensureDomain(data.domainId);
      this.validator.ensureSameList(target.teacherAssignmentId, competency.teacherAssignmentId);
      this.validator.ensureInMonth(target, month);
    }
    await this.validator.ensureCompetencyNameFree(data.domainId, name, span, competency.id);
    const created = await this.catalog.createCompetency({
      domainId: data.domainId,
      name,
      altName: data.altName !== undefined ? data.altName : competency.altName,
      position: data.position ?? competency.position,
      ...span,
    });
    await this.catalog.updateCompetency(competency.id, { untilMonth: previousMonth(month) });
    await this.evaluations.moveFrom(competency.id, created.id, month);
    return this.validator.ensureCompetency(created.id);
  }

  /**
   * Removing a competency in a month removes it from that month on: it ends
   * the month before with the levels set until then, unless it started in that
   * month, when it goes with its levels.
   */
  @Transaction()
  async deleteCompetency(id: string, month: string, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    this.validator.ensureMonthInYear(month);
    const competency = await this.validator.ensureCompetency(id);
    this.validator.ensureInMonth(competency, month);
    return this.removeFrom(competency, month, false);
  }

  private async removeFrom(item: { id: string; fromMonth: string | null }, month: string, entirely: boolean) {
    if (entirely || this.validator.startOf(item) >= month) return this.catalog.deleteCompetency(item.id);
    await this.evaluations.removeFrom(item.id, month);
    await this.catalog.updateCompetency(item.id, { untilMonth: previousMonth(month) });
    return { id: item.id };
  }

  /** The same list in another section of the subject, without its levels. */
  @Transaction()
  async copyCatalog(data: CopyCatalogDto, actor: CompetencyActor) {
    const from = await this.validator.ensureWritableAssignment(data.fromAssignmentId, actor);
    const to = await this.validator.ensureWritableAssignment(data.toAssignmentId, actor);
    const source = await this.catalog.catalog(from.id);
    await this.validator.ensureCopyable(from, to, source.length);
    // Month by month as in the source: the other section follows the same list in the same months.
    for (const domain of source) {
      const created = await this.catalog.createDomain({
        teacherAssignmentId: to.id, name: domain.name, altName: domain.altName, position: domain.position,
        fromMonth: domain.fromMonth, untilMonth: domain.untilMonth,
      });
      for (const item of domain.competencies) {
        await this.catalog.createCompetency({
          domainId: created.id, name: item.name, altName: item.altName, position: item.position,
          fromMonth: item.fromMonth ?? null, untilMonth: item.untilMonth ?? null,
        });
      }
    }
    return this.catalog.catalog(to.id);
  }

  /**
   * An empty list starts from the class and subject's default list (the
   * school's grid, or a draft to edit), in one tap. A started list is never
   * added to.
   */
  @Transaction()
  async applyDefault(data: ApplyDefaultDto, actor: CompetencyActor) {
    const assignment = await this.validator.ensureWritableAssignment(data.teacherAssignmentId, actor);
    const list = this.validator.ensureDefaultList(defaultCompetencyList(assignment.subjectCode, assignment.className));
    await this.validator.ensureListEmpty(assignment.id);
    for (const [position, [name, items]] of list.domains.entries()) {
      const domain = await this.catalog.createDomain({ teacherAssignmentId: assignment.id, name, altName: null, position });
      for (const [index, item] of items.entries()) {
        await this.catalog.createCompetency({ domainId: domain.id, name: item, altName: null, position: index });
      }
    }
    return this.catalog.catalog(assignment.id);
  }

  // Levels.

  async getEvaluations({ teacherAssignmentId, month }: EvaluationsQuery) {
    this.validator.ensureMonthInYear(month);
    const baselineMonth = this.validator.baselineMonth();
    const [evaluations, remarks] = await Promise.all([
      this.evaluations.forAssignment(teacherAssignmentId, [...new Set([month, baselineMonth])]),
      this.remarks.forAssignment(teacherAssignmentId, [month]),
    ]);
    return { month, baselineMonth, evaluations, remarks };
  }

  async setEvaluation(data: SetEvaluationDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    this.validator.ensureMonthInYear(data.month);
    const competency = await this.validator.ensureCompetency(data.competencyId);
    // A level is set in a month the competency and its sub-domain are followed in.
    this.validator.ensureInMonth(competency, data.month);
    this.validator.ensureInMonth({ fromMonth: competency.domainFromMonth, untilMonth: competency.domainUntilMonth }, data.month);
    const assignment = await this.validator.ensureWritableAssignment(competency.teacherAssignmentId, actor);
    await this.validator.ensurePlaced(data.studentId, assignment.sectionId, data.month);
    if (data.level === null) {
      await this.evaluations.clear(data.competencyId, data.studentId, data.month);
      return { competencyId: data.competencyId, studentId: data.studentId, month: data.month, level: null };
    }
    return this.evaluations.set({ ...data, level: data.level, evaluatedBy: actor.id });
  }

  /**
   * The teacher's remark for a pupil's parents in a class and subject for a
   * month, written by whoever may set its levels. An empty remark removes it.
   */
  async setRemark(data: SetRemarkDto, actor: CompetencyActor) {
    this.validator.ensureMonthInYear(data.month);
    const assignment = await this.validator.ensureWritableAssignment(data.teacherAssignmentId, actor);
    await this.validator.ensurePlaced(data.studentId, assignment.sectionId, data.month);
    if (!data.body) {
      await this.remarks.clear(assignment.id, data.studentId, data.month);
      return { studentId: data.studentId, month: data.month, body: '', updatedAt: null };
    }
    return this.remarks.set({ ...data, teacherAssignmentId: assignment.id, writtenBy: actor.id });
  }

  /**
   * One pupil's sheet in one subject. The pupil is read through ownership
   * first, so a parent reaches only their own children; the list is that of
   * the section the pupil sat in that month, as it was followed that month.
   */
  async getStudentSheet(studentId: string, query: StudentSheetQuery): Promise<StudentCompetencySheet & { subjects: Array<{ id: string; name: string }> }> {
    this.validator.ensureMonthInYear(query.month);
    const student = await this.students.ensureExists(studentId);
    const baselineMonth = this.validator.baselineMonth();
    const { start, end } = monthBounds(query.month);
    const placed = await this.catalog.assignmentForStudent(studentId, start, end, query.subjectId);
    const subjects = placed ? await this.catalog.subjectsInSection(placed.sectionId) : [];
    const teacherAssignmentId = placed?.teacherAssignmentId ?? null;
    const [domains, evaluations, remarks] = teacherAssignmentId
      ? await Promise.all([
        this.catalog.catalog(teacherAssignmentId).then((list) => catalogInMonths(list, [query.month])),
        this.evaluations.forAssignment(teacherAssignmentId, [...new Set([query.month, baselineMonth])], studentId),
        this.remarks.forAssignment(teacherAssignmentId, [query.month], studentId),
      ])
      : [[], [], []];
    const subject = subjects.find((item) => item.id === placed?.subjectId) ?? null;
    return {
      student: { id: student.id, name: student.name, altName: student.arabicName ?? null, image: student.image ?? null },
      subject: subject ? { id: subject.id, name: subject.name } : null,
      subjects: subjects.map(({ id, name }) => ({ id, name })),
      teacherAssignmentId,
      domains,
      month: query.month,
      baselineMonth,
      evaluations,
      remarks,
    };
  }

  /**
   * One class and subject's levels and remarks in every month of the year,
   * for the pupils' progress sheets: read through their ownership, so a
   * teacher gets those of their own classes only.
   */
  async getYearLevels({ teacherAssignmentId }: { teacherAssignmentId: string }): Promise<CompetencyYearLevels> {
    const months = this.validator.yearMonths();
    const [evaluations, remarks] = await Promise.all([
      this.evaluations.forAssignment(teacherAssignmentId, months),
      this.remarks.forAssignment(teacherAssignmentId, months),
    ]);
    return { teacherAssignmentId, months, evaluations, remarks };
  }
}
