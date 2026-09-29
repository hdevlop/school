import { Service, Transaction } from '../../najm';
import { StudentEnrollmentValidator } from './StudentEnrollmentValidator';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { SettingsRepository } from '../settings/SettingsRepository';
import { AcademicYearMigrationIssueRepository } from '../academicYearMigrationIssues/AcademicYearMigrationIssueRepository';
import { StudentEnrollmentRepository } from './StudentEnrollmentRepository';
import type { CorrectEnrollmentDto, CreateEnrollmentDto, EndEnrollmentDto, TransferEnrollmentDto } from './StudentEnrollmentDto';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';

@Service()
export class StudentEnrollmentService {
  @Year() private readonly year!: ResolvedAcademicYear;
  constructor(
    private enrollments: StudentEnrollmentRepository,
    private years: AcademicYearValidator,
    private settings: SettingsRepository,
    private migrationIssues: AcademicYearMigrationIssueRepository,
    private validator: StudentEnrollmentValidator,
  ) {}

  @Transaction()
  async clearForSeedReset() {
    return this.enrollments.clearForSeedReset();
  }

  async listByStudent(studentId: string) {
    const student = await this.enrollments.getStudent(studentId);
    this.validator.ensureStudentExists(student);
    const annualRecords = await this.enrollments.listHistoryByStudent(studentId);
    return Promise.all(annualRecords.map(async (record) => ({
      ...record,
      placements: await this.enrollments.listNamedPlacements(record.id),
    })));
  }

  async getById(id: string) {
    const enrollment = this.validator.ensureEnrollmentExists(await this.enrollments.getById(id));
    const placements = await this.enrollments.listPlacements(id);
    return { ...enrollment!, placements };
  }

  async createInSelectedYear(data: CreateEnrollmentDto, actorId: string) {
    this.validator.ensureSelectedYear(data.academicYearId, this.year.id);
    return this.create(data, actorId);
  }

  @Transaction()
  async correct(id: string, data: CorrectEnrollmentDto, actor: { id: string; role: string }, studentId?: string) {
    this.validator.ensureCorrectionAllowed(actor.role);
    const enrollment = this.validator.ensureEnrollmentExists(await this.enrollments.getById(id, true));
    if (studentId && enrollment.studentId !== studentId) this.validator.ensureEnrollmentExists(null);
    const before = await this.enrollments.listPlacements(id);
    const student = this.validator.ensureStudentExists(await this.enrollments.getStudent(enrollment.studentId));
    this.validator.ensureCorrection(enrollment, before, data, this.year, student.enrollmentDate);
    await this.ensurePlacement(this.year.id, data.placement.classId, data.placement.sectionId);
    const settings = await this.settings.getAdminSettings();
    const active = settings?.activeAcademicYearId === this.year.id;
    this.validator.ensureActiveEnrollmentDate(data.enrolledOn, active);
    this.validator.ensureActiveTransferDate(data.placement.validFrom, active);
    if (data.leftOn) this.validator.ensureActiveEndDate(data.leftOn, active);
    const corrected = await this.enrollments.correct(id, data, actor.id);
    this.validator.ensureDatedRecordsRemainValid(await this.enrollments.hasInvalidDatedRecords(enrollment.studentId));
    const placements = await this.enrollments.listPlacements(id);
    await this.enrollments.auditCorrection(id, actor.id, actor.role, data.reason,
      { ...enrollment, placements: before }, { ...corrected, placements });
    if (active) {
      const latest = placements[0];
      await this.enrollments.updateCurrentStudent(enrollment.studentId, latest.classId, latest.sectionId,
        data.status === 'withdrawn' ? 'inactive' : data.status);
    }
    return { ...corrected, placements };
  }

  private async ensurePlacement(yearId: string, classId: string, sectionId: string) {
    const year = await this.years.requireId(yearId);
    this.validator.ensurePlacementYear(year.status);
    const placement = this.validator.ensureClassSection(await this.enrollments.getClassAndSection(classId, sectionId));
    this.validator.ensureClassYear(placement.academicYear, year.label);
    return year;
  }

  async resolveNewStudentPlacement(classId: string, sectionId: string, enrolledOn: string) {
    this.validator.ensureNewEnrollmentDate(enrolledOn);
    const placement = this.validator.ensureClassSection(await this.enrollments.getClassAndSection(classId, sectionId));
    const year = await this.years.requireLabel(placement!.academicYear);
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureNewStudentYear(year, settings?.activeAcademicYearId, enrolledOn);
    return year;
  }

  /** Trusted demo setup uses the selected year without activating it. */
  async resolveSeedStudentPlacement(classId: string, sectionId: string, enrolledOn: string) {
    this.validator.ensureNewEnrollmentDate(enrolledOn);
    const year = await this.ensurePlacement(this.year.id, classId, sectionId);
    this.validator.ensureEnrollmentInYear(enrolledOn, year);
    return year;
  }

  async hasAnyForStudent(studentId: string) {
    return this.enrollments.hasAnyForStudent(studentId);
  }

  async earliestEnrolledOn(studentId: string) {
    return this.enrollments.earliestEnrolledOn(studentId);
  }

  async hasAny() {
    return this.enrollments.hasAny();
  }

