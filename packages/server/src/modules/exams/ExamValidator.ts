import { Service, Err, I18n } from '@server/najm';
import { ExamRepository } from './ExamRepository';
import { StudentValidator } from '../students/StudentValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';

@Service()
export class ExamValidator {
  @I18n('exams.errors') private et!: (key: string) => string;

  constructor(
    private examRepository: ExamRepository,
    private studentValidator: StudentValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
  ) { }

  async ensureIdUnique(id: string) {
    const existing = await this.examRepository.getById(id);
    if (existing) {
      Err(409, this.et('idExists'));
    }
  }

  async ensureExists(id: string) {
    const exam = await this.examRepository.getById(id);
    if (!exam) {
      Err(404, this.et('notFound'));
    }
    return exam;
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

  async ensureTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.teacherValidator.ensureAssignmentExists(teacherId, subjectId, sectionId);
  }

  async ensureTeacherInSection(teacherId: string, sectionId: string) {
    return this.teacherValidator.ensureInSection(teacherId, sectionId);
  }

  async ensureStudentInSection(studentId: string, sectionId: string) {
    return this.studentValidator.ensureInSection(studentId, sectionId);
  }

  async ensureNotInUse(examId: string) {
    const inUse = await this.examRepository.checkExamInUse(examId);
    if (inUse) {
      Err(409, this.et('inUse'));
    }
  }

  async ensureStudentInExam(studentId: string, examId: string) {
    const exam = await this.examRepository.getById(examId);
    if (!exam) {
      Err(404, this.et('notFound'));
    }

    const student = await this.studentValidator.ensureExists(studentId);

    const sectionIds = exam.sectionIds?.length
      ? exam.sectionIds
      : exam.section?.id
        ? [exam.section.id]
        : [];

    if (!sectionIds.length) {
      Err(409, this.et('noSection'));
    }

    if (!sectionIds.includes(student.sectionId)) {
      Err(409, this.et('studentNotInSection'));
    }
  }

  async ensureTeacherAssignmentOrTeacherProvided(data: {
    teacherAssignmentId?: string;
    teacherId?: string;
  }) {
    if (!data.teacherAssignmentId && !data.teacherId) {
      Err(400, this.et('teacherRequired'));
    }
  }

  async ensurePassingMarksValid(passingMarks: number, totalMarks: number) {
    if (passingMarks > totalMarks) {
      Err(400, this.et('passingMarksExceedsTotal'));
    }
  }

  async ensureDateNotTooOld(date: Date, maxMonths: number = 6) {
    const minDate = new Date();
    minDate.setMonth(minDate.getMonth() - maxMonths);
    minDate.setHours(0, 0, 0, 0);

    if (date < minDate) {
      Err(400, this.et('dateTooOld'));
    }
  }

  async ensureDateNotTooFarInFuture(date: Date, maxYears: number = 1) {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + maxYears);
    maxDate.setHours(23, 59, 59, 999);

    if (date > maxDate) {
      Err(400, this.et('dateTooFarInFuture'));
    }
  }

  async ensureEndTimeAfterStartTime(startTime: string, endTime: string) {
    const start = startTime.split(':').map(Number);
    const end = endTime.split(':').map(Number);

    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
      Err(400, this.et('endTimeBeforeStart'));
    }
  }

  async validateExamDate(date: Date) {
    await this.ensureDateNotTooOld(date, 6);
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
      startTime,
      endTime,
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
      const exam = await this.examRepository.getById(excludeId);
      const actualPassingMarks = passingMarks !== undefined ? passingMarks : exam.passingMarks;
      const actualTotalMarks = totalMarks !== undefined ? totalMarks : exam.totalMarks;
      await this.ensurePassingMarksValid(actualPassingMarks, actualTotalMarks);
    }

    if (date) {
      await this.validateExamDate(new Date(date));
    }

    if (startTime && endTime) {
      await this.ensureEndTimeAfterStartTime(startTime, endTime);
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

  async checkNotInUse(examId: string) {
    return this.ensureNotInUse(examId);
  }

  async checkStudentInExam(studentId: string, examId: string) {
    return this.ensureStudentInExam(studentId, examId);
  }

  async checkTeacherAssignmentOrTeacherProvided(data: { teacherAssignmentId?: string; teacherId?: string }) {
    return this.ensureTeacherAssignmentOrTeacherProvided(data);
  }
}
