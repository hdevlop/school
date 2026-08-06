import { Service, Err, I18n } from '@server/najm';
import { GradeRepository } from './GradeRepository';
import { StudentValidator } from '../students/StudentValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { AssessmentValidator } from '../assessments/AssessmentValidator';
import { ExamValidator } from '../exams/ExamValidator';

@Service()
export class GradeValidator {
  @I18n('grades.errors') private gt!: (key: string) => string;

  constructor(
    private gradeRepository: GradeRepository,
    private studentValidator: StudentValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
    private assessmentValidator: AssessmentValidator,
    private examValidator: ExamValidator,
  ) { }

  async ensureExists(id: string) {
    const existingGrade = await this.gradeRepository.getById(id);
    if (!existingGrade) {
      Err(404, this.gt('notFound'));
    }
    return existingGrade;
  }

  async ensureGradeIdUnique(id: string) {
    const existingGrade = await this.gradeRepository.getById(id);
    if (existingGrade) {
      Err(409, this.gt('idExists'));
    }
  }

  async ensureStudentExists(studentId: string) {
    return this.studentValidator.ensureExists(studentId);
  }

  async ensureTeacherExists(teacherId: string) {
    return this.teacherValidator.ensureExists(teacherId);
  }

  async ensureSectionExists(sectionId: string) {
    return this.sectionValidator.ensureExists(sectionId);
  }

  async ensureSubjectExists(subjectId: string) {
    return this.subjectValidator.ensureExists(subjectId);
  }

  async ensureAssessmentExists(assessmentId: string) {
    return this.assessmentValidator.checkExists(assessmentId);
  }

  async ensureExamExists(examId: string) {
    return this.examValidator.checkExists(examId);
  }

  async ensureNoDuplicateGrade(studentId: string, source: { assessmentId?: string | null; examId?: string | null }) {
    const existing = await this.gradeRepository.checkGradeExists(studentId, source);
    if (existing) {
      Err(409, this.gt('alreadyExists'));
    }
  }

  async ensureStudentInSection(studentId: string, sectionId: string) {
    return this.studentValidator.ensureInSection(studentId, sectionId);
  }

  async ensureTeacherInSection(teacherId: string, sectionId: string) {
    return this.teacherValidator.ensureInSection(teacherId, sectionId);
  }

  async ensureTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.teacherValidator.ensureAssignmentExists(teacherId, subjectId, sectionId);
  }

  async ensureStudentInAssessment(studentId: string, assessmentId: string) {
    return this.assessmentValidator.checkStudentInAssessment(studentId, assessmentId);
  }

  async ensureStudentInExam(studentId: string, examId: string) {
    return this.examValidator.checkStudentInExam(studentId, examId);
  }

  async ensureSingleGradeSource(data: { assessmentId?: string | null; examId?: string | null }) {
    if (Boolean(data.assessmentId) === Boolean(data.examId)) {
      Err(400, this.gt('sourceRequired'));
    }
  }

  async ensureGradeSourceOrTeacherProvided(data: { assessmentId?: string | null; examId?: string | null; teacherId?: string }) {
    if (!data.assessmentId && !data.examId && !data.teacherId) {
      Err(400, this.gt('assessmentOrTeacherRequired'));
    }
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkGradeIdIsUnique(id: string) {
    return this.ensureGradeIdUnique(id);
  }

  async checkStudentExists(studentId: string) {
    return this.ensureStudentExists(studentId);
  }

  async checkTeacherExists(teacherId: string) {
    return this.ensureTeacherExists(teacherId);
  }

  async checkSectionExists(sectionId: string) {
    return this.ensureSectionExists(sectionId);
  }

  async checkSubjectExists(subjectId: string) {
    return this.ensureSubjectExists(subjectId);
  }

  async checkAssessmentExists(assessmentId: string) {
    return this.ensureAssessmentExists(assessmentId);
  }

  async checkExamExists(examId: string) {
    return this.ensureExamExists(examId);
  }

  async checkDuplicateGrade(studentId: string, source: { assessmentId?: string | null; examId?: string | null }) {
    return this.ensureNoDuplicateGrade(studentId, source);
  }

  async checkStudentInSection(studentId: string, sectionId: string) {
    return this.ensureStudentInSection(studentId, sectionId);
  }

  async checkTeacherInSection(teacherId: string, sectionId: string) {
    return this.ensureTeacherInSection(teacherId, sectionId);
  }

  async checkTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
  }

  async checkStudentInAssessment(studentId: string, assessmentId: string) {
    return this.ensureStudentInAssessment(studentId, assessmentId);
  }

  async checkStudentInExam(studentId: string, examId: string) {
    return this.ensureStudentInExam(studentId, examId);
  }

  async checkGradeSourceOrTeacherProvided(data: { assessmentId?: string | null; examId?: string | null; teacherId?: string }) {
    return this.ensureGradeSourceOrTeacherProvided(data);
  }

  async validate(data, excludeId: string = null) {
    const {
      id,
      studentId,
      assessmentId,
      examId,
      teacherId,
      sectionId,
      subjectId,
    } = data;

    if (excludeId) {
      await this.ensureExists(excludeId);
    } else {
      if (id) await this.ensureGradeIdUnique(id);
      if (studentId && (assessmentId || examId)) {
        await this.ensureNoDuplicateGrade(studentId, { assessmentId, examId });
      }
    }

    if (studentId) await this.ensureStudentExists(studentId);
    if (assessmentId) await this.ensureAssessmentExists(assessmentId);
    if (examId) await this.ensureExamExists(examId);
    if (teacherId) await this.ensureTeacherExists(teacherId);
    if (sectionId) await this.ensureSectionExists(sectionId);
    if (subjectId) await this.ensureSubjectExists(subjectId);

    if (assessmentId || examId || teacherId) {
      await this.ensureGradeSourceOrTeacherProvided({ assessmentId, examId, teacherId });
    }

    if (studentId && sectionId) {
      await this.ensureStudentInSection(studentId, sectionId);
    }

    if (teacherId && sectionId) {
      await this.ensureTeacherInSection(teacherId, sectionId);
    }

    if (studentId && assessmentId) {
      await this.ensureStudentInAssessment(studentId, assessmentId);
    }

    if (studentId && examId) {
      await this.ensureStudentInExam(studentId, examId);
    }

    return data;
  }
}
