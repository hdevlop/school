import { Service } from '@server/najm';
import { ExamRepository } from './ExamRepository';
import { ExamValidator } from './ExamValidator';
import { pickProps } from '@server/shared';
import type { CreateExamDto, UpdateExamDto } from './ExamDto';

@Service()
export class ExamService {
  constructor(
    private examRepository: ExamRepository,
    private examValidator: ExamValidator,
  ) { }

  async getAll() {
    return await this.examRepository.getAll();
  }

  async getById(id: string) {
    return this.examValidator.ensureExists(id);
  }

  async getBySection(sectionId: string) {
    await this.examValidator.ensureSectionExists(sectionId);
    return await this.examRepository.getBySection(sectionId);
  }

  async getBySubject(subjectId: string) {
    await this.examValidator.ensureSubjectExists(subjectId);
    return await this.examRepository.getBySubject(subjectId);
  }

  async getByTeacher(teacherId: string) {
    await this.examValidator.ensureTeacherExists(teacherId);
    return await this.examRepository.getByTeacher(teacherId);
  }

  async getTodayExams() {
    return await this.examRepository.getTodayExams();
  }

  async getUpcomingExams() {
    return await this.examRepository.getUpcomingExams();
  }

  async getTeacherAssignmentId({ teacherId, subjectId, sectionId }: { teacherId: string; subjectId: string; sectionId: string }) {
    await this.examValidator.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
    const assignment = await this.examRepository.getTeacherAssignment(teacherId, subjectId, sectionId);
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

  async create(data: CreateExamDto) {
    const normalizedData = this.normalizeSectionTargets(data);
    const EXAM_CREATE_KEYS = [
      'title', 'description', 'type', 'date', 'startTime', 'endTime', 'duration',
      'totalMarks', 'passingMarks', 'roomNumber', 'instructions', 'status', 'sectionIds'
    ];

    const examDetails: Record<string, unknown> = {
      ...pickProps(normalizedData, EXAM_CREATE_KEYS),
      teacherId: normalizedData.teacherId,
      sectionId: normalizedData.sectionId,
      subjectId: normalizedData.subjectId,
    };

    await this.examValidator.validate(examDetails);

    const [teacherAssignmentId] = await this.getTeacherAssignmentIds({
      teacherId: normalizedData.teacherId,
      subjectId: normalizedData.subjectId,
      sectionIds: normalizedData.sectionIds || [],
    });
    examDetails.teacherAssignmentId = teacherAssignmentId;

    return await this.examRepository.create(examDetails);
  }

  async update(id: string, data: UpdateExamDto) {
    const current = await this.examValidator.ensureExists(id);
    const normalizedData = this.normalizeSectionTargets(data);
    await this.examValidator.validate(normalizedData, id);

    const EXAM_UPDATE_KEYS = [
      'title', 'description', 'type', 'date', 'startTime', 'endTime', 'duration',
      'totalMarks', 'passingMarks', 'roomNumber', 'instructions', 'status', 'sectionIds'
    ];

    const examData: Record<string, unknown> = pickProps(normalizedData, EXAM_UPDATE_KEYS);
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
      examData.teacherAssignmentId = teacherAssignmentId;
      examData.sectionIds = sectionIds;
    }

    return await this.examRepository.update(id, examData);
  }

  async delete(id: string) {
    await this.examValidator.ensureExists(id);
    await this.examValidator.ensureNotInUse(id);
    return await this.examRepository.delete(id);
  }

  async deleteAll() {
    return await this.examRepository.deleteAll();
  }

  async deleteBulk(ids: string[]) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedExams: results,
    };
  }

  async seedDemoExams(examsData) {
    const createdExams = [];

    for (const examData of examsData) {
      try {
        const examEntity = await this.examRepository.create(examData);
        createdExams.push(examEntity);
      } catch {
        continue;
      }
    }

    return createdExams;
  }
}
