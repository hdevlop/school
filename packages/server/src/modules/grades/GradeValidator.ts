import { Service, Err, I18n } from '../../najm';
import { GradeRepository } from './GradeRepository';
import { StudentValidator } from '../students/StudentValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { AssessmentValidator } from '../assessments/AssessmentValidator';
import { ExamValidator } from '../exams/ExamValidator';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { academicSourceContextIssue, targetSectionIds, type SectionContext } from '../academicSources/academicSourceContext';
import type { ExamRepository } from '../exams/ExamRepository';

type GradeSourceContext = NonNullable<Awaited<ReturnType<ExamRepository['getSourceContext']>>>;

@Service()
export class GradeValidator {
  @I18n('grades.errors') private gt!: (key: string) => string;
  @Year() private readonly year!: ResolvedAcademicYear;

  constructor(
    private gradeRepository: GradeRepository,
    private studentValidator: StudentValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
    private assessmentValidator: AssessmentValidator,
    private examValidator: ExamValidator,
  ) { }

  /** A grade is recorded in the year the request selected: its source's year must be that one. */
  ensureSelectedYear(yearId: string) {
    if (yearId !== this.year.id) Err(409, this.gt('outsideSelectedYear'));
  }

  async ensureTeacherOwnsSource(user: { id: string; role?: string }, teacherId: string | null | undefined) {
    if (user.role !== 'teacher') return;
    const callerTeacherId = await this.gradeRepository.teacherIdForUser(user.id);
    if (!callerTeacherId || callerTeacherId !== teacherId) {
      Err(403, 'A teacher can grade only their own assessment or exam');
    }
  }

  ensureEligibleGradeSource(data: { assessmentId?: string | null; examId?: string | null }) {
    if (Boolean(data.assessmentId) === Boolean(data.examId)) {
      Err(400, 'A grade needs exactly one assessment or exam');
    }
  }

  ensureSourceExists(source: GradeSourceContext | null | undefined) {
    if (!source) Err(404, 'Grade source not found');
    return source;
  }

  ensureSourceTeachingAssignment(source: GradeSourceContext) {
    if (!source.teacherId || !source.subjectId) Err(409, 'Grade source has no teaching assignment');
    return { teacherId: source.teacherId, subjectId: source.subjectId };
  }

  ensureSourceAssignmentMatches(source: GradeSourceContext, teacherId: string | null, subjectId: string | null) {
    if (source.teacherId !== teacherId || source.subjectId !== subjectId) {
      Err(409, 'Grade teacher and subject must match the source assignment');
    }
  }

  ensureSourceContextResolved(source: GradeSourceContext, sections: Map<string, SectionContext>) {
    const yearLabel = source.classAcademicYear;
    if (!yearLabel) Err(409, 'Grade source has no registered class year');
    const contextIssue = academicSourceContextIssue(source, sections, yearLabel);
    if (contextIssue) Err(409, `Grade source context is unresolved: ${contextIssue}`);
    return yearLabel;
  }

  ensureSourceYearValid(source: GradeSourceContext, year: ResolvedAcademicYear) {
    if (year.status === 'draft') Err(409, 'Grades cannot be recorded in a draft year');
    if (source.academicYearId && source.academicYearId !== year.id) {
      Err(409, 'Grade source registered year conflicts with its assignment');
    }
    if (source.date < year.reportingStartsOn || source.date > year.reportingEndsOn) {
      Err(409, 'Grade source date is outside its academic year');
    }
  }

  ensureSourceTargetsSection(source: GradeSourceContext, sectionId: string) {
    if (!targetSectionIds(source).includes(sectionId)) Err(409, 'Grade section is not targeted by its source');
  }

  ensureDatedPlacement(isPlaced: boolean) {
    if (!isPlaced) Err(409, 'Student has no dated placement in the grade section on the source date');
  }

  ensureTargetSection(sectionId: string | null | undefined) {
    if (!sectionId) Err(400, 'Choose a target section for this grade');
    return sectionId;
  }

  ensureDemoSourceYear(source: GradeSourceContext | null | undefined) {
    if (!source?.academicYearId) Err(409, 'Demo grade source has no registered academic year');
    return source.academicYearId;
  }

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
