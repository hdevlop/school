import { Service } from '../../najm';
import { AssessmentRepository, type AssessmentListFilters } from './AssessmentRepository';
import { AssessmentValidator } from './AssessmentValidator';
import { pickProps } from '../../shared';
import type { CreateAssessmentDto, DeleteBulkAssessmentDto, UpdateAssessmentDto } from './AssessmentDto';
import { AcademicSourceService } from '../academicSources/AcademicSourceService';

@Service()
export class AssessmentService {
  constructor(
    private assessmentRepository: AssessmentRepository,
    private assessmentValidator: AssessmentValidator,
    private sources: AcademicSourceService
  ) { }

  // The year's assessments, optionally for one section, subject or teacher or class;
  // a filter naming a missing record is a 404 before the list is read.
  async getAll(filters: AssessmentListFilters = {}) {
    if (filters.sectionId) await this.assessmentValidator.ensureSectionExists(filters.sectionId);
    if (filters.subjectId) await this.assessmentValidator.ensureSubjectExists(filters.subjectId);
    if (filters.teacherId) await this.assessmentValidator.ensureTeacherExists(filters.teacherId);
    if (filters.classId) await this.assessmentValidator.ensureClassExists(filters.classId);
    return this.assessmentRepository.getAll(filters);
  }

  async getById(id: string) {
    return this.assessmentValidator.ensureExists(id);
  }

  /** The year's assessments of one student's section on each date. */
  async getForStudent(studentId: string) {
    return this.assessmentRepository.getForStudent(studentId);
  }

  async getTodayAssessments() {
    return await this.assessmentRepository.getTodayAssessments();
  }

  async getUpcoming() {
    return await this.assessmentRepository.getUpcoming();
  }

  async getDueThisWeek() {
    return await this.assessmentRepository.getDueThisWeek();
  }

  async getOverdue() {
    return await this.assessmentRepository.getOverdue();
  }

  async getTeacherAssignmentId({ teacherId, subjectId, sectionId }: { teacherId: string; subjectId: string; sectionId: string }) {
    await this.assessmentValidator.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
    const assignment = await this.assessmentRepository.getTeacherAssignment(teacherId, subjectId, sectionId);
    return assignment.id;
  }

  private normalizeSectionTargets<T extends { sectionId?: string | null; sectionIds?: string[] | null }>(data: T): T & { sectionIds?: string[] } {
    const sectionIds = [...new Set((data.sectionIds ?? (data.sectionId ? [data.sectionId] : [])).filter(Boolean))];

    return {
      ...data,
      sectionIds: sectionIds.length ? sectionIds : undefined,
      sectionId: sectionIds[0] ?? data.sectionId,
    };
  }

  private async getTeacherAssignmentIds({
    teacherId,
    subjectId,
    sectionIds,
  }: {
    teacherId: string;
    subjectId: string;
    sectionIds: string[];
  }) {
    return Promise.all(sectionIds.map((sectionId) =>
      this.getTeacherAssignmentId({ teacherId, subjectId, sectionId }),
    ));
  }

  async create(data: CreateAssessmentDto) {
    const normalizedData = this.normalizeSectionTargets(data);
    const year = await this.sources.ensureTargetsValid(normalizedData.sectionIds ?? [], normalizedData.date);
    this.assessmentValidator.ensureSelectedYear(year.id);
    const ASSESSMENT_CREATE_KEYS = [
      'title', 'description', 'type', 'date', 'duration', 'totalMarks',
      'passingMarks', 'instructions', 'status', 'sectionIds'
    ];

    const assessmentDetails: Record<string, unknown> = {
      ...pickProps(normalizedData, ASSESSMENT_CREATE_KEYS),
      academicYearId: year.id,
      teacherId: normalizedData.teacherId,
      sectionId: normalizedData.sectionId,
      subjectId: normalizedData.subjectId,
    };

    await this.assessmentValidator.validate(assessmentDetails);

    const [teacherAssignmentId] = await this.getTeacherAssignmentIds({
      teacherId: normalizedData.teacherId,
      subjectId: normalizedData.subjectId,
      sectionIds: normalizedData.sectionIds || [],
    });
    assessmentDetails.teacherAssignmentId = teacherAssignmentId;

    return await this.assessmentRepository.create(assessmentDetails);
  }

