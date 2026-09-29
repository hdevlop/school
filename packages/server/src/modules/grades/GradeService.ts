import { Service } from '../../najm';
import { GradeRepository, type GradeListFilters } from './GradeRepository';
import { GradeValidator } from './GradeValidator';
import { AssessmentRepository } from '../assessments/AssessmentRepository';
import type { CreateGradeDto, UpdateGradeDto } from './GradeDto';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { AcademicSourceService } from '../academicSources/AcademicSourceService';
import { targetSectionIds } from '../academicSources/academicSourceContext';
import { ExamRepository } from '../exams/ExamRepository';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';

function createProgressLogger(label: string, total: number, stepPercent = 10) {
  const stepCount = Math.max(1, Math.ceil(total * stepPercent / 100));
  let lastLoggedPercent = -stepPercent;

  return (processed: number, details = '') => {
    const percent = total === 0 ? 100 : Math.floor((processed / total) * 100);
    const shouldLog =
      processed === 0 ||
      processed === total ||
      processed % stepCount === 0 ||
      percent >= lastLoggedPercent + stepPercent;

    if (!shouldLog) return;

    lastLoggedPercent = percent;
    const suffix = details ? ` - ${details}` : '';
    console.log(`  ${label}: ${String(percent).padStart(3, ' ')}% (${processed}/${total})${suffix}`);
  };
}

type GradeSourceIds = { assessmentId?: string | null; examId?: string | null };

@Service()
export class GradeService {
  constructor(
    private gradeRepository: GradeRepository,
    private gradeValidator: GradeValidator,
    private assessmentRepository: AssessmentRepository,
    private years: AcademicYearValidator,
    private examRepository: ExamRepository,
    private sources: AcademicSourceService,
    private enrollments: StudentEnrollmentRepository,
  ) { }

  private sourceContext(sourceIds: GradeSourceIds) {
    return sourceIds.assessmentId
      ? this.assessmentRepository.getSourceContext(sourceIds.assessmentId)
      : this.examRepository.getSourceContext(sourceIds.examId!);
  }

  async ensureCreateEligible(
    studentId: string,
    sectionId: string,
    sourceIds: GradeSourceIds,
    teacherId: string,
    subjectId: string,
    resolvedSource?: NonNullable<Awaited<ReturnType<ExamRepository['getSourceContext']>>>,
  ) {
    this.gradeValidator.ensureEligibleGradeSource(sourceIds);
    const source = this.gradeValidator.ensureSourceExists(resolvedSource ?? await this.sourceContext(sourceIds));
    this.gradeValidator.ensureSourceAssignmentMatches(source, teacherId, subjectId);
    const sections = await this.sources.sectionContexts([source]);
    const yearLabel = this.gradeValidator.ensureSourceContextResolved(source, sections);
    const year = await this.years.requireLabel(yearLabel);
    this.gradeValidator.ensureSourceYearValid(source, year);
    this.gradeValidator.ensureSourceTargetsSection(source, sectionId);
    const hasDatedEnrollment = await this.enrollments.hasAnyForStudent(studentId);
    if (hasDatedEnrollment) {
      this.gradeValidator.ensureDatedPlacement(
        await this.enrollments.isPlacedInSectionOnDate(studentId, sectionId, source.date),
      );
    }
    return { hasDatedEnrollment, academicYearId: year.id };
  }

  private async yearIdForSource(sourceIds: GradeSourceIds) {
    this.gradeValidator.ensureEligibleGradeSource(sourceIds);
    const source = await this.sourceContext(sourceIds);
    return this.gradeValidator.ensureDemoSourceYear(source);
  }

  async listUnassignedSources() {
    return {
      basis: 'unassigned-global',
      issue: 'grade-has-no-unique-source-date',
      grades: await this.gradeRepository.listUnassignedSources(),
    };
  }

  // The year's grades, optionally for one student, section, subject or
  // teacher; a filter naming a missing record is a 404 before the list is read.
  async getAll(filters: GradeListFilters = {}) {
    if (filters.studentId) await this.gradeValidator.ensureStudentExists(filters.studentId);
    if (filters.sectionId) await this.gradeValidator.ensureSectionExists(filters.sectionId);
    if (filters.subjectId) await this.gradeValidator.ensureSubjectExists(filters.subjectId);
    if (filters.teacherId) await this.gradeValidator.ensureTeacherExists(filters.teacherId);
    return this.gradeRepository.getAll(filters);
  }

  // The year middleware already checked the role may use the selected year, so a
  // grade or source found in it needs no second year check.
  async getById(id: string) {
    return this.gradeValidator.ensureExists(id);
  }

