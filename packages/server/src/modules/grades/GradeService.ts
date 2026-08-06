import { Service } from '@server/najm';
import { GradeRepository } from './GradeRepository';
import { GradeValidator } from './GradeValidator';
import { AssessmentRepository } from '../assessments/AssessmentRepository';
import type { CreateGradeDto, UpdateGradeDto } from './GradeDto';

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

@Service()
export class GradeService {
  constructor(
    private gradeRepository: GradeRepository,
    private gradeValidator: GradeValidator,
    private assessmentRepository: AssessmentRepository,
  ) { }

  async getAll() {
    return await this.gradeRepository.getAll();
  }

  async getById(id: string) {
    return this.gradeValidator.ensureExists(id);
  }

  async getByAssessment(assessmentId: string) {
    await this.gradeValidator.ensureAssessmentExists(assessmentId);
    return await this.gradeRepository.getByAssessment(assessmentId);
  }

  async getByExam(examId: string) {
    await this.gradeValidator.ensureExamExists(examId);
    return await this.gradeRepository.getByExam(examId);
  }

  async getByStudent(studentId: string) {
    await this.gradeValidator.ensureStudentExists(studentId);
    return await this.gradeRepository.getByStudent(studentId);
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

  async getBySection(sectionId: string) {
    await this.gradeValidator.ensureSectionExists(sectionId);
    return await this.gradeRepository.getBySection(sectionId);
  }

  async getBySubject(subjectId: string) {
    await this.gradeValidator.ensureSubjectExists(subjectId);
    return await this.gradeRepository.getBySubject(subjectId);
  }

  async getByTeacher(teacherId: string) {
    await this.gradeValidator.ensureTeacherExists(teacherId);
    return await this.gradeRepository.getByTeacher(teacherId);
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

  async create(data: CreateGradeDto, user: { id: string; teacherId?: string }) {
    const gradeDetails = {
      studentId: data.studentId,
      subjectId: data.subjectId,
      sectionId: data.sectionId,
      teacherId: data.teacherId,
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
    await this.gradeValidator.ensureTeacherExists(gradeDetails.teacherId);
    await this.gradeValidator.ensureSectionExists(gradeDetails.sectionId);
    await this.gradeValidator.ensureSubjectExists(gradeDetails.subjectId);
    await this.gradeValidator.ensureGradeSourceOrTeacherProvided({
      assessmentId: gradeDetails.assessmentId,
      examId: gradeDetails.examId,
      teacherId: gradeDetails.teacherId,
    });
    await this.gradeValidator.ensureNoDuplicateGrade(gradeDetails.studentId, {
      assessmentId: gradeDetails.assessmentId,
      examId: gradeDetails.examId,
    });
    await this.gradeValidator.ensureStudentInSection(gradeDetails.studentId, gradeDetails.sectionId);
    await this.gradeValidator.ensureTeacherInSection(gradeDetails.teacherId, gradeDetails.sectionId);
    if (gradeDetails.assessmentId) {
      await this.gradeValidator.ensureStudentInAssessment(gradeDetails.studentId, gradeDetails.assessmentId);
    }
    if (gradeDetails.examId) {
      await this.gradeValidator.ensureStudentInExam(gradeDetails.studentId, gradeDetails.examId);
    }

    return await this.gradeRepository.create(gradeDetails);
  }

  async update(id: string, data: UpdateGradeDto, user: { id: string; teacherId?: string }) {
    await this.gradeValidator.ensureExists(id);

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
    await this.gradeValidator.ensureExists(id);
    return await this.gradeRepository.delete(id);
  }

  async deleteAll() {
    return await this.gradeRepository.deleteAll();
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
        const gradeEntity = await this.gradeRepository.create(gradeData);
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
