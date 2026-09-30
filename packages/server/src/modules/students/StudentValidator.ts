import { Service, Err, I18n } from '../../najm';
import { StudentRepository } from './StudentRepository';
import { UserValidator } from '../../auth';
import { ClassValidator } from '../classes/ClassValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';
import { isDateOnly } from '@sms/contracts/academic-years';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { CreateStudentDto, UpdateStudentDto } from './StudentDto';

type ExistingStudent = NonNullable<Awaited<ReturnType<StudentRepository['getById']>>>;

@Service()
export class StudentValidator {
  ensureCorrectionActor(): never {
    return Err(403, this.st('correctionRequiresAdmin'));
  }
  @I18n('students.errors') private st!: (key: string) => string;

  constructor(
    private studentRepository: StudentRepository,
    private userValidator: UserValidator,
    private classValidator: ClassValidator,
    private sectionValidator: SectionValidator,
    private studentEnrollments: StudentEnrollmentRepository,
  ) { }

  ensureRosterDateWithinYear(onDate: string, year: ResolvedAcademicYear) {
    if (onDate < year.reportingStartsOn || onDate > year.reportingEndsOn) {
      Err(400, this.st('dateOutsideYear'));
    }
  }

  ensureCreateAllowed(data: CreateStudentDto) {
    if (data.status && data.status !== 'active') {
      Err(422, this.st('createActiveFirst'));
    }
    if (isDateOnly(data.enrollmentDate) && data.yearEnrolledOn < data.enrollmentDate) {
      Err(422, this.st('beforeAdmission'));
    }
  }

  async ensureProfileUpdateAllowed(student: ExistingStudent, data: UpdateStudentDto) {
    if (
      (data.classId !== undefined && data.classId !== student.classId) ||
      (data.sectionId !== undefined && data.sectionId !== student.sectionId) ||
      (data.status !== undefined && data.status !== student.status)
    ) {
      Err(409, this.st('useEnrollmentOperations'));
    }
    if (data.enrollmentDate !== undefined && data.enrollmentDate !== student.enrollmentDate) {
      const earliest = await this.studentEnrollments.earliestEnrolledOn(student.id);
      if (earliest && (!isDateOnly(data.enrollmentDate) || data.enrollmentDate > earliest)) {
        Err(422, this.st('admissionAfterEnrollment'));
      }
    }
  }

  async ensureCanDelete(id: string) {
    if (await this.studentEnrollments.hasAnyForStudent(id)) {
      Err(409, this.st('hasEnrollmentHistory'));
    }
  }

  async ensureCanDeleteAll() {
    if (await this.studentEnrollments.hasAny()) {
      Err(409, this.st('historyRetained'));
    }
  }

  handleBulkCreateFailure(error: unknown, studentData: CreateStudentDto, index: number) {
    if ((error as { status?: unknown } | null)?.status === 409) return;
    const identifier = studentData.studentCode || studentData.id || studentData.name || `at index ${index}`;
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create student ${identifier}: ${message}`);
  }

  async ensureUserIdUnique(id: string) {
    await this.userValidator.checkUserIdIsUnique(id);
  }

  async ensureIdUnique(id: string) {
    const existingStudent = await this.studentRepository.getById(id);
    if (existingStudent) {
      Err(409, this.st('idExists'));
    }
  }

  async ensureExists(id: string) {
    const studentExists = await this.studentRepository.getById(id);
    if (!studentExists) {
      Err(404, this.st('notFound'));
    }
    return studentExists;
  }

  async ensureCodeExists(studentCode: string) {
    const student = await this.studentRepository.getByStudentCode(studentCode);
    if (!student) {
      Err(404, this.st('notFound'));
    }
    return student;
  }

  async ensureEmailExists(email: string) {
    const student = await this.studentRepository.getByEmail(email);
    if (!student) {
      Err(404, this.st('notFound'));
    }
    return student;
  }

  async ensurePhoneExists(phone: string) {
    const student = await this.studentRepository.getByPhone(phone);
    if (!student) {
      Err(404, this.st('notFound'));
    }
    return student;
  }

  async ensureCodeUnique(studentCode?: string, excludeId?: string) {
    if (!studentCode) return;
    const existingStudent = await this.studentRepository.getByStudentCode(studentCode);
    if (existingStudent && existingStudent.id !== excludeId) {
      Err(409, this.st('studentCodeExists'));
    }
  }

  async ensureEmailUnique(email?: string, excludeId?: string) {
    if (!email) return;
    const existingStudent = await this.studentRepository.getByEmail(email);
    if (existingStudent && existingStudent.id !== excludeId) {
      Err(409, this.st('emailExists'));
    }
  }

  async ensurePhoneUnique(phone?: string, excludeId?: string) {
    if (!phone) return;
    const existingStudent = await this.studentRepository.getByPhone(phone);
    if (existingStudent && existingStudent.id !== excludeId) {
      Err(409, this.st('phoneExists'));
    }
  }

  async ensureInSection(studentId: string, sectionId: string) {
    await this.sectionValidator.ensureExists(sectionId);
    const student = await this.ensureExists(studentId);
    if (student.sectionId !== sectionId) {
      Err(409, this.st('notInSection'));
    }
  }

  async ensureClassAndSectionValid(classId?: string, sectionId?: string, className?: string, sectionName?: string) {
    if (classId || className) {
      await this.classValidator.ensureClassId(classId, className);
    }
    if (sectionId || sectionName) {
      await this.sectionValidator.ensureSectionInClass(sectionId, sectionName, classId, className);
    }
  }

  async checkUserIdIsUnique(id: string) {
    return this.ensureUserIdUnique(id);
  }

  async checkIdIsUnique(id: string) {
    return this.ensureIdUnique(id);
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkCodeExists(studentCode: string) {
    return this.ensureCodeExists(studentCode);
  }

  async checkEmailExists(email: string) {
    return this.ensureEmailExists(email);
  }

  async checkPhoneExists(phone: string) {
    return this.ensurePhoneExists(phone);
  }

  async checkCodeIsUnique(studentCode?: string, excludeId: string = null) {
    return this.ensureCodeUnique(studentCode, excludeId ?? undefined);
  }

  async checkEmailIsUnique(email?: string, excludeId: string = null) {
    return this.ensureEmailUnique(email, excludeId ?? undefined);
  }

  async checkPhoneIsUnique(phone?: string, excludeId: string = null) {
    return this.ensurePhoneUnique(phone, excludeId ?? undefined);
  }

  async checkInSection(studentId: string, sectionId: string) {
    return this.ensureInSection(studentId, sectionId);
  }

  async validate(data, excludeId = null) {
    const { id, userId, studentCode, email, phone, classId, className, sectionId, sectionName } = data;

    if (excludeId) {
      await this.ensureExists(excludeId);
    } else {
      if (userId) await this.ensureUserIdUnique(userId);
      if (id) await this.ensureIdUnique(id);
    }

    if (studentCode) await this.ensureCodeUnique(studentCode, excludeId ?? undefined);
    if (email) await this.ensureEmailUnique(email, excludeId ?? undefined);
    if (phone) await this.ensurePhoneUnique(phone, excludeId ?? undefined);

    await this.ensureClassAndSectionValid(classId, sectionId, className, sectionName);
    return data;
  }
}
