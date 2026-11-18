import type { CompetencyYearLevels, StudentCompetencySheet } from '@sms/contracts';
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

  async createDomain(data: CreateDomainDto, actor: CompetencyActor) {
    await this.validator.ensureWritableAssignment(data.teacherAssignmentId, actor);
    await this.validator.ensureDomainRoom(data.teacherAssignmentId);
    await this.validator.ensureDomainNameFree(data.teacherAssignmentId, data.name);
    const position = await this.catalog.nextDomainPosition(data.teacherAssignmentId);
    const created = await this.catalog.createDomain({ ...data, altName: data.altName ?? null, position });
    return this.validator.ensureDomain(created.id);
  }

  async updateDomain(id: string, data: UpdateDomainDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    const domain = await this.validator.ensureDomain(id);
    if (data.name !== undefined) await this.validator.ensureDomainNameFree(domain.teacherAssignmentId, data.name, id);
    await this.catalog.updateDomain(id, defined(data));
    return this.validator.ensureDomain(id);
  }

  /** The domain goes with its competencies and every level set in them. */
  async deleteDomain(id: string, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    await this.validator.ensureDomain(id);
    return this.catalog.deleteDomain(id);
  }

  async createCompetency(data: CreateCompetencyDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    await this.validator.ensureDomain(data.domainId);
    await this.validator.ensureCompetencyRoom(data.domainId);
    await this.validator.ensureCompetencyNameFree(data.domainId, data.name);
    const position = await this.catalog.nextCompetencyPosition(data.domainId);
    const created = await this.catalog.createCompetency({ ...data, altName: data.altName ?? null, position });
    return this.validator.ensureCompetency(created.id);
  }

  async updateCompetency(id: string, data: UpdateCompetencyDto, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    const competency = await this.validator.ensureCompetency(id);
    const domainId = data.domainId ?? competency.domainId;
    if (domainId !== competency.domainId) {
      const target = await this.validator.ensureDomain(domainId);
      this.validator.ensureSameList(target.teacherAssignmentId, competency.teacherAssignmentId);
      await this.validator.ensureCompetencyRoom(domainId);
    }
    if (data.name !== undefined || domainId !== competency.domainId) {
      await this.validator.ensureCompetencyNameFree(domainId, data.name ?? competency.name, id);
    }
    await this.catalog.updateCompetency(id, defined(data));
    return this.validator.ensureCompetency(id);
  }

  async deleteCompetency(id: string, actor: CompetencyActor) {
    this.validator.ensureMayWrite(actor);
    await this.validator.ensureCompetency(id);
    return this.catalog.deleteCompetency(id);
  }

  /** The same list in another section of the subject, without its levels. */
  @Transaction()
  async copyCatalog(data: CopyCatalogDto, actor: CompetencyActor) {
    const from = await this.validator.ensureWritableAssignment(data.fromAssignmentId, actor);
    const to = await this.validator.ensureWritableAssignment(data.toAssignmentId, actor);
    const source = await this.catalog.catalog(from.id);
    await this.validator.ensureCopyable(from, to, source.length);
    for (const domain of source) {
      const created = await this.catalog.createDomain({
        teacherAssignmentId: to.id, name: domain.name, altName: domain.altName, position: domain.position,
      });
      for (const item of domain.competencies) {
        await this.catalog.createCompetency({ domainId: created.id, name: item.name, altName: item.altName, position: item.position });
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
   * the section the pupil sat in that month.
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
        this.catalog.catalog(teacherAssignmentId),
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
