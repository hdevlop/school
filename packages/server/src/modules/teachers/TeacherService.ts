import { Service, Transaction, Events, EventService, Err } from '@server/najm';
import { TeacherRepository } from './TeacherRepository';
import { TeacherValidator } from './TeacherValidator';
import { AuthService, UserService } from '@server/auth';
import { StorageService } from 'najm-storage';
import { formatDate, isEmpty, pickProps } from '@server/shared';
import { resolveUserPassword, isSeeding } from '@server/shared/userPassword';
import { nanoid } from 'nanoid';
import { StaffService } from '../staff/StaffService';
import { eq } from 'drizzle-orm';
import { teachers as teachersTable, staff as staffTable } from '@server/database/schema';
import { db } from '@server/database/db';
import type {
  AssignClassDto,
  CreateTeacherDto,
  CreateTeachersBulkDto,
  DeleteBulkTeacherDto,
  TeacherAssignmentDto,
  UnassignClassDto,
  UpdateTeacherDto,
} from './TeacherDto';

@Service()
export class TeacherService {
  @Events() private events!: EventService;


  constructor(
    private teacherRepository: TeacherRepository,
    private teacherValidator: TeacherValidator,
    private userService: UserService,
    private authService: AuthService,
    private storage: StorageService,
    private staffService: StaffService,
  ) { }

  async getAll() {
    return await this.teacherRepository.getAll();
  }

  async getCount() {
    return await this.teacherRepository.getCount();
  }

  async getById(id: string) {
    return this.teacherValidator.ensureExists(id);
  }

  async getByCin(cin: string) {
    return this.teacherValidator.ensureCinExists(cin);
  }

  async getByEmail(email: string) {
    return this.teacherValidator.ensureEmailExists(email);
  }

  async getByPhone(phone: string) {
    return this.teacherValidator.ensurePhoneExists(phone);
  }

  async getBySpecialization(specialization: string) {
    return await this.teacherRepository.getBySpecialization(specialization);
  }

  async getClasses(id: string) {
    await this.teacherValidator.ensureExists(id);
    return await this.teacherRepository.getClasses(id);
  }

  async getStudents(id: string) {
    await this.teacherValidator.ensureExists(id);
    return await this.teacherRepository.getStudents(id);
  }

  async assignSubject(data: { teacherId: string; classId: string; sectionId: string; subjectId: string }) {
    await this.teacherValidator.ensureExists(data.teacherId);
    await this.teacherValidator.ensureAssignmentsValid([{
      classId: data.classId,
      sectionIds: [data.sectionId],
      subjectIds: [data.subjectId],
    }]);

    const existing = await this.teacherRepository.findAssignment(
      data.teacherId, data.sectionId, data.subjectId,
    );
    if (existing) return existing;

    return await this.teacherRepository.createAssignment({
      teacherId: data.teacherId,
      classId: data.classId,
      sectionId: data.sectionId,
      subjectId: data.subjectId,
    });
  }

  async unassignSubject(data: { teacherId: string; sectionId: string; subjectId: string }) {
    await this.teacherValidator.ensureExists(data.teacherId);

    const deleted = await this.teacherRepository.deleteAssignment(
      data.teacherId, data.sectionId, data.subjectId,
    );
    if (!deleted) {
      Err(404, 'Assignment not found');
    }
    return deleted;
  }

  async assignClass(data: AssignClassDto) {
    await this.teacherValidator.ensureExists(data.teacherId);

    const sections = await this.teacherRepository.getClassSections(data.classId);
    await this.teacherValidator.ensureAssignmentsValid([{
      classId: data.classId,
      sectionIds: sections.map((section) => section.id),
      subjectIds: [data.subjectId],
    }]);

    if (isEmpty(sections)) {
      Err(404, 'Class has no sections');
    }

    const assignments = [];
    for (const section of sections) {
      const existing = await this.teacherRepository.findAssignment(
        data.teacherId, section.id, data.subjectId,
      );
      if (existing) {
        assignments.push(existing);
        continue;
      }

      assignments.push(await this.teacherRepository.createAssignment({
        teacherId: data.teacherId,
        classId: data.classId,
        sectionId: section.id,
        subjectId: data.subjectId,
      }));
    }

    return {
      assignedCount: assignments.length,
      assignments,
    };
  }

  async unassignClass(data: UnassignClassDto) {
    await this.teacherValidator.ensureExists(data.teacherId);
    await this.teacherValidator.ensureAssignmentsValid([{
      classId: data.classId,
      sectionIds: [],
      subjectIds: data.subjectId ? [data.subjectId] : [],
    }]);

    const deleted = await this.teacherRepository.deleteAssignmentsForClass(
      data.teacherId,
      data.classId,
      data.subjectId,
    );

    if (isEmpty(deleted)) {
      Err(404, 'Assignment not found');
    }

    return {
      unassignedCount: deleted.length,
      assignments: deleted,
    };
  }

