import { Service, Transaction, Events, EventService, Inject, TransactionService } from '../../najm';
import { StudentEnrollmentService } from '../studentEnrollments/StudentEnrollmentService';
import type {CreateStudentDto, CreateStudentsBulkDto, ImportStudentDto, UpdateStudentDto, StudentAdmissionDto} from './StudentDto';
import { StudentRouteService } from '../transport/studentRoutes/StudentRouteService';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import { Year } from '../academicYears/requestYear';
import { resolveUserPassword, isSeeding } from '../../shared/userPassword';
import { loginIdentity, loginIdentityUpdate } from '../../shared/loginIdentity';
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
  @Year() private readonly year!: ResolvedAcademicYear;
  @Events() private events!: EventService;
  @Inject(TransactionService) private transactions!: TransactionService;

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

  /** Resolve the authenticated account through this module's owned repository. */
  async getMyIdentity(userId: string) {
    const record = await this.studentRepository.getByUserId(userId);
    return { id: record?.id ?? null, name: record?.name ?? null };
  }

  async getCount() {
    return this.studentRepository.getCount();
  }

  async getStudentsByGender() {
    return this.studentRepository.getStudentsByGender();
  }

  async getAll(onDate?: string) {
    if (onDate) this.studentValidator.ensureRosterDateWithinYear(onDate, this.year);
    return this.studentRepository.getAll({ onDate });
  }

  async getById(id: string) {
    const student = await this.studentValidator.ensureExists(id);
    const [enrolled] = await this.studentRepository.getAll({ studentId: id });
    return enrolled ?? {
      ...student,
      classId: null,
      sectionId: null,
      class: null,
      section: null,
      status: null,
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
  async create(data: CreateStudentDto, actor: { id: string; role: string }) {
    return this.createStudent(data, actor);
  }

  /** Advisory first-step validation; create repeats these checks under its own lock. */
  @Transaction()
  async validateAdmission(data: StudentAdmissionDto) {
    const issues: { field: 'studentCode' | 'sectionId'; message: string }[] = [];
    const check = async (field: 'studentCode' | 'sectionId', run: () => Promise<unknown>) => {
      try { await run(); }
      catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 400 && status !== 409 && status !== 422) throw error;
        issues.push({ field, message: (error as Error).message });
      }
    };
    await check('studentCode', () => this.studentValidator.ensureCodeUnique(data.studentCode));
    await check('sectionId', () => this.studentEnrollments.resolveNewStudentPlacement(data.classId, data.sectionId, data.yearEnrolledOn));
    return { issues };
  }

  @Transaction()
  async createForImport(data: ImportStudentDto, actor: { id: string; role: string }) {
    return this.createStudent(data, actor, undefined, 'import');
  }

  @Transaction()
  async createForSeed(data: CreateStudentDto) {
    if (!isSeeding()) throw new Error('Student demo creation requires seed mode');
    const year = await this.studentEnrollments.resolveSeedStudentPlacement(
      data.classId, data.sectionId, data.yearEnrolledOn,
    );
    // Enrollment actor fields reference a real account, so the newly provisioned
    // student's user remains the fallback actor, as in ordinary seed creation.
    return this.createStudent(data, undefined, year);
  }

  private async createStudent(data: ImportStudentDto, actor?: { id: string; role: string }, seedYear?: ResolvedAcademicYear, source: 'manual' | 'import' = 'manual') {
    // FIX: SEC-001 — authorize and validate before provisioning or file writes.
    if (!(seedYear && isSeeding())) this.studentValidator.ensureNestedCreateAllowed(data, actor);
    const validatedData = this.studentValidator.parseNestedCreate(data, source);
    data = { ...data, ...validatedData };
    const actorId = actor?.id;
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
    const year = seedYear ?? await this.studentEnrollments.resolveNewStudentPlacement(
      data.classId, data.sectionId, data.yearEnrolledOn,
    );

    const studentId = data.id || nanoid(5);

    const genderSuffix = data.gender === 'F' ? 'female' : 'male';
    const image = await this.storage.processFile('students', data?.image, {
      filePath: `${studentId}_avatar.png`,
      fallback: `/images/student_${genderSuffix}.png`,
    });

    // A school record needs no login. Provision only when personal contact
    // details are supplied; guardian contacts belong to the parent account.
    // Seeding passes a password: the account is created active and silently.
    // The dashboard passes none: the account stays pending and the student is
    // emailed an activation link to /reset-password. Choosing a password there
    // verifies the email and activates the account, and while it is pending
    // Reset access re-sends the same invitation instead of a reset mail.
    const password = (isSeeding() ? resolveUserPassword(data.password) : data.password)?.trim();
    const account = {
      id: data.userId,
      name: data.name,
      ...loginIdentity(data),
      image,
      role: 'student',
    };
    const user = account.email || account.phone || password || data.userId
      ? password
        ? await this.authService.provisionUser({ ...account, password })
        : await this.authService.inviteUser({ ...account, status: 'pending' })
      : null;

    const student = await this.studentRepository.create({
      id: studentId,
      userId: user?.id ?? null,
      classId: data.classId,
      sectionId: data.sectionId,
      studentCode: data.studentCode,
      name: data.name,
      arabicName: data.arabicName,
      image,
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

    const enrollment = await this.studentEnrollments.create({
      studentId: student.id,
      academicYearId: year.id,
      classId: data.classId,
      sectionId: data.sectionId,
      enrolledOn: data.yearEnrolledOn,
    }, actorId || user!.id);

    const linkedParents = await this.parentService.processParents(student, parentsToProcess, source);
    await this.feeService.processFees(student, validatedData.fees, actor ?? { id: user!.id }, data.yearEnrolledOn, year.label);

    // Keep fee creation on the original enrollment, then end it atomically.
    if (source === 'import' && data.departure) {
      await this.studentEnrollments.end(enrollment.id, data.departure, actorId!);
    }

    if (data.transportAssignment) {
      await this.studentRouteService.assign({
        ...data.transportAssignment,
        studentId: student.id,
        assignedBy: actorId || user.id,
      });
    }

    // Only invited accounts carry `emailSent`: the student's own, and one per
    // parent created alongside. The dashboard says which activation mails left.
    return {
      ...student,
      ...(user && 'emailSent' in user ? { emailSent: user.emailSent } : {}),
      parentInvitations: linkedParents?.invitations ?? [],
    };
  }

  @Transaction()
  async update(id: string, data: UpdateStudentDto, actor?: { id: string; role: string }) {
    // No 'password' here. A routine profile edit must not double as a
    // credential reset: that path has no audit, forces no replacement and
    // revokes no session. Recovery goes through the Reset access command.
    const USER_UPDATE_KEYS = [
      'name', 'image'
    ];

    const STUDENT_UPDATE_KEYS = [
      'name', 'arabicName', 'studentCode', 'phone', 'address', 'addressPlaceId',
      'addressLatitude', 'addressLongitude', 'gender',
      'dateOfBirth', 'enrollmentDate', 'graduationDate', 'medicalConditions',
      'previousSchool', 'image'
    ];

    const student = await this.studentValidator.ensureExists(id);
    await this.studentValidator.ensureProfileUpdateAllowed(student, data);
    if (data.enrollmentCorrection) {
      if (!actor) this.studentValidator.ensureCorrectionActor();
      await this.studentEnrollments.correct(data.enrollmentCorrection.enrollmentId, data.enrollmentCorrection, actor!, id);
    }
    await this.studentValidator.ensureCodeUnique(data.studentCode, id);
    await this.studentValidator.ensureEmailUnique(data.email, id);
    await this.studentValidator.ensurePhoneUnique(data.phone ?? undefined, id);
    await this.studentValidator.ensureClassAndSectionValid(data.classId, data.sectionId);

    const userData = { ...pickProps(data, USER_UPDATE_KEYS), ...loginIdentityUpdate(data, student) };
    const studentData = pickProps(data, STUDENT_UPDATE_KEYS);

    if (data.image !== undefined) {
      const genderSuffix = data.gender === 'F' ? 'female' : 'male';
      userData.image = await this.storage.processFile('students', data.image, {
        filePath: `${id}_avatar.png`,
        fallback: `/images/student_${genderSuffix}.png`,
      });
      studentData.image = userData.image;
    }

    if (studentData.dateOfBirth) {
      (studentData as Record<string, unknown>).age = calculateAge(studentData.dateOfBirth);
    }

    if (student.userId && Object.keys(userData).length > 0) {
      await this.userService.update(student.userId, userData);
    } else if (!student.userId) {
      const identity = loginIdentity({ ...student, ...data });
      if (identity.email || identity.phone) {
        const user = await this.authService.inviteUser({
          ...identity, name: data.name ?? student.name,
          image: userData.image ?? student.image, role: 'student', status: 'pending',
        });
        Object.assign(studentData, { userId: user.id });
      }
    }
    if (Object.keys(studentData).length > 0) {
      await this.studentRepository.update(id, studentData);
    }
    return this.getById(id);
  }

  @Transaction()
  async delete(id: string) {
    await this.studentRepository.lockForDeletion(id);
    await this.studentValidator.ensureExists(id);
    await this.studentValidator.ensureCanDelete(id);
    const result = await this.studentRepository.delete(id);
    await this.transactions.afterCommit(() =>
      this.storage.delete('students', `${id}_avatar.png`).catch(() => {}));
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

  async createBulk(studentsData: CreateStudentsBulkDto, actor: { id: string; role: string }) {
    return this.createStudents(studentsData, (data) => this.create(data, actor));
  }

  async createBulkForSeed(studentsData: CreateStudentsBulkDto) {
    return this.createStudents(studentsData, (data) => this.createForSeed(data));
  }

  private async createStudents(studentsData: CreateStudentsBulkDto, create: (data: CreateStudentDto) => ReturnType<StudentService['create']>) {
    const createdStudents = [];
    for (const [index, studentData] of studentsData.entries()) {
      try {
        const student = await create(studentData);
        createdStudents.push(student);
      } catch (error) {
        this.studentValidator.handleBulkCreateFailure(error, studentData, index);
      }
    }

    return createdStudents;
  }
}
