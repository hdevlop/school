import { Err, Service, Transaction } from '../../najm';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { SettingsRepository } from '../settings/SettingsRepository';
import { getBusinessDateOnly } from '../../shared/businessDate';
import { isDateOnly } from '@sms/contracts/academic-years';
import { AcademicYearMigrationIssueRepository } from '../academicYearMigrationIssues/AcademicYearMigrationIssueRepository';
import { StudentEnrollmentRepository } from './StudentEnrollmentRepository';
import type { CreateEnrollmentDto, EndEnrollmentDto, TransferEnrollmentDto } from './StudentEnrollmentDto';

function nextDay(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

@Service()
export class StudentEnrollmentService {
  constructor(
    private enrollments: StudentEnrollmentRepository,
    private years: AcademicYearValidator,
    private settings: SettingsRepository,
    private migrationIssues: AcademicYearMigrationIssueRepository,
  ) {}

  @Transaction()
  async clearForSeedReset() {
    return this.enrollments.clearForSeedReset();
  }

  async listByStudent(studentId: string) {
    const student = await this.enrollments.getStudent(studentId);
    if (!student) Err(404, 'Student not found');
    const annualRecords = await this.enrollments.listHistoryByStudent(studentId);
    return Promise.all(annualRecords.map(async (record) => ({
      ...record,
      placements: await this.enrollments.listNamedPlacements(record.id),
    })));
  }

  async getById(id: string) {
    const enrollment = await this.enrollments.getById(id);
    if (!enrollment) Err(404, 'Enrollment not found');
    const placements = await this.enrollments.listPlacements(id);
    return { ...enrollment!, placements };
  }

  private async ensurePlacement(yearId: string, classId: string, sectionId: string) {
    const year = await this.years.requireId(yearId);
    if (year.status === 'draft') Err(409, 'Draft years only permit academic setup');
    const placement = await this.enrollments.getClassAndSection(classId, sectionId);
    if (!placement) Err(422, 'Section must belong to the selected class');
    if (placement!.academicYear !== year.label) Err(422, 'Class belongs to another academic year');
    return year;
  }

  async resolveNewStudentPlacement(classId: string, sectionId: string, enrolledOn: string) {
    if (!isDateOnly(enrolledOn)) Err(422, 'A real yearly enrollment date is required');
    const placement = await this.enrollments.getClassAndSection(classId, sectionId);
    if (!placement) Err(422, 'Section must belong to the selected class');
    const year = await this.years.requireLabel(placement!.academicYear);
    const settings = await this.settings.getAdminSettings();
    if (!settings?.activeAcademicYearId || settings.activeAcademicYearId !== year.id) {
      Err(409, 'New student placement must belong to the active academic year');
    }
    if (year.status === 'draft' || enrolledOn < year.reportingStartsOn || enrolledOn > year.reportingEndsOn) {
      Err(422, 'Yearly enrollment date must belong to the active academic year');
    }
    if (enrolledOn > getBusinessDateOnly()) {
      Err(422, 'Active-year enrollment cannot start in the future');
    }
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
    if (unplaced.length) {
      Err(409, `${unplaced.length} student(s) of the new year have no placement to project`);
    }
    const enrolled = new Set(target.map((record) => record.student.id));
    const decided = new Map(dispositions.map((item) => [item.studentId, item.outcome]));
    const undecided = source.filter((record) => !record.enrollment.leftOn &&
      !enrolled.has(record.student.id) && !decided.has(record.student.id));
    if (undecided.length) {
      Err(409, `${undecided.length} student(s) of the active year have no enrollment or outcome in the new year`);
    }

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
    if (data.enrolledOn < year.reportingStartsOn || data.enrolledOn > year.reportingEndsOn) {
      Err(422, 'Enrollment date must belong to the selected year');
    }
    const student = await this.enrollments.getStudent(data.studentId);
    if (!student) Err(404, 'Student not found');
    if (student!.enrollmentDate && data.enrolledOn < student!.enrollmentDate) {
      Err(422, 'Yearly enrollment cannot predate the original admission date');
    }
    if (await this.enrollments.getByStudentAndYear(data.studentId, year.id)) {
      Err(409, 'Student is already enrolled in this year');
    }
    const settings = await this.settings.getAdminSettings();
    if (settings?.activeAcademicYearId === year.id && data.enrolledOn > getBusinessDateOnly()) {
      Err(422, 'Active-year enrollment cannot start in the future');
    }
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
    const enrollment = await this.enrollments.getById(id);
    if (!enrollment) Err(404, 'Enrollment not found');
    if (enrollment!.leftOn) Err(409, 'Enrollment has ended');
    const year = await this.ensurePlacement(enrollment!.academicYearId, data.classId, data.sectionId);
    if (data.validFrom <= enrollment!.enrolledOn || data.validFrom > year.reportingEndsOn) {
      Err(422, 'Transfer date is outside the enrollment interval');
    }
    const current = await this.enrollments.getOpenPlacement(id);
    if (!current) Err(409, 'No open placement to transfer');
    if (data.validFrom <= current!.validFrom) Err(422, 'Transfer must occur after the current placement starts');
    if (current!.classId === data.classId && current!.sectionId === data.sectionId) {
      Err(409, 'Student is already in that placement');
    }
    const settings = await this.settings.getAdminSettings();
    if (settings?.activeAcademicYearId === year.id && data.validFrom > getBusinessDateOnly()) {
      Err(422, 'Active-year transfer cannot start in the future');
    }
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
    const enrollment = await this.enrollments.getById(id);
    if (!enrollment) Err(404, 'Enrollment not found');
    if (enrollment!.leftOn) Err(409, 'Enrollment has already ended');
    const year = await this.years.requireId(enrollment!.academicYearId);
    if (year.status === 'draft') Err(409, 'Draft years have no editable enrollments');
    if (data.leftOn <= enrollment!.enrolledOn || data.leftOn > nextDay(year.reportingEndsOn)) {
      Err(422, 'End date is outside the enrollment interval');
    }
    const current = await this.enrollments.getOpenPlacement(id);
    if (!current) Err(409, 'No open placement to end');
    if (data.leftOn <= current!.validFrom) Err(422, 'End date must follow the current placement start');
    const settings = await this.settings.getAdminSettings();
    if (settings?.activeAcademicYearId === year.id && data.leftOn > getBusinessDateOnly()) {
      Err(422, 'Active-year enrollment cannot end in the future');
    }
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
