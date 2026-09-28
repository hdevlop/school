import { Service, Transaction, Events, EventService } from '../../najm';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import type {CreateStudentDto, CreateStudentsBulkDto, UpdateStudentDto,} from './StudentDto';
import { StudentRouteService } from '../transport/studentRoutes/StudentRouteService';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { resolveUserPassword, isSeeding } from '../../shared/userPassword';
import { FeeService } from '../financial/fees/FeeService';
import { ParentService } from '../parents/ParentService';
import { StudentRepository } from './StudentRepository';
import { calculateAge, pickProps } from '../../shared';
import { StudentValidator } from './StudentValidator';
import { AuthService, UserService } from '../../auth';
import { StorageService } from 'najm-storage';
import { nanoid } from 'nanoid';

@Service()
export class StudentService {
  @Events() private events!: EventService;

  constructor(
    private studentRepository: StudentRepository,
    private studentValidator: StudentValidator,
    private userService: UserService,
    private authService: AuthService,
    private parentService: ParentService,
    private feeService: FeeService,
    private studentRouteService: StudentRouteService,
    private studentEnrollments: StudentEnrollmentService,
    private storage: StorageService,
  ) { }

  async getCount(year: ResolvedAcademicYear) {
    return this.studentRepository.getCount(year.id);
  }

  async getStudentsByGender(year: ResolvedAcademicYear) {
    return this.studentRepository.getStudentsByGender(year.id);
  }

  async getAll(year: ResolvedAcademicYear, onDate?: string) {
    if (onDate) this.studentValidator.ensureRosterDateWithinYear(onDate, year);
    return this.studentRepository.getAll({ academicYearId: year.id, onDate });
  }

  async getById(id: string, year: ResolvedAcademicYear) {
    const student = await this.studentValidator.ensureExists(id);
    const [enrolled] = await this.studentRepository.getAll({ academicYearId: year.id, studentId: id });
    return enrolled ?? {
      ...student,
      classId: null,
      sectionId: null,
      class: null,
      section: null,
      enrollment: null,
      placement: null,
    };
  }

  /** The student through ownership, independent of any year; 404 when not readable. */
  async ensureReadable(id: string) {
    return this.studentValidator.ensureExists(id);
  }

  async getParents(id: string) {
    await this.studentValidator.ensureExists(id);
    return this.studentRepository.getParentsByStudentId(id);
  }

  async getEnrollments(id: string) {
    await this.studentValidator.ensureExists(id);
    return this.studentEnrollments.listByStudent(id);
  }

  @Transaction()
  async create(data: CreateStudentDto, actorId?: string) {
    const parentsToProcess = [
      ...(data.parents || []),
      ...(data.parentIds || [])
    ];

    if (data.userId) await this.studentValidator.ensureUserIdUnique(data.userId);
    if (data.id) await this.studentValidator.ensureIdUnique(data.id);
    await this.studentValidator.ensureCodeUnique(data.studentCode);
    await this.studentValidator.ensureEmailUnique(data.email);
    await this.studentValidator.ensurePhoneUnique(data.phone ?? undefined);
    await this.studentValidator.ensureClassAndSectionValid(data.classId, data.sectionId);
    this.studentValidator.ensureCreateAllowed(data);
    const year = await this.studentEnrollments.resolveNewStudentPlacement(
      data.classId, data.sectionId, data.yearEnrolledOn,
    );

    const studentId = data.id || nanoid(5);

    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile('students', data?.image, {
      filePath: `${studentId}_avatar.png`,
      fallback: `/images/student_${genderSuffix}.png`,
    });

    // Seeding passes a password (account created silently, log-in-able);
    // the dashboard passes none, so the student is emailed a set-password invite.
    const user = await this.authService.provisionUser({
      id: data.userId,
      name: data.name,
      email: data.email,
      image,
      role: 'student',
      password: isSeeding() ? resolveUserPassword(data.password) : data.password,
    });

    const student = await this.studentRepository.create({
      id: studentId,
      userId: user.id,
      classId: data.classId,
      sectionId: data.sectionId,
      studentCode: data.studentCode,
      name: data.name,
      phone: data.phone,
      address: data.address,
      addressPlaceId: data.addressPlaceId,
      addressLatitude: data.addressLatitude,
      addressLongitude: data.addressLongitude,
      dateOfBirth: data.dateOfBirth,
      age: calculateAge(data.dateOfBirth),
      gender: data.gender,
      enrollmentDate: data.enrollmentDate,
      medicalConditions: data.medicalConditions,
      previousSchool: data.previousSchool,
      status: data.status,
    });

    await this.studentEnrollments.create({
      studentId: student.id,
      academicYearId: year.id,
      classId: data.classId,
      sectionId: data.sectionId,
      enrolledOn: data.yearEnrolledOn,
    }, actorId || user.id);

    await this.parentService.processParents(student, parentsToProcess);
    await this.feeService.processFees(student, data.fees as any, { id: actorId || user.id }, data.yearEnrolledOn, year.label);

    if (data.transportAssignment) {
      await this.studentRouteService.assign({
        ...data.transportAssignment,
        studentId: student.id,
        assignedBy: actorId || user.id,
      });
    }

    return student;
  }