  /**
   * When the target year becomes active, each student's current class,
   * section and status (the copy that reads without a year and the teacher's
   * current-section rules use) follow it. A student enrolled in the target
   * takes that enrollment's latest placement and status. A student the
   * transition graduated, withdrew or left out keeps the last class, which the
   * columns require, and becomes graduated or inactive. A student still
   * enrolled at the end of the active year with neither refuses the switch,
   * before anything changes.
   */
  async projectActiveYear(
    sourceYearId: string,
    targetYearId: string,
    dispositions: Array<{ studentId: string; outcome: 'graduate' | 'withdraw' | 'omit' }>,
  ) {
    const [source, target] = await Promise.all([
      this.enrollments.listAnnualRoster(sourceYearId),
      this.enrollments.listAnnualRoster(targetYearId),
    ]);
    const unplaced = target.filter((record) => !record.lastPlacement);
    this.validator.ensureProjectionPlacements(unplaced.length);
    const enrolled = new Set(target.map((record) => record.student.id));
    const decided = new Map(dispositions.map((item) => [item.studentId, item.outcome]));
    const undecided = source.filter((record) => !record.enrollment.leftOn &&
      !enrolled.has(record.student.id) && !decided.has(record.student.id));
    this.validator.ensureProjectionOutcomes(undecided.length);

    let placed = 0;
    for (const record of target) {
      const status = record.enrollment.status as 'active' | 'withdrawn' | 'graduated' | 'transferred';
      await this.enrollments.updateCurrentStudent(
        record.student.id, record.lastPlacement!.classId, record.lastPlacement!.sectionId,
        status === 'withdrawn' ? 'inactive' : status,
      );
      placed++;
    }
    let ended = 0;
    for (const [studentId, outcome] of decided) {
      if (enrolled.has(studentId)) continue;
      await this.enrollments.updateCurrentStudentStatus(studentId, outcome === 'graduate' ? 'graduated' : 'inactive');
      ended++;
    }
    return { placed, ended };
  }

  @Transaction()
  async create(data: CreateEnrollmentDto, actorId: string) {
    const year = await this.ensurePlacement(data.academicYearId, data.classId, data.sectionId);
    this.validator.ensureEnrollmentInYear(data.enrolledOn, year);
    const student = this.validator.ensureStudentExists(await this.enrollments.getStudent(data.studentId));
    this.validator.ensureAdmissionDate(data.enrolledOn, student.enrollmentDate);
    this.validator.ensureEnrollmentUnique(await this.enrollments.getByStudentAndYear(data.studentId, year.id));
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureActiveEnrollmentDate(data.enrolledOn, settings?.activeAcademicYearId === year.id);
    if (settings?.activeAcademicYearId === year.id && student!.classId && student!.sectionId &&
      (student!.classId !== data.classId || student!.sectionId !== data.sectionId) &&
      !await this.enrollments.hasRecordedPlacement(data.studentId, student!.classId, student!.sectionId)) {
      await this.migrationIssues.recordUnknownEnrollmentDate(student!);
    }
    const enrollment = await this.enrollments.create({
      studentId: data.studentId,
      academicYearId: year.id,
      status: 'active',
      enrolledOn: data.enrolledOn,
      createdBy: actorId,
      updatedBy: actorId,
    });
    const placement = await this.enrollments.addPlacement({
      enrollmentId: enrollment.id,
      classId: data.classId,
      sectionId: data.sectionId,
      validFrom: data.enrolledOn,
      reason: 'Initial enrollment',
      actorId,
    });
    if (settings?.activeAcademicYearId === year.id) {
      await this.enrollments.updateCurrentStudent(
        data.studentId, data.classId, data.sectionId,
        'active',
      );
    }
    return { ...enrollment, placements: [placement] };
  }

  @Transaction()
  async transfer(id: string, data: TransferEnrollmentDto, actorId: string) {
    const enrollment = this.validator.ensureEnrollmentExists(await this.enrollments.getById(id, true));
    this.validator.ensureTransferable(enrollment.leftOn);
    const year = await this.ensurePlacement(enrollment!.academicYearId, data.classId, data.sectionId);
    this.validator.ensureTransferDate(data.validFrom, enrollment.enrolledOn, year.reportingEndsOn);
    const current = this.validator.ensureTransferPlacement(await this.enrollments.getOpenPlacement(id), data);
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureActiveTransferDate(data.validFrom, settings?.activeAcademicYearId === year.id);
    await this.enrollments.closePlacement(current!.id, data.validFrom);
    const placement = await this.enrollments.addPlacement({
      enrollmentId: id,
      classId: data.classId,
      sectionId: data.sectionId,
      validFrom: data.validFrom,
      reason: data.reason,
      actorId,
    });
    if (settings?.activeAcademicYearId === year.id) {
      await this.enrollments.updateCurrentStudent(enrollment!.studentId, data.classId, data.sectionId, 'active');
    }
    return placement;
  }

  @Transaction()
  async end(id: string, data: EndEnrollmentDto, actorId: string) {
    const enrollment = this.validator.ensureEnrollmentExists(await this.enrollments.getById(id, true));
    this.validator.ensureCanEnd(enrollment.leftOn);
    const year = await this.years.requireId(enrollment!.academicYearId);
    this.validator.ensureEndDate(data.leftOn, enrollment.enrolledOn, year);
    const current = this.validator.ensureEndPlacement(await this.enrollments.getOpenPlacement(id), data.leftOn);
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureActiveEndDate(data.leftOn, settings?.activeAcademicYearId === year.id);
    await this.enrollments.closePlacement(current!.id, data.leftOn);
    const ended = await this.enrollments.endEnrollment(id, data.leftOn, data.status, actorId);
    if (settings?.activeAcademicYearId === year.id) {
      await this.enrollments.updateCurrentStudent(
        enrollment!.studentId, current!.classId, current!.sectionId,
        data.status === 'withdrawn' ? 'inactive' : data.status,
      );
    }
    return ended;
  }
}
