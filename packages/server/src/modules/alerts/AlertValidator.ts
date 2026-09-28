import { Service, Err, I18n, t } from '../../najm';
import { SCHOOL_WIDE_ROLES } from '../../auth';
import { AlertRepository } from './AlertRepository';
import { isAboutSomeone } from './AlertGuards';
import { StudentRepository } from '../students/StudentRepository';
import { TeacherRepository } from '../teachers/TeacherRepository';
import { ClassRepository } from '../classes/ClassRepository';
import { SubjectRepository } from '../subjects/SubjectRepository';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { AcademicYearRepository } from '../academicYears/AcademicYearRepository';
import { alertYearScope } from './alertYearPolicy';
import type { CreateAlertDto, UpdateAlertStatusDto } from './AlertDto';

export type AlertActor = {
  id: string;
  role?: string | null;
};

const isStaff = (actor: AlertActor) => SCHOOL_WIDE_ROLES.includes(actor.role ?? '');

@Service()
export class AlertValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('alerts.errors') private at!: (key: string) => string;

  constructor(
    private alertRepository: AlertRepository,
    private studentRepository: StudentRepository,
    private teacherRepository: TeacherRepository,
    private classRepository: ClassRepository,
    private subjectRepository: SubjectRepository,
    private academicYearRepository: AcademicYearRepository,
  ) { }

  async ensureAlertExists(id: string) {
    const alert = await this.alertRepository.getById(id);
    if (!alert) {
      Err(404, this.at('notFound'));
    }
    return alert;
  }

  /**
   * Status is one value shared by everyone who reads the alert. Staff set it
   * on any alert they can read. A teacher sets it on an alert about one of
   * their students or themselves; a parent or student may only acknowledge
   * one about their child or themselves. Class and school notices stay with
   * staff, so one family cannot close a notice for everybody.
   */
  ensureCanHandle(alert: Parameters<typeof isAboutSomeone>[0], status: UpdateAlertStatusDto['status'], actor: AlertActor) {
    if (isStaff(actor)) return;
    if (!isAboutSomeone(alert)) Err(403, this.at('sharedNoticeStaffOnly'));
    if (actor.role !== 'teacher' && status !== 'acknowledged') Err(403, this.at('acknowledgeOnly'));
  }

  /** Teachers, parents and students handle an alert's status; its content is staff's. */
  ensureCanEdit(actor: AlertActor) {
    if (!isStaff(actor)) Err(403, this.at('editStaffOnly'));
  }

  async ensureStudentExists(studentId: string) {
    if (!studentId) return;

    const student = await this.studentRepository.getById(studentId);
    if (!student) {
      Err(404, t('students.errors.notFound'));
    }
    return student;
  }

  async ensureTeacherExists(teacherId: string) {
    if (!teacherId) return;

    const teacher = await this.teacherRepository.getById(teacherId);
    if (!teacher) {
      Err(404, t('teachers.errors.notFound'));
    }
    return teacher;
  }

  async ensureClassExists(classId: string) {
    if (!classId) return;

    const classEntity = await this.classRepository.getById(classId);
    if (!classEntity) {
      Err(404, t('classes.errors.notFound'));
    }
    return classEntity;
  }

  async ensureSubjectExists(subjectId: string) {
    if (!subjectId) return;

    const subject = await this.subjectRepository.getById(subjectId);
    if (!subject) {
      Err(404, t('subjects.errors.notFound'));
    }
    return subject;
  }

  async ensureNoDuplicateActiveAlertInScope(
    type: string,
    yearId: string | null,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    const existingAlert = await this.alertRepository.checkDuplicateAlertInScope(
      type,
      yearId,
      studentId,
      teacherId,
      classId,
      subjectId,
    );

    if (existingAlert) {
      Err(409, this.at('duplicateActiveAlert'));
    }

    return existingAlert;
  }

  async ensureYearScope(data: CreateAlertDto) {
    const scope = alertYearScope(data);
    if (scope === 'invalid') Err(400, 'This alert type cannot have academic targets');
    if (data.studentId) {
      await this.ensureStudentExists(data.studentId);
      if (!(await this.alertRepository.hasStudentEnrollment(data.studentId))) {
        Err(409, 'Student is not enrolled in the selected academic year');
      }
    }
    if (data.classId) {
      await this.ensureClassExists(data.classId);
      if (!(await this.alertRepository.classBelongsToYear(data.classId))) {
        Err(409, 'Class does not belong to the selected academic year');
      }
      if (data.studentId && !(await this.alertRepository.studentWasPlacedInClass(data.studentId, data.classId))) {
        Err(409, 'Student has no placement in that class for the selected academic year');
      }
    }
    if (data.teacherId) await this.ensureTeacherExists(data.teacherId);
    if (data.subjectId) await this.ensureSubjectExists(data.subjectId);
    return scope === 'shared' ? null : this.year.id;
  }

  async ensureScopeUnchanged(storedYearId: string | null, nextYearId: string | null) {
    if (storedYearId !== nextYearId) Err(409, 'Alert year scope cannot be changed by an update');
  }

  async ensureFeeSource(feeId: string, studentId: string) {
    const fee = await this.alertRepository.findFeeSource(feeId);
    if (!fee) Err(404, 'Fee source not found');
    if (fee!.studentId !== studentId) Err(409, 'Fee source belongs to another student');
    const year = await this.academicYearRepository.findByLabel(fee!.yearLabel);
    if (!year) Err(409, 'Fee source has no registered academic year');
    return year!;
  }

  async checkAlertExists(id: string) {
    return this.ensureAlertExists(id);
  }

  async checkStudentExists(studentId: string) {
    return this.ensureStudentExists(studentId);
  }

  async checkTeacherExists(teacherId: string) {
    return this.ensureTeacherExists(teacherId);
  }

  async checkClassExists(classId: string) {
    return this.ensureClassExists(classId);
  }

  async checkSubjectExists(subjectId: string) {
    return this.ensureSubjectExists(subjectId);
  }

  async checkDuplicateAlertInScope(
    type: string,
    yearId: string | null,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    return this.ensureNoDuplicateActiveAlertInScope(type, yearId, studentId, teacherId, classId, subjectId);
  }
}