  async update(id: string, data: UpdateStudentDto) {
    // No 'password' here. A routine profile edit must not double as a
    // credential reset: that path has no audit, forces no replacement and
    // revokes no session. Recovery goes through the Reset access command.
    const USER_UPDATE_KEYS = [
      'name', 'email', 'image'
    ];

    const STUDENT_UPDATE_KEYS = [
      'name', 'studentCode', 'phone', 'address', 'addressPlaceId',
      'addressLatitude', 'addressLongitude', 'gender',
      'dateOfBirth', 'enrollmentDate', 'graduationDate', 'medicalConditions',
      'status', 'classId', 'sectionId', 'previousSchool'
    ];

    const student = await this.studentValidator.ensureExists(id);
    await this.studentValidator.ensureProfileUpdateAllowed(student, data);
    await this.studentValidator.ensureCodeUnique(data.studentCode, id);
    await this.studentValidator.ensureEmailUnique(data.email, id);
    await this.studentValidator.ensurePhoneUnique(data.phone ?? undefined, id);
    await this.studentValidator.ensureClassAndSectionValid(data.classId, data.sectionId);

    const userData = pickProps(data, USER_UPDATE_KEYS);
    const studentData = pickProps(data, STUDENT_UPDATE_KEYS);

    if (data.image !== undefined) {
      const genderSuffix = data.gender === 'F' ? 'female' : 'male';
      userData.image = await this.storage.processFile('students', data.image, {
        filePath: `${id}_avatar.png`,
        fallback: `/images/student_${genderSuffix}.png`,
      });
    }

    if (studentData.dateOfBirth) {
      (studentData as Record<string, unknown>).age = calculateAge(studentData.dateOfBirth);
    }

    if (Object.keys(userData).length > 0) {
      await this.userService.update(student.userId, userData);
    }
    if (Object.keys(studentData).length > 0) {
      return await this.studentRepository.update(id, studentData);
    }
    return student;
  }

  async delete(id: string) {
    await this.studentValidator.ensureExists(id);
    await this.studentValidator.ensureCanDelete(id);
    const result = await this.studentRepository.delete(id);
    this.storage.delete('students', `${id}_avatar.png`).catch(() => {});
    return result;
  }

  async deleteAll() {
    await this.studentValidator.ensureCanDeleteAll();
    return await this.studentRepository.deleteAll();
  }

  async deleteBulk(ids: string[]) {
    const results = await Promise.all(
      ids.map((currentId) => this.delete(currentId))
    );
    return {
      deletedCount: results.length,
      deletedStudents: results,
      deletedFees: results,
    };
  }

  async createBulk(studentsData: CreateStudentsBulkDto) {
    const createdStudents = [];
    for (const [index, studentData] of studentsData.entries()) {
      try {
        const student = await this.create(studentData);
        createdStudents.push(student);
      } catch (error) {
        this.studentValidator.handleBulkCreateFailure(error, studentData, index);
      }
    }

    return createdStudents;
  }
}
