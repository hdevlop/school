import { Service, Transaction, Events, EventService } from '@server/najm';
import { StudentRepository } from './StudentRepository';
import { StudentValidator } from './StudentValidator';
import { AuthService, UserService } from '@server/auth';
import { ParentService } from '../parents/ParentService';
import { FeeService } from '../financial/fees/FeeService';
import { StudentRouteService } from '../transport/studentRoutes/StudentRouteService';
import { StorageService } from 'najm-storage';
import { calculateAge, pickProps } from '@server/shared';
import { resolveUserPassword, isSeeding } from '@server/shared/userPassword';
import { nanoid } from 'nanoid';
import type {
  CreateStudentDto,
  CreateStudentsBulkDto,
  UpdateStudentDto,
} from './StudentDto';

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
    private storage: StorageService,
  ) { }

  async getCount() {
    return await this.studentRepository.getCount();
  }

  async getStudentsByGender() {
    return await this.studentRepository.getStudentsByGender();
  }

  async getAll() {
    return await this.studentRepository.getAll();
  }

  async getById(id: string) {
    return this.studentValidator.ensureExists(id);
  }

  async getParents(id: string) {
    await this.studentValidator.ensureExists(id);
    return this.studentRepository.getParentsByStudentId(id);
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

    await this.parentService.processParents(student, parentsToProcess);
    await this.feeService.processFees(student, data.fees as any, { id: actorId || user.id });

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
    const USER_UPDATE_KEYS = [
      'name', 'email', 'image', 'password'
    ];

    const STUDENT_UPDATE_KEYS = [
      'name', 'studentCode', 'phone', 'address', 'addressPlaceId',
      'addressLatitude', 'addressLongitude', 'gender',
      'dateOfBirth', 'enrollmentDate', 'graduationDate', 'medicalConditions',
      'status', 'classId', 'sectionId', 'previousSchool'
    ];

    const student = await this.studentValidator.ensureExists(id);
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
    const result = await this.studentRepository.delete(id);
    this.storage.delete('students', `${id}_avatar.png`).catch(() => {});
    return result;
  }

  async deleteAll() {
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
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = studentData.studentCode || studentData.id || studentData.name || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create student ${identifier}: ${message}`);
      }
    }

    return createdStudents;
  }
}
