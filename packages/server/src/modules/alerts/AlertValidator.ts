import { Service, Err, I18n, t } from '@server/najm';
import { AlertRepository } from './AlertRepository';
import { StudentRepository } from '@server/modules/students/StudentRepository';
import { TeacherRepository } from '@server/modules/teachers/TeacherRepository';
import { ClassRepository } from '@server/modules/classes/ClassRepository';
import { SubjectRepository } from '@server/modules/subjects/SubjectRepository';

@Service()
export class AlertValidator {
  @I18n('alerts.errors') private at!: (key: string) => string;

  constructor(
    private alertRepository: AlertRepository,
    private studentRepository: StudentRepository,
    private teacherRepository: TeacherRepository,
    private classRepository: ClassRepository,
    private subjectRepository: SubjectRepository,
  ) { }

  async ensureAlertExists(id: string) {
    const alert = await this.alertRepository.getById(id);
    if (!alert) {
      Err(404, this.at('notFound'));
    }
    return alert;
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

  async ensureNoDuplicateActiveAlert(
    type: string,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    const existingAlert = await this.alertRepository.checkDuplicateAlert(
      type,
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

  async checkDuplicateAlert(
    type: string,
    studentId?: string,
    teacherId?: string,
    classId?: string,
    subjectId?: string,
  ) {
    return this.ensureNoDuplicateActiveAlert(type, studentId, teacherId, classId, subjectId);
  }
}