  // A source's grades, in the selected year: another year's source is not found.
  async getByAssessment(assessmentId: string) {
    await this.gradeValidator.ensureAssessmentExists(assessmentId);
    return await this.gradeRepository.getByAssessment(assessmentId);
  }

  async getByExam(examId: string) {
    await this.gradeValidator.ensureExamExists(examId);
    return await this.gradeRepository.getByExam(examId);
  }

  async getByStudent(studentId: string) {
    return this.getAll({ studentId });
  }

  async getStudentReport(studentId: string) {
    const grades = await this.getByStudent(studentId);
    const subjectsById = new Map<string, any>();
    let totalMarksObtained = 0;
    let totalPossibleMarks = 0;

    for (const grade of grades as any[]) {
      const subjectId = grade.subject?.id || 'unassigned';
      const marksObtained = this.toNumber(grade.marksObtained);
      const source = grade.assessment?.id ? grade.assessment : grade.exam?.id ? grade.exam : null;
      const sourceTotalMarks = this.toNumber(source?.totalMarks);
      const percentage = sourceTotalMarks > 0
        ? this.round((marksObtained / sourceTotalMarks) * 100)
        : 0;

      if (!subjectsById.has(subjectId)) {
        subjectsById.set(subjectId, {
          subject: grade.subject || null,
          grades: [],
          totalMarksObtained: 0,
          totalPossibleMarks: 0,
          averagePercentage: 0,
          gpa: 0,
        });
      }

      const subjectReport = subjectsById.get(subjectId);
      subjectReport.grades.push({
        id: grade.id,
        assessment: grade.assessment?.id ? grade.assessment : null,
        exam: grade.exam?.id ? grade.exam : null,
        marksObtained,
        totalMarks: sourceTotalMarks,
        percentage,
        status: grade.status,
        feedback: grade.feedback,
      });
      subjectReport.totalMarksObtained += marksObtained;
      subjectReport.totalPossibleMarks += sourceTotalMarks;
      totalMarksObtained += marksObtained;
      totalPossibleMarks += sourceTotalMarks;
    }

    const subjects = Array.from(subjectsById.values()).map((subjectReport) => {
      const averagePercentage = subjectReport.totalPossibleMarks > 0
        ? this.round((subjectReport.totalMarksObtained / subjectReport.totalPossibleMarks) * 100)
        : 0;

      return {
        ...subjectReport,
        totalMarksObtained: this.round(subjectReport.totalMarksObtained),
        totalPossibleMarks: this.round(subjectReport.totalPossibleMarks),
        averagePercentage,
        gpa: this.percentageToGpa(averagePercentage),
      };
    });

    const averagePercentage = totalPossibleMarks > 0
      ? this.round((totalMarksObtained / totalPossibleMarks) * 100)
      : 0;

    return {
      studentId,
      subjects,
      totalGrades: grades.length,
      totalMarksObtained: this.round(totalMarksObtained),
      totalPossibleMarks: this.round(totalPossibleMarks),
      averagePercentage,
      gpa: this.percentageToGpa(averagePercentage),
    };
  }

  async getCount() {
    return await this.gradeRepository.getCount();
  }

  async getAssessmentId({ teacherId, subjectId, sectionId, assessmentTitle }) {
    await this.gradeValidator.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
    const assessment = await this.assessmentRepository.getAssessmentByParams(
      teacherId,
      subjectId,
      sectionId,
      assessmentTitle
    );
    return assessment.id;
  }

