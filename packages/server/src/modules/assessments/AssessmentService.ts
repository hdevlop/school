import { Service } from '@server/najm';
import { AssessmentRepository } from './AssessmentRepository';
import { AssessmentValidator } from './AssessmentValidator';
import { pickProps } from '@server/shared';
import type { CreateAssessmentDto, DeleteBulkAssessmentDto, UpdateAssessmentDto } from './AssessmentDto';

@Service()
export class AssessmentService {
  constructor(
    private assessmentRepository: AssessmentRepository,
    private assessmentValidator: AssessmentValidator,
  ) { }

  async getAll() {
    return await this.assessmentRepository.getAll();
  }

  async getById(id: string) {
    return this.assessmentValidator.ensureExists(id);
  }

  async getBySection(sectionId: string) {
    await this.assessmentValidator.ensureSectionExists(sectionId);
    return await this.assessmentRepository.getBySection(sectionId);
  }

  async getBySubject(subjectId: string) {
    await this.assessmentValidator.ensureSubjectExists(subjectId);
    return await this.assessmentRepository.getBySubject(subjectId);
  }

  async getByTeacher(teacherId: string) {
    await this.assessmentValidator.ensureTeacherExists(teacherId);
    return await this.assessmentRepository.getByTeacher(teacherId);
  }

  async getTodayAssessments() {
    return await this.assessmentRepository.getTodayAssessments();
  }

  async getByClass(classId: string) {
    await this.assessmentValidator.ensureClassExists(classId);
    return await this.assessmentRepository.getByClass(classId);
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
    const ASSESSMENT_CREATE_KEYS = [
      'title', 'description', 'type', 'date', 'duration', 'totalMarks',
      'passingMarks', 'instructions', 'status', 'sectionIds'
    ];

    const assessmentDetails: Record<string, unknown> = {
      ...pickProps(normalizedData, ASSESSMENT_CREATE_KEYS),
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
    await this.assessmentValidator.validate(normalizedData, id);

    const ASSESSMENT_UPDATE_KEYS = [
      'title', 'description', 'type', 'date', 'duration', 'totalMarks',
      'passingMarks', 'instructions', 'status', 'sectionIds'
    ];

    const assessmentData: Record<string, unknown> = pickProps(normalizedData, ASSESSMENT_UPDATE_KEYS);
    const sectionIds = normalizedData.sectionIds
      ?? (current.sectionIds?.length
        ? current.sectionIds
        : current.section?.id
          ? [current.section.id]
          : []);
    const teacherId = normalizedData.teacherId ?? current.teacher?.id;
    const subjectId = normalizedData.subjectId ?? current.subject?.id;
    const targetsChanged = 'sectionIds' in data || 'sectionId' in data || 'teacherId' in data || 'subjectId' in data;

    if (targetsChanged && sectionIds.length && teacherId && subjectId) {
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
