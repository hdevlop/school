import { Service, Err, I18n } from '@server/najm';
import { TeacherRepository } from './TeacherRepository';
import { isEmpty } from '@server/shared';
import { UserValidator } from '@server/auth';
import { SectionValidator } from '../sections';
import { ClassValidator } from '../classes';
import { SubjectValidator } from '../subjects';

@Service()
export class TeacherValidator {
  @I18n('teachers.errors') private tt!: (key: string) => string;

  constructor(
    private teacherRepository: TeacherRepository,
    private sectionValidator: SectionValidator,
    private userValidator: UserValidator,
    private classValidator: ClassValidator,
    private subjectValidator: SubjectValidator,
  ) { }

  async ensureUserIdUnique(id: string) {
    await this.userValidator.checkUserIdIsUnique(id);
  }

  async ensureIdUnique(id: string) {
    const existingTeacher = await this.teacherRepository.getById(id);
    if (existingTeacher) {
      Err(409, this.tt('idExists'));
    }
  }

  async ensureCinUnique(cin?: string, excludeId?: string) {
    if (!cin) return;
    const existingTeacher = await this.teacherRepository.getByCin(cin);
    if (existingTeacher && existingTeacher.id !== excludeId) {
      Err(409, this.tt('cinExists'));
    }
  }

  async ensureEmailUnique(email?: string, excludeId?: string) {
    if (!email) return;
    const existingTeacher = await this.teacherRepository.getByEmail(email);
    if (existingTeacher && existingTeacher.id !== excludeId) {
      Err(409, this.tt('emailExists'));
    }
  }

  async ensurePhoneUnique(phone?: string, excludeId?: string) {
    if (!phone) return;
    const existingTeacher = await this.teacherRepository.getByPhone(phone);
    if (existingTeacher && existingTeacher.id !== excludeId) {
      Err(409, this.tt('phoneExists'));
    }
  }

  async ensureExists(id: string) {
    const teacher = await this.teacherRepository.getById(id);
    if (!teacher) {
      Err(404, this.tt('notFound'));
    }
    return teacher;
  }

  async ensureCinExists(cin: string) {
    const teacher = await this.teacherRepository.getByCin(cin);
    if (!teacher) {
      Err(404, this.tt('notFound'));
    }
    return teacher;
  }

  async ensureEmailExists(email: string) {
    const teacher = await this.teacherRepository.getByEmail(email);
    if (!teacher) {
      Err(404, this.tt('notFound'));
    }
    return teacher;
  }

  async ensurePhoneExists(phone: string) {
    const teacher = await this.teacherRepository.getByPhone(phone);
    if (!teacher) {
      Err(404, this.tt('notFound'));
    }
    return teacher;
  }

  async ensureAssignmentsValid(assignments?: Array<{ classId: string; sectionIds: string[]; subjectIds: string[] }>) {
    if (isEmpty(assignments)) return;

    for (const assignment of assignments) {
      const { classId, sectionIds, subjectIds } = assignment;

      await this.classValidator.ensureExists(classId);

      if (!isEmpty(subjectIds)) {
        for (const subjectId of subjectIds) {
          await this.subjectValidator.ensureExists(subjectId);
        }
      }

      if (!isEmpty(sectionIds)) {
        for (const sectionId of sectionIds) {
          await this.sectionValidator.ensureSectionInClass(sectionId, undefined, classId, undefined);
        }
      }
    }
  }

  async ensureInSection(teacherId: string, sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    await this.ensureExists(teacherId);
    const isInSection = await this.teacherRepository.checkInSection(teacherId, sectionId);
    if (!isInSection) {
      Err(409, this.tt('notInSection'));
    }
  }

  async ensureAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    const assignment = await this.teacherRepository.getTeacherAssignment(
      teacherId,
      subjectId,
      sectionId
    );

    if (!assignment) {
      Err(404, this.tt('assignmentNotFound'));
    }
  }

  async ensureAssignmentExistsById(assignmentId: string) {
    const assignment = await this.teacherRepository.getTeacherAssignmentById(assignmentId);

    if (!assignment) {
      Err(404, this.tt('assignmentNotFound'));
    }
  }

  async checkUserIdIsUnique(id: string) {
    return this.ensureUserIdUnique(id);
  }

  async checkIdIsUnique(id: string) {
    return this.ensureIdUnique(id);
  }

  async checkCinIsUnique(cin?: string, excludeId: string = null) {
    return this.ensureCinUnique(cin, excludeId ?? undefined);
  }

  async checkEmailIsUnique(email?: string, excludeId: string = null) {
    return this.ensureEmailUnique(email, excludeId ?? undefined);
  }

  async checkPhoneIsUnique(phone?: string, excludeId: string = null) {
    return this.ensurePhoneUnique(phone, excludeId ?? undefined);
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkCinExists(cin: string) {
    return this.ensureCinExists(cin);
  }

  async checkEmailExists(email: string) {
    return this.ensureEmailExists(email);
  }

  async checkPhoneExists(phone: string) {
    return this.ensurePhoneExists(phone);
  }

  async validateAssignments(assignments?: Array<{ classId: string; sectionIds: string[]; subjectIds: string[] }>) {
    return this.ensureAssignmentsValid(assignments);
  }

  async checkInSection(teacherId: string, sectionId: string) {
    return this.ensureInSection(teacherId, sectionId);
  }

  async checkAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.ensureAssignmentExists(teacherId, subjectId, sectionId);
  }

  async checkAssignmentExistsById(assignmentId: string) {
    return this.ensureAssignmentExistsById(assignmentId);
  }
}