  async create(data: CreateGradeDto, user: { id: string; role?: string; teacherId?: string }) {
    // Check a submitted teacher before any other lookup, then check the actual
    // source teacher too. A caller cannot impersonate a teacher by changing the
    // form's teacherId.
    if (data.teacherId) await this.gradeValidator.ensureTeacherOwnsSource(user, data.teacherId);
    const sourceIds = { assessmentId: data.assessmentId, examId: data.examId };
    const source = this.gradeValidator.ensureSourceExists(await this.sourceContext(sourceIds));
    const { teacherId, subjectId } = this.gradeValidator.ensureSourceTeachingAssignment(source);
    await this.gradeValidator.ensureTeacherOwnsSource(user, teacherId);
    this.gradeValidator.ensureSourceAssignmentMatches(source, data.teacherId || teacherId, data.subjectId || subjectId);
    const targets = targetSectionIds(source);
    const sectionId = this.gradeValidator.ensureTargetSection(data.sectionId ?? (targets.length === 1 ? targets[0] : null));
    const gradeDetails = {
      studentId: data.studentId,
      assessmentId: data.assessmentId || null,
      examId: data.examId || null,
      marksObtained: data.status === 'missed' ? 0 : data.marksObtained,
      feedback: data.feedback,
      status: this.resolveStatus(data.marksObtained, data.status),
      gradedBy: user.id,
    };

    await this.gradeValidator.ensureStudentExists(gradeDetails.studentId);
    await this.gradeValidator.ensureSingleGradeSource({
      assessmentId: gradeDetails.assessmentId,
      examId: gradeDetails.examId,
    });
    if (gradeDetails.assessmentId) {
      await this.gradeValidator.ensureAssessmentExists(gradeDetails.assessmentId);
    }
    if (gradeDetails.examId) {
      await this.gradeValidator.ensureExamExists(gradeDetails.examId);
    }
    await this.gradeValidator.ensureNoDuplicateGrade(gradeDetails.studentId, {
      assessmentId: gradeDetails.assessmentId,
      examId: gradeDetails.examId,
    });
    const eligibility = await this.ensureCreateEligible(
      gradeDetails.studentId, sectionId,
      { assessmentId: gradeDetails.assessmentId, examId: gradeDetails.examId },
      teacherId, subjectId, source,
    );
    this.gradeValidator.ensureSelectedYear(eligibility.academicYearId);
    if (!eligibility.hasDatedEnrollment) {
      await this.gradeValidator.ensureStudentInSection(gradeDetails.studentId, sectionId);
    }
    await this.gradeValidator.ensureTeacherAssignmentExists(
      teacherId, subjectId, sectionId,
    );
    if (!eligibility.hasDatedEnrollment && gradeDetails.assessmentId) {
      await this.gradeValidator.ensureStudentInAssessment(gradeDetails.studentId, gradeDetails.assessmentId);
    }
    if (!eligibility.hasDatedEnrollment && gradeDetails.examId) {
      await this.gradeValidator.ensureStudentInExam(gradeDetails.studentId, gradeDetails.examId);
    }

    return await this.gradeRepository.create({ ...gradeDetails, academicYearId: eligibility.academicYearId });
  }

  async update(id: string, data: UpdateGradeDto, user: { id: string; role?: string; teacherId?: string }) {
    const existing = await this.getById(id);
    await this.gradeValidator.ensureTeacherOwnsSource(user, existing.teacher?.id);

    const gradeData: Record<string, unknown> = {};

    if (data.status === 'missed') {
      gradeData.marksObtained = 0;
      gradeData.status = 'missed';
    } else if (data.marksObtained !== undefined) {
      gradeData.marksObtained = data.marksObtained;
      gradeData.status = this.resolveStatus(data.marksObtained, data.status);
    }

    if (data.feedback !== undefined) {
      gradeData.feedback = data.feedback;
    }

    if (data.status !== undefined && data.marksObtained === undefined && data.status !== 'missed') {
      gradeData.status = data.status;
    }

    if (Object.keys(gradeData).length > 0) {
      gradeData.gradedBy = user.teacherId || user.id;
      await this.gradeRepository.update(id, gradeData);
    }

    return await this.getById(id);
  }

  async delete(id: string) {
    await this.getById(id);
    return await this.gradeRepository.delete(id);
  }

  async deleteAll() {
    return await this.gradeRepository.deleteAll();
  }

  /** Trusted demo reset: every year's grades. */
  async clearForSeedReset() {
    return this.gradeRepository.clearForSeedReset();
  }

  async deleteBulk(ids: string[]) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedGrades: results,
    };
  }

  async seedDemoGrades(gradesData) {
    const createdGrades = [];
    const logProgress = createProgressLogger('Grade inserts', gradesData.length);
    logProgress(0, 'created 0');

    for (const [index, gradeData] of gradesData.entries()) {
      try {
        const academicYearId = await this.yearIdForSource({
          assessmentId: gradeData.assessmentId,
          examId: gradeData.examId,
        });
        const gradeEntity = await this.gradeRepository.create({ ...gradeData, academicYearId });
        createdGrades.push(gradeEntity);
      } catch {
        continue;
      } finally {
        logProgress(index + 1, `created ${createdGrades.length}`);
      }
    }

    return createdGrades;
  }

  private toNumber(value: unknown) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }

  private resolveStatus(marksObtained: unknown, requestedStatus?: string | null) {
    if (requestedStatus === 'missed') return 'missed';
    if (requestedStatus === 'pending') return 'pending';
    return marksObtained === null || marksObtained === undefined || marksObtained === '' ? 'pending' : 'graded';
  }

  private round(value: number) {
    return Math.round(value * 100) / 100;
  }

  private percentageToGpa(percentage: number) {
    return this.round(Math.min(4, Math.max(0, percentage / 25)));
  }
}
