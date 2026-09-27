import { Err, Service } from '../../najm';
import { GradeRepository, type GradeListFilters } from './GradeRepository';
import { GradeValidator } from './GradeValidator';
import { AssessmentRepository } from '../assessments/AssessmentRepository';
import type { CreateGradeDto, UpdateGradeDto } from './GradeDto';
import { AcademicYearValidator, type ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { AcademicSourceService } from '../academicSources/AcademicSourceService';
import { academicSourceContextIssue, targetSectionIds } from '../academicSources/academicSourceContext';
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

  private async ensureRecordYear(grade: Awaited<ReturnType<GradeRepository['getById']>>, role?: string) {
    if (!grade) return;
    await this.years.resolveRecord(
      grade.academicYearId,
      grade.assessment?.date ?? grade.exam?.date,
      role,
    );
  }

  private async ensureTeacherOwnsSource(user: { id: string; role?: string }, teacherId: string | null | undefined) {
    if (user.role !== 'teacher') return;
    const callerTeacherId = await this.gradeRepository.teacherIdForUser(user.id);
    if (!callerTeacherId || callerTeacherId !== teacherId) {
      Err(403, 'A teacher can grade only their own assessment or exam');
    }
  }

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
    if (Boolean(sourceIds.assessmentId) === Boolean(sourceIds.examId)) {
      Err(400, 'A grade needs exactly one assessment or exam');
    }
    const source = resolvedSource ?? await this.sourceContext(sourceIds);
    if (!source) Err(404, 'Grade source not found');
    if (source!.teacherId !== teacherId || source!.subjectId !== subjectId) {
      Err(409, 'Grade teacher and subject must match the source assignment');
    }
    const sections = await this.sources.sectionContexts([source!]);
    const yearLabel = source!.classAcademicYear;
    if (!yearLabel) Err(409, 'Grade source has no registered class year');
    const contextIssue = academicSourceContextIssue(source!, sections, yearLabel!);
    if (contextIssue) Err(409, `Grade source context is unresolved: ${contextIssue}`);
    const year = await this.years.requireLabel(yearLabel!);
    if (year.status === 'draft') Err(409, 'Grades cannot be recorded in a draft year');
    if (source!.academicYearId && source!.academicYearId !== year.id) {
      Err(409, 'Grade source registered year conflicts with its assignment');
    }
    if (source!.date < year.reportingStartsOn || source!.date > year.reportingEndsOn) {
      Err(409, 'Grade source date is outside its academic year');
    }
    if (!targetSectionIds(source!).includes(sectionId)) {
      Err(409, 'Grade section is not targeted by its source');
    }
    const hasDatedEnrollment = await this.enrollments.hasAnyForStudent(studentId);
    if (hasDatedEnrollment && !await this.enrollments.isPlacedInSectionOnDate(studentId, sectionId, source!.date)) {
      Err(409, 'Student has no dated placement in the grade section on the source date');
    }
    return { hasDatedEnrollment, academicYearId: year.id };
  }

  private async yearIdForSource(sourceIds: GradeSourceIds) {
    if (Boolean(sourceIds.assessmentId) === Boolean(sourceIds.examId)) {
      Err(400, 'A grade needs exactly one assessment or exam');
    }
    const source = await this.sourceContext(sourceIds);
    if (!source?.academicYearId) Err(409, 'Demo grade source has no registered academic year');
    return source.academicYearId;
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
  async getAll(year: ResolvedAcademicYear, filters: Omit<GradeListFilters, 'year'> = {}) {
    if (filters.studentId) await this.gradeValidator.ensureStudentExists(filters.studentId);
    if (filters.sectionId) await this.gradeValidator.ensureSectionExists(filters.sectionId);
    if (filters.subjectId) await this.gradeValidator.ensureSubjectExists(filters.subjectId);
    if (filters.teacherId) await this.gradeValidator.ensureTeacherExists(filters.teacherId);
    return this.gradeRepository.getAll({ year, ...filters });
  }

  async getById(id: string, role?: string) {
    const grade = await this.gradeValidator.ensureExists(id);
    await this.ensureRecordYear(grade, role);
    return grade;
  }

  // A source's grades belong to the source's year, whichever year is viewed;
  // the role must be allowed that year.
  async getByAssessment(assessmentId: string, role?: string) {
    await this.gradeValidator.ensureAssessmentExists(assessmentId);
    const source = await this.assessmentRepository.getSourceContext(assessmentId);
    await this.years.resolveRecord(source?.academicYearId, source?.date, role);
    return await this.gradeRepository.getByAssessment(assessmentId);
  }

  // A source's grades belong to the source's year, whichever year is viewed;
  // the role must be allowed that year.
  async getByExam(examId: string, role?: string) {
    await this.gradeValidator.ensureExamExists(examId);
    const source = await this.examRepository.getSourceContext(examId);
    await this.years.resolveRecord(source?.academicYearId, source?.date, role);
    return await this.gradeRepository.getByExam(examId);
  }

  async getByStudent(studentId: string, year: ResolvedAcademicYear) {
    return this.getAll(year, { studentId });
  }

  async getStudentReport(studentId: string, year: ResolvedAcademicYear) {
    const grades = await this.getByStudent(studentId, year);
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
    if (data.teacherId) await this.ensureTeacherOwnsSource(user, data.teacherId);
    const sourceIds = { assessmentId: data.assessmentId, examId: data.examId };
    const source = await this.sourceContext(sourceIds);
    if (!source) Err(404, 'Grade source not found');
    if (!source!.teacherId || !source!.subjectId) Err(409, 'Grade source has no teaching assignment');
    await this.ensureTeacherOwnsSource(user, source!.teacherId);
    if ((data.teacherId && data.teacherId !== source!.teacherId) ||
      (data.subjectId && data.subjectId !== source!.subjectId)) {
      Err(409, 'Grade teacher and subject must match the source assignment');
    }
    const targets = targetSectionIds(source!);
    const sectionId = data.sectionId ?? (targets.length === 1 ? targets[0] : null);
    if (!sectionId) Err(400, 'Choose a target section for this grade');
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
      source!.teacherId!, source!.subjectId!, source!,
    );
    await this.years.resolveRecord(eligibility.academicYearId, undefined, user.role);
    if (!eligibility.hasDatedEnrollment) {
      await this.gradeValidator.ensureStudentInSection(gradeDetails.studentId, sectionId);
    }
    await this.gradeValidator.ensureTeacherAssignmentExists(
      source!.teacherId!, source!.subjectId!, sectionId,
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
    const existing = await this.getById(id, user.role);
    await this.ensureTeacherOwnsSource(user, existing.teacher?.id);

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

    return await this.getById(id, user.role);
  }

  async delete(id: string, role?: string) {
    await this.getById(id, role);
    return await this.gradeRepository.delete(id);
  }

  async deleteAll() {
    return await this.gradeRepository.deleteAll();
  }

  async deleteBulk(ids: string[], role?: string) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id, role))
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