  @Transaction()
  async create(data: CreateTeacherDto) {
    if (data.userId) await this.teacherValidator.ensureUserIdUnique(data.userId);
    if (data.id) await this.teacherValidator.ensureIdUnique(data.id);
    await this.teacherValidator.ensureCinUnique(data.cin);
    await this.teacherValidator.ensureEmailUnique(data.email);
    await this.teacherValidator.ensurePhoneUnique(data.phone);
    await this.teacherValidator.ensureAssignmentsValid(data.assignments);

    const teacherId = data.id || nanoid(5);

    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile('teachers', data?.image, {
      filePath: `${teacherId}_avatar.png`,
      fallback: `/images/teacher_${genderSuffix}.png`,
    });

    // Seeding passes a password (account created silently, log-in-able);
    // the dashboard passes none, so the teacher is emailed a set-password invite.
    const user = await this.authService.provisionUser({
      id: data.userId,
      name: data.name,
      email: data.email,
      image,
      role: 'teacher',
      password: isSeeding() ? resolveUserPassword(data.password) : data.password,
    });

    const staffMember = await this.staffService.create({
      userId: user.id,
      name: data.name,
      email: data.email,
      cin: data.cin,
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      role: 'teacher',
      salary: data.salary,
      compensationMode: data.compensationMode || 'monthly',
      hourlyRate: data.hourlyRate,
      workloadHours: data.workloadHours,
      employmentType: data.employmentType,
      hireDate: formatDate(data.hireDate),
      status: data.status || 'active',
      bankAccount: data.bankAccount != null ? String(data.bankAccount) : undefined,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
    });

    const teacher = await this.teacherRepository.create({
      id: teacherId,
      staffId: staffMember.id,
      specialization: data.specialization,
      yearsOfExperience: data.yearsOfExperience,
      academicDegrees: data.academicDegrees,
    });

    await this.processTeacherAssignments(teacher.id, data.assignments);

    return await this.teacherRepository.getById(teacher.id);
  }

  async update(id: string, data: UpdateTeacherDto) {
    const USER_UPDATE_KEYS = [
      'name', 'email', 'image', 'password'
    ];

    const STAFF_UPDATE_KEYS = [
      'name', 'cin', 'phone', 'address', 'gender', 'salary', 'compensationMode',
      'hourlyRate', 'hireDate', 'bankAccount', 'emergencyContact', 'emergencyPhone',
      'employmentType', 'workloadHours', 'status'
    ];

    const TEACHER_UPDATE_KEYS = [
      'specialization', 'yearsOfExperience', 'academicDegrees'
    ];

    const teacher = await this.teacherValidator.ensureExists(id);
    await this.teacherValidator.ensureCinUnique(data.cin, id);
    await this.teacherValidator.ensureEmailUnique(data.email, id);
    await this.teacherValidator.ensurePhoneUnique(data.phone, id);
    await this.teacherValidator.ensureAssignmentsValid(data.assignments);

    const userData = pickProps(data, USER_UPDATE_KEYS);
    const staffData: Record<string, any> = pickProps(data, STAFF_UPDATE_KEYS);
    const teacherData = pickProps(data, TEACHER_UPDATE_KEYS);
    if (staffData.hireDate !== undefined) staffData.hireDate = formatDate(staffData.hireDate);

    if (data.image !== undefined) {
      const genderSuffix = data.gender === 'F' ? 'female' : 'male';
      userData.image = await this.storage.processFile('teachers', data.image, {
        filePath: `${id}_avatar.png`,
        fallback: `/images/teacher_${genderSuffix}.png`,
      });
    }

    if (Object.keys(userData).length > 0) {
      await this.userService.update(teacher.userId, userData);
    }
    if (Object.keys(staffData).length > 0) {
      await this.staffService.update(teacher.staffId, { ...staffData, role: 'teacher' });
    }
    if (Object.keys(teacherData).length > 0) {
      await this.teacherRepository.update(id, teacherData);
    }
    return await this.teacherRepository.getById(id);
  }

  @Transaction()
  async delete(id: string) {
    const teacher = await this.teacherValidator.ensureExists(id);
    const deletedTeacher = await this.teacherRepository.delete(id);
    if (teacher.staffId) await this.staffService.delete(teacher.staffId);
    this.storage.delete('teachers', `${id}_avatar.png`).catch(() => {});
    return deletedTeacher;
  }

  @Transaction()
  async deleteAll() {
    const linkedStaffIds = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .innerJoin(teachersTable, eq(teachersTable.staffId, staffTable.id));
    const result = await this.teacherRepository.deleteAll();
    for (const { id } of linkedStaffIds) {
      await this.staffService.delete(id);
    }
    return result;
  }

  async createBulk(teachersData: CreateTeachersBulkDto) {
    const createdTeachers = [];

    for (const [index, teacherData] of teachersData.entries()) {
      try {
        const teacher = await this.create(teacherData);
        createdTeachers.push(teacher);
      } catch (error: any) {
        if (error?.status === 409) continue;
        const identifier = teacherData.cin || teacherData.id || teacherData.name || `at index ${index}`;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to create teacher ${identifier}: ${message}`);
      }
    }
    return createdTeachers;
  }

  async deleteBulk(ids: DeleteBulkTeacherDto) {
    const results = await Promise.all(
      ids.map((id) => this.delete(id))
    );
    return {
      deletedCount: results.length,
      deletedTeachers: results,
      deletedFees: results,
    };
  }

  private async processTeacherAssignments(teacherId: string, assignments?: TeacherAssignmentDto[]) {
    if (isEmpty(assignments)) return;

    for (const assignment of assignments) {
      const { classId, sectionIds, subjectIds } = assignment;

      for (const sectionId of sectionIds) {
        for (const subjectId of subjectIds) {
          await this.teacherRepository.createAssignment({
            classId,
            teacherId,
            subjectId,
            sectionId,
          });
        }
      }
    }
  }
}
