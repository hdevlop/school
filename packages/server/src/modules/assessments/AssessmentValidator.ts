import { Service, Err, I18n } from '@server/najm';
import { AssessmentRepository } from './AssessmentRepository';
import { StudentValidator } from '../students/StudentValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { ClassValidator } from '../classes/ClassValidator';

@Service()
export class AssessmentValidator {
  @I18n('assessments.errors') private at!: (key: string) => string;

  constructor(
    private assessmentRepository: AssessmentRepository,
    private studentValidator: StudentValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
    private classValidator: ClassValidator,
  ) { }

  async ensureIdUnique(id: string) {
    const existing = await this.assessmentRepository.getById(id);
    if (existing) {
      Err(409, this.at('idExists'));
    }
  }

  async ensureExists(id: string) {
    const assessment = await this.assessmentRepository.getById(id);
    if (!assessment) {
      Err(404, this.at('notFound'));
    }
    return assessment;
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

  async ensureClassExists(classId: string) {
    return this.classValidator.ensureExists(classId);
  }

  async ensureTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.teacherValidator.ensureAssignmentExists(teacherId, subjectId, sectionId);
  }

  async ensureTeacherInSection(teacherId: string, sectionId: string) {
    return this.teacherValidator.ensureInSection(teacherId, sectionId);
  }

  async ensureStudentInSection(studentId: string, sectionId: string) {
    return this.studentValidator.ensureInSection(studentId, sectionId);
  }

  async ensureNotInUse(assessmentId: string) {
    const inUse = await this.assessmentRepository.checkAssessmentInUse(assessmentId);
    if (inUse) {
      Err(409, this.at('inUse'));
    }
  }

  async ensureStudentInAssessment(studentId: string, assessmentId: string) {
    const assessment = await this.assessmentRepository.getById(assessmentId);
    if (!assessment) {
      Err(404, this.at('notFound'));
    }

    const student = await this.studentValidator.ensureExists(studentId);

    const sectionIds = assessment.sectionIds?.length
      ? assessment.sectionIds
      : assessment.section?.id
        ? [assessment.section.id]
        : [];

    if (!sectionIds.length) {
      Err(409, this.at('noSection'));
    }

    if (!sectionIds.includes(student.sectionId)) {
      Err(409, this.at('studentNotInSection'));
    }
  }

  async ensureTeacherAssignmentOrTeacherProvided(data: {
    teacherAssignmentId?: string;
    teacherId?: string;
  }) {
    if (!data.teacherAssignmentId && !data.teacherId) {
      Err(400, this.at('teacherRequired'));
    }
  }

  async ensurePassingMarksValid(passingMarks: number, totalMarks: number) {
    if (passingMarks > totalMarks) {
      Err(400, this.at('passingMarksExceedsTotal'));
    }
  }

  async ensureDateNotTooOld(date: Date, maxYears: number = 1) {
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - maxYears);
    minDate.setHours(0, 0, 0, 0);

    if (date < minDate) {
      Err(400, this.at('dateTooOld'));
    }
  }

  async ensureDateNotTooFarInFuture(date: Date, maxYears: number = 1) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + maxYears);
    maxDate.setHours(23, 59, 59, 999);

    if (date > maxDate) {
      Err(400, this.at('dateTooFarInFuture'));
    }
  }

  async validateAssessmentDate(date: Date) {
    await this.ensureDateNotTooOld(date, 1);
    await this.ensureDateNotTooFarInFuture(date, 1);
  }

  async validate(data, excludeId: string = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.ensureExists(excludeId);
    }

    const {
      id,
      teacherAssignmentId,
      teacherId,
      sectionId,
      subjectId,
      passingMarks,
      totalMarks,
      date,
    } = data;

    if (!isUpdate && id) {
      await this.ensureIdUnique(id);
    }

    if (teacherId) await this.ensureTeacherExists(teacherId);
    if (sectionId) await this.ensureSectionExists(sectionId);
    if (subjectId) await this.ensureSubjectExists(subjectId);

    if (teacherId && sectionId) {
      await this.ensureTeacherInSection(teacherId, sectionId);
    }

    if (teacherAssignmentId) {
      await this.ensureTeacherAssignmentOrTeacherProvided({ teacherAssignmentId, teacherId });
    }

    if (passingMarks !== undefined && totalMarks !== undefined) {
      await this.ensurePassingMarksValid(passingMarks, totalMarks);
    } else if (isUpdate && (passingMarks !== undefined || totalMarks !== undefined)) {
      const assessment = await this.assessmentRepository.getById(excludeId);
      const actualPassingMarks = passingMarks !== undefined ? passingMarks : assessment.passingMarks;
      const actualTotalMarks = totalMarks !== undefined ? totalMarks : assessment.totalMarks;
      await this.ensurePassingMarksValid(actualPassingMarks, actualTotalMarks);
    }

    if (date) {
      await this.validateAssessmentDate(new Date(date));
    }

    return data;
  }

  async checkIdIsUnique(id: string) {
    return this.ensureIdUnique(id);
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
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

  async checkTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
  }

  async checkTeacherInSection(teacherId: string, sectionId: string) {
    return this.ensureTeacherInSection(teacherId, sectionId);
  }

  async checkStudentInSection(studentId: string, sectionId: string) {
    return this.ensureStudentInSection(studentId, sectionId);
  }

  async checkNotInUse(assessmentId: string) {
    return this.ensureNotInUse(assessmentId);
  }

  async checkStudentInAssessment(studentId: string, assessmentId: string) {
    return this.ensureStudentInAssessment(studentId, assessmentId);
  }

  async checkTeacherAssignmentOrTeacherProvided(data: { teacherAssignmentId?: string; teacherId?: string }) {
    return this.ensureTeacherAssignmentOrTeacherProvided(data);
  }

  async checkPassingMarksValid(passingMarks: number, totalMarks: number) {
    return this.ensurePassingMarksValid(passingMarks, totalMarks);
  }
}
