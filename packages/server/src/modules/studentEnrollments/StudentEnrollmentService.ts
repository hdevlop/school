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

  /** listByStudent for students the caller already read through ownership: two queries in all. */
  async listByStudents(studentIds: string[]) {
    const annualRecords = await this.enrollments.listHistoryByStudents(studentIds);
    const placementRows = await this.enrollments.listNamedPlacementsByEnrollments(annualRecords.map(record => record.id));
    type Placement = Omit<(typeof placementRows)[number], 'enrollmentId'>;
    const placements = new Map<string, Placement[]>();
    for (const { enrollmentId, ...placement } of placementRows) {
      const list = placements.get(enrollmentId);
      if (list) list.push(placement); else placements.set(enrollmentId, [placement]);
    }
    const histories = new Map<string, ((typeof annualRecords)[number] & { placements: Placement[] })[]>(studentIds.map(id => [id, []]));
    for (const record of annualRecords) histories.get(record.studentId)?.push({ ...record, placements: placements.get(record.id) ?? [] });
    return histories;
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
    await this.ensureSectionCapacity(data.placement.sectionId, data.placement.validFrom,
      [data.placement.validTo, data.leftOn].filter((date): date is string => !!date).sort()[0] ?? null,
      { excludeEnrollmentId: id });
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
    await this.enrollments.lockSectionCapacity(sectionId);
    const year = await this.years.requireId(yearId);
    this.validator.ensurePlacementYear(year.status);
    const placement = this.validator.ensureClassSection(await this.enrollments.getClassAndSection(classId, sectionId));
    this.validator.ensureClassYear(placement.academicYear, year.label);
    return year;
  }

  async ensureSectionCapacity(sectionId: string, from: string | null, until: string | null, options: {
    yearId?: string; excludeEnrollmentId?: string; capacity?: number; additionalStudents?: number;
  } = {}) {
    const year = await this.years.requireId(options.yearId ?? this.year.id);
    const section = this.validator.ensureClassSection(await this.enrollments.lockSectionCapacity(sectionId));
    this.validator.ensureClassYear(section.academicYear, year.label);
    const end = new Date(`${year.reportingEndsOn}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const occupied = await this.enrollments.sectionPeakOccupancy(sectionId, year.id,
      from ?? year.reportingStartsOn, until ?? end.toISOString().slice(0, 10), options.excludeEnrollmentId);
    this.validator.ensureSectionCapacity(occupied, options.capacity ?? section.maxStudents, section.name, options.additionalStudents);
  }

  async resolveNewStudentPlacement(classId: string, sectionId: string, enrolledOn: string) {
    this.validator.ensureNewEnrollmentDate(enrolledOn);
    // Reserve the section before inserting a student (and its FK KEY SHARE).
    // The enclosing StudentService transaction retains this lock through save.
    await this.enrollments.lockSectionCapacity(sectionId);
    const placement = this.validator.ensureClassSection(await this.enrollments.getClassAndSection(classId, sectionId));
    const year = await this.years.requireLabel(placement!.academicYear);
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureNewStudentYear(year, settings?.activeAcademicYearId, enrolledOn);
    await this.ensureSectionCapacity(sectionId, enrolledOn, null, { yearId: year.id });
    return year;
  }

  /** Trusted demo setup uses the selected year without activating it. */
  async resolveSeedStudentPlacement(classId: string, sectionId: string, enrolledOn: string) {
    this.validator.ensureNewEnrollmentDate(enrolledOn);
    const year = await this.ensurePlacement(this.year.id, classId, sectionId);
    this.validator.ensureEnrollmentInYear(enrolledOn, year);
    await this.ensureSectionCapacity(sectionId, enrolledOn, null, { yearId: year.id });
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
    await this.ensureSectionCapacity(data.sectionId, data.enrolledOn, null, { yearId: year.id });
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
  async transfer(id: string, data: TransferEnrollmentDto, actorId: string, actorRole?: string) {
    const enrollment = this.validator.ensureEnrollmentExists(await this.enrollments.getById(id, true));
    this.validator.ensureTransferable(enrollment.leftOn);
    const year = await this.ensurePlacement(enrollment!.academicYearId, data.classId, data.sectionId);
    this.validator.ensureTransferDate(data.validFrom, enrollment.enrolledOn, year.reportingEndsOn);
    const current = this.validator.ensureTransferPlacement(await this.enrollments.getOpenPlacement(id), data);
    const settings = await this.settings.getAdminSettings();
    this.validator.ensureActiveTransferDate(data.validFrom, settings?.activeAcademicYearId === year.id);
    // Two date-only placements cannot both start on the same day. Correct
    // the open placement through the existing audited, record-safe path.
    if (data.validFrom === current.validFrom) {
      const placements = await this.enrollments.listPlacements(id);
      const status = enrollment.status as CorrectEnrollmentDto['status'];
      const corrected = await this.correct(id, {
        enrolledOn: enrollment.enrolledOn, leftOn: enrollment.leftOn, status,
        expected: { enrolledOn: enrollment.enrolledOn, leftOn: enrollment.leftOn, status, placements },
        placement: { ...current, classId: data.classId, sectionId: data.sectionId },
        reason: data.reason,
      }, { id: actorId, role: actorRole ?? '' });
      return corrected.placements.find((placement) => placement.id === current.id)!;
    }
    await this.ensureSectionCapacity(data.sectionId, data.validFrom, null, { yearId: year.id, excludeEnrollmentId: id });
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