  async update(id: string, data: UpdateAssessmentDto) {
    const current = await this.assessmentValidator.ensureExists(id);
    const normalizedData = this.normalizeSectionTargets(data);
    const currentTargetIds = current.sectionIds?.length
      ? current.sectionIds : current.section?.id ? [current.section.id] : [];
    const targetIds = data.sectionIds !== undefined || data.sectionId !== undefined
      ? normalizedData.sectionIds ?? [] : currentTargetIds;
    const yearTargetsChanged = [...targetIds].sort().join('\0') !== [...currentTargetIds].sort().join('\0');
    const contextChanged = (data.date !== undefined && data.date !== current.date) || yearTargetsChanged ||
      (data.teacherId !== undefined && data.teacherId !== current.teacher?.id) ||
      (data.subjectId !== undefined && data.subjectId !== current.subject?.id);
    let targetYearId: string | undefined;
    if (contextChanged) {
      await this.assessmentValidator.ensureNotInUse(id);
      const year = await this.sources.ensureTargetsValid(
        targetIds,
        normalizedData.date ?? current.date,
      );
      this.assessmentValidator.ensureSelectedYear(year.id);
      this.assessmentValidator.ensureSameYear(current.academicYearId, year.id);
      targetYearId = year.id;
    }
    await this.assessmentValidator.validate(normalizedData, id);

    const ASSESSMENT_UPDATE_KEYS = [
      'title', 'description', 'type', 'date', 'duration', 'totalMarks',
      'passingMarks', 'instructions', 'status', 'sectionIds'
    ];

    const assessmentData: Record<string, unknown> = pickProps(normalizedData, ASSESSMENT_UPDATE_KEYS);
    if (targetYearId && !current.academicYearId) assessmentData.academicYearId = targetYearId;
    const sectionIds = normalizedData.sectionIds ?? currentTargetIds;
    const teacherId = normalizedData.teacherId ?? current.teacher?.id;
    const subjectId = normalizedData.subjectId ?? current.subject?.id;
    const assignmentChanged = yearTargetsChanged ||
      (data.teacherId !== undefined && data.teacherId !== current.teacher?.id) ||
      (data.subjectId !== undefined && data.subjectId !== current.subject?.id);

    if (assignmentChanged && sectionIds.length && teacherId && subjectId) {
      const [teacherAssignmentId] = await this.getTeacherAssignmentIds({
        teacherId,
        subjectId,
        sectionIds,
      });
      assessmentData.teacherAssignmentId = teacherAssignmentId;
      assessmentData.sectionIds = sectionIds;
    }

    return await this.assessmentRepository.update(id, assessmentData);
  }

  async delete(id: string) {
    await this.assessmentValidator.ensureExists(id);
    await this.assessmentValidator.ensureNotInUse(id);
    return await this.assessmentRepository.delete(id);
  }

  async deleteAll() {
    return await this.assessmentRepository.deleteAll();
  }

  async clearForSeedReset() {
    return this.assessmentRepository.clearForSeedReset();
  }

  async deleteBulk(ids: DeleteBulkAssessmentDto) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedAssessments: results,
    };
  }

  async seedDemoAssessments(assessmentsData) {
    const createdAssessments = [];

    for (const assessmentData of assessmentsData) {
      try {
        const assessmentEntity = await this.assessmentRepository.create(assessmentData);
        createdAssessments.push(assessmentEntity);
      } catch {
        continue;
      }
    }

    return createdAssessments;
  }
}
