import { Service } from '../../najm';
import { ExamRepository, type ExamListFilters } from './ExamRepository';
import { ExamValidator } from './ExamValidator';
import { pickProps } from '../../shared';
import { getBusinessDateOnly } from '../../shared/businessDate';
import type { CreateExamDto, UpdateExamDto } from './ExamDto';
import { AcademicSourceService } from '../academicSources/AcademicSourceService';

@Service()
export class ExamService {
  constructor(
    private examRepository: ExamRepository,
    private examValidator: ExamValidator,
    private sources: AcademicSourceService
  ) { }

  // The year's exams, optionally for one section, subject or teacher;
  // a filter naming a missing record is a 404 before the list is read.
  async getAll(filters: ExamListFilters = {}) {
    if (filters.sectionId) await this.examValidator.ensureSectionExists(filters.sectionId);
    if (filters.subjectId) await this.examValidator.ensureSubjectExists(filters.subjectId);
    if (filters.teacherId) await this.examValidator.ensureTeacherExists(filters.teacherId);
    return this.examRepository.getAll(filters);
  }

  async getById(id: string) {
    return this.examValidator.ensureExists(id);
  }

  /** The year's exams one student sat, or will sit, in their section of the day; today's and later ones when `upcoming`. */
  async getForStudent(studentId: string, { upcoming = false } = {}) {
    // Upcoming from the school's business day, not the UTC date.
    return this.examRepository.getForStudent(studentId, upcoming ? getBusinessDateOnly() : undefined);
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
    const year = await this.sources.ensureTargetsValid(normalizedData.sectionIds ?? [], normalizedData.date);
    this.examValidator.ensureSelectedYear(year.id);
    const EXAM_CREATE_KEYS = [
      'title', 'description', 'type', 'date', 'startTime', 'endTime', 'duration',
      'totalMarks', 'passingMarks', 'roomNumber', 'instructions', 'status', 'sectionIds'
    ];

    const examDetails: Record<string, unknown> = {
      ...pickProps(normalizedData, EXAM_CREATE_KEYS),
      academicYearId: year.id,
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
      await this.examValidator.ensureNotInUse(id);
      const year = await this.sources.ensureTargetsValid(
        targetIds,
        normalizedData.date ?? current.date,
      );
      this.examValidator.ensureSelectedYear(year.id);
      this.examValidator.ensureSameYear(current.academicYearId, year.id);
      targetYearId = year.id;
    }
    await this.examValidator.validate(normalizedData, id);

    const EXAM_UPDATE_KEYS = [
      'title', 'description', 'type', 'date', 'startTime', 'endTime', 'duration',
      'totalMarks', 'passingMarks', 'roomNumber', 'instructions', 'status', 'sectionIds'
    ];

    const examData: Record<string, unknown> = pickProps(normalizedData, EXAM_UPDATE_KEYS);
    if (targetYearId && !current.academicYearId) examData.academicYearId = targetYearId;
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

  /** Trusted demo reset: every year's exams. */
  async clearForSeedReset() {
    return this.examRepository.clearForSeedReset();
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
