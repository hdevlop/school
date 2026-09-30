import { Service, Err, I18n } from '../../najm';
import { AttendanceRepository } from './AttendanceRepository';
import { StudentValidator } from '../students/StudentValidator';
import { StaffValidator } from '../staff/StaffValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';
import { StudentEnrollmentRepository } from '../studentEnrollments/StudentEnrollmentRepository';
import { getBusinessDate } from '../../shared/businessDate';
import { Year } from '../academicYears/requestYear';
import type { ResolvedAcademicYear } from '../academicYears/AcademicYearValidator';
import type { StaffAttendanceRosterItemDto, StudentAttendanceDto } from './AttendanceDto';

function toLocalDateOnly(date: Date | string) {
  if (typeof date === 'string') {
    const [year, month, day] = date.split('-').map(Number);
    if ([year, month, day].every(Number.isFinite)) {
      return new Date(year, month - 1, day);
    }
  }

  const parsedDate = date instanceof Date ? date : new Date(date);
  return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
}

function getLocalToday(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isFutureAttendanceDate(date: Date | string, now: Date = getBusinessDate()) {
  return toLocalDateOnly(date) > getLocalToday(now);
}

export function isAttendanceDateTooOld(date: Date | string, maxDaysOld: number = 30, now: Date = getBusinessDate()) {
  const minDate = getLocalToday(now);
  minDate.setDate(minDate.getDate() - maxDaysOld);

  return toLocalDateOnly(date) < minDate;
}

@Service()
export class AttendanceValidator {
  @Year() private readonly year!: ResolvedAcademicYear;
  @I18n('attendance.errors') private at!: (key: string, params?: Record<string, unknown>) => string;

  constructor(
    private attendanceRepository: AttendanceRepository,
    private studentValidator: StudentValidator,
    private staffValidator: StaffValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
    private enrollments: StudentEnrollmentRepository,
  ) { }

  async ensureExists(id: string) {
    const existingAttendance = await this.attendanceRepository.getById(id);
    if (!existingAttendance) {
      Err(404, this.at('notFound'));
    }
    return existingAttendance;
  }

  ensureSelectedYear(yearId: string) {
    if (yearId !== this.year.id) Err(409, this.at('outsideSelectedYear'));
  }

  ensureSectionForMark(section: { academicYear: string } | undefined) {
    if (!section) Err(404, this.at('sectionNotFound'));
    return section;
  }

  ensureStudentMarkYear(year: ResolvedAcademicYear, date: string) {
    if (date < year.reportingStartsOn || date > year.reportingEndsOn) {
      Err(409, this.at('outsideSectionYear'));
    }
    if (year.status === 'draft') Err(409, this.at('draftYear'));
  }

  ensureStaffMarkYear(year: ResolvedAcademicYear | null | undefined) {
    if (!year) Err(409, this.at('outsideRegisteredYears'));
    if (year.status === 'draft') Err(409, this.at('draftYear'));
    return year;
  }

  async ensureTeacherCanMark(
    data: Pick<StudentAttendanceDto, 'sectionId' | 'teacherId'>,
    teacherId: string | null | undefined,
    role?: string,
  ) {
    if (role === 'teacher' && (!teacherId || (data.teacherId && data.teacherId !== teacherId) ||
      !await this.attendanceRepository.isTeacherInSection(teacherId, data.sectionId))) {
      Err(403, this.at('notAuthorizedForSection'));
    }
  }

  async ensureTeacherCanUpdate(
    record: { type: string; sectionId: string | null },
    teacherId: string | null | undefined,
    role?: string,
  ) {
    if (role === 'teacher' && (record.type !== 'student' || !teacherId || !record.sectionId ||
      !await this.attendanceRepository.isTeacherInSection(teacherId, record.sectionId))) {
      Err(403, this.at('notAuthorizedForSection'));
    }
  }

  async ensureNoDuplicateDailyAttendance(studentId: string, sectionId: string, date: string) {
    const existing = await this.attendanceRepository.findSameDayForStudentInSection(studentId, sectionId, date);
    if (existing) Err(409, this.at('dailyAlreadyMarked'));
  }

  async ensureSameDayAttendanceExists(studentId: string, sectionId: string, date: string) {
    const existing = await this.attendanceRepository.findSameDayForStudentInSection(studentId, sectionId, date);
    if (!existing) Err(404, this.at('noRecordToday'));
    return existing;
  }

  async validateStatusCorrection(
    sectionId: string,
    oldStatus: string,
    status: string,
    user: { role?: string; teacherId?: string | null },
  ) {
    const isAdmin = user.role === 'admin' || user.role === 'principal';
    const isTeacherOfSection = await this.attendanceRepository.isTeacherInSection(user.teacherId ?? '', sectionId);
    if (!isTeacherOfSection && !isAdmin) Err(403, this.at('notAuthorizedForSection'));

    const allowed: Record<string, string[]> = {
      absent: ['late', 'present'],
      late: ['present'],
      present: [],
    };
    if (!allowed[oldStatus]?.includes(status) && !isAdmin) Err(400, this.at('invalidTransition'));
  }

  ensureStaffAttendanceAuthorized(role?: string) {
    if (role !== 'admin' && role !== 'principal') Err(403, this.at('staffRequiresAdmin'));
  }

  ensureStaffRosterConsistent(items: StaffAttendanceRosterItemDto[]) {
    const staffIds = items.map((item) => item.staffId);
    if (new Set(staffIds).size !== staffIds.length) {
      Err(400, this.at('duplicateStaffInRoster'));
    }

    const dates = new Set(items.map((item) => item.date));
    if (dates.size !== 1) {
      Err(400, this.at('mixedRosterDates'));
    }

    const [date] = dates;
    return { staffIds, date };
  }

  ensureStaffRosterSaved(savedCount: number, expectedCount: number) {
    if (savedCount !== expectedCount) Err(409, this.at('staffRecordOtherYear'));
  }

  async ensureStudentExists(studentId: string) {
    return this.studentValidator.ensureExists(studentId);
  }

  async ensureStaffExists(staffId: string) {
    return this.staffValidator.ensureExists(staffId);
  }

  async ensureTeacherExists(teacherId: string) {
    return this.teacherValidator.ensureExists(teacherId);
  }

  async ensureSectionExists(sectionId: string) {
    return this.sectionValidator.ensureExists(sectionId);
  }

  async ensureSubjectExists(subjectId: string) {
    return this.subjectValidator.ensureExists(subjectId);
  }

  async ensureTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.teacherValidator.ensureAssignmentExists(teacherId, subjectId, sectionId);
  }

  async ensureStudentInSection(studentId: string, sectionId: string) {
    return this.studentValidator.ensureInSection(studentId, sectionId);
  }

  async ensureStudentPlacedInSectionOnDate(studentId: string, sectionId: string, date: string) {
    if (!await this.enrollments.hasAnyForStudent(studentId)) {
      // Undated legacy students remain on their existing current-section rule
      // until their historical enrollment is reviewed and recorded.
      return this.ensureStudentInSection(studentId, sectionId);
    }
    if (!await this.enrollments.isPlacedInSectionOnDate(studentId, sectionId, date)) {
      Err(409, this.at('noPlacementOnDate'));
    }
  }

  async ensureTeacherInSection(teacherId: string, sectionId: string) {
    return this.teacherValidator.ensureInSection(teacherId, sectionId);
  }

  async ensureNoDuplicateAttendance(studentId: string, teacherAssignmentId: string, date: string) {
    const existing = await this.attendanceRepository.checkDuplicateAttendance(
      studentId,
      teacherAssignmentId,
      date
    );

    if (existing) {
      Err(409, this.at('alreadyMarked'));
    }
  }

  async ensureNoDuplicateStaffAttendance(staffId: string, date: string) {
    const existing = await this.attendanceRepository.checkDuplicateStaffAttendance(staffId, date);

    if (existing) {
      Err(409, this.at('alreadyMarked'));
    }
  }

  async ensureStaffRosterEligible(staffIds: string[], date: string) {
    const uniqueIds = [...new Set(staffIds)];
    const existingIds = await this.attendanceRepository.getEligibleStaffIds(uniqueIds, date);
    const existingSet = new Set(existingIds);
    const missingId = uniqueIds.find((id) => !existingSet.has(id));

    if (missingId) {
      Err(400, this.at('staffNotEligible', { staffId: missingId, date }));
    }
  }

  async ensureDateNotInFuture(date: Date | string) {
    if (isFutureAttendanceDate(date)) {
      Err(400, this.at('futureDate'));
    }
  }

  async ensureDateNotTooOld(date: Date | string, maxDaysOld: number = 30) {
    if (isAttendanceDateTooOld(date, maxDaysOld)) {
      Err(400, this.at('dateTooOld'));
    }
  }

  async validateAttendanceDate(date: Date | string, role?: string) {
    await this.ensureDateNotInFuture(date);
    // Administrators can correct a past year's register through the normal
    // attendance workflow. Other roles keep the existing 30-day entry limit.
    if (role !== 'admin' && role !== 'principal') {
      await this.ensureDateNotTooOld(date, 30);
    }
  }

  async validateStudentAttendance(
    data,
    context?: { mode?: 'daily' | 'per_class'; user?: { role?: string; teacherId?: string } },
  ) {
    const { studentId, sectionId, date } = data;
    const mode = context?.mode ?? 'per_class';
    const user = context?.user ?? {};

    await this.ensureStudentExists(studentId);
    await this.ensureSectionExists(sectionId);
    await this.ensureStudentPlacedInSectionOnDate(studentId, sectionId, date);

    // Resolve teacherId/subjectId. Per_class requires both on the payload.
    // Daily mode may omit them; fall back to the caller's first teacher
    // assignment in the section. Non-teacher staff get teacherAssignmentId = null.
    let teacherId: string | undefined = data.teacherId;
    const subjectId: string | undefined = data.subjectId;

    if (mode === 'per_class') {
      if (!teacherId || !subjectId) {
        Err(400, this.at('teacherAndSubjectRequired'));
      }
    } else if (!teacherId && user.teacherId) {
      teacherId = user.teacherId;
    }

    let teacherAssignmentId: string | null = null;

    if (teacherId && subjectId) {
      await this.ensureTeacherExists(teacherId);
      await this.ensureSubjectExists(subjectId);
      await this.ensureTeacherInSection(teacherId, sectionId);
      await this.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
      const teacherAssignment = await this.attendanceRepository.getTeacherAssignment(
        teacherId, subjectId, sectionId,
      );
      teacherAssignmentId = teacherAssignment.id;
    } else if (teacherId) {
      // Daily mode, teacher user with no explicit subject: pick their first
      // assignment in this section (any subject). teacherAssignmentId is
      // metadata only in daily mode, so any valid assignment works.
      const assignment = await this.attendanceRepository.findFirstAssignmentForTeacherInSection(
        teacherId, sectionId,
      );
      teacherAssignmentId = assignment?.id ?? null;
    }

    if (date) {
      await this.validateAttendanceDate(date, user.role);
      // Per_class mode enforces no duplicate per (student, assignment, date).
      // Daily mode is guarded separately by ensureNoDuplicateDailyAttendance.
      if (mode === 'per_class' && teacherAssignmentId) {
        await this.ensureNoDuplicateAttendance(studentId, teacherAssignmentId, date);
      }
    }

    return teacherAssignmentId;
  }

  async validateStaffAttendance(data, role?: string) {
    const { staffId, date } = data;

    await this.ensureStaffExists(staffId);

    if (date) {
      await this.validateAttendanceDate(date, role);
      await this.ensureNoDuplicateStaffAttendance(staffId, date);
    }
  }

  async validate(data, excludeId: string = null) {
    const isUpdate = excludeId !== null;

    if (isUpdate) {
      await this.ensureExists(excludeId);
    }

    const {
      studentId,
      staffId,
      sectionId,
      teacherId,
      subjectId,
      teacherAssignmentId,
      date,
    } = data;

    if (studentId) await this.ensureStudentExists(studentId);
    if (staffId) await this.ensureStaffExists(staffId);
    if (teacherId) await this.ensureTeacherExists(teacherId);
    if (sectionId) await this.ensureSectionExists(sectionId);
    if (subjectId) await this.ensureSubjectExists(subjectId);

    if (!isUpdate) {
      if (studentId && sectionId) {
        await this.ensureStudentInSection(studentId, sectionId);
      }

      if (teacherId && sectionId) {
        await this.ensureTeacherInSection(teacherId, sectionId);
      }

      if (teacherId && subjectId && sectionId) {
        await this.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
      }

      if (studentId && teacherAssignmentId && date) {
        await this.ensureNoDuplicateAttendance(studentId, teacherAssignmentId, date);
      }
    }

    if (date) {
      await this.validateAttendanceDate(date);
    }

    return data;
  }

  async checkExists(id: string) {
    return this.ensureExists(id);
  }

  async checkStudentExists(studentId: string) {
    return this.ensureStudentExists(studentId);
  }

  async checkTeacherExists(teacherId: string) {
    return this.ensureTeacherExists(teacherId);
  }

  async checkSectionExists(sectionId: string) {
    return this.ensureSectionExists(sectionId);
  }

  async checkSubjectExists(subjectId: string) {
    return this.ensureSubjectExists(subjectId);
  }

  async checkTeacherAssignmentExists(teacherId: string, subjectId: string, sectionId: string) {
    return this.ensureTeacherAssignmentExists(teacherId, subjectId, sectionId);
  }

  async checkStudentInSection(studentId: string, sectionId: string) {
    return this.ensureStudentInSection(studentId, sectionId);
  }

  async checkTeacherInSection(teacherId: string, sectionId: string) {
    return this.ensureTeacherInSection(teacherId, sectionId);
  }

  async checkDuplicateAttendance(studentId: string, teacherAssignmentId: string, date: string) {
    return this.ensureNoDuplicateAttendance(studentId, teacherAssignmentId, date);
  }
}
