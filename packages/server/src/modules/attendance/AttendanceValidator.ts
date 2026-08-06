import { Service, Err, I18n } from '@server/najm';
import { AttendanceRepository } from './AttendanceRepository';
import { StudentValidator } from '../students/StudentValidator';
import { StaffValidator } from '../staff/StaffValidator';
import { TeacherValidator } from '../teachers/TeacherValidator';
import { SectionValidator } from '../sections/SectionValidator';
import { SubjectValidator } from '../subjects/SubjectValidator';

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

export function isFutureAttendanceDate(date: Date | string, now: Date = new Date()) {
  return toLocalDateOnly(date) > getLocalToday(now);
}

export function isAttendanceDateTooOld(date: Date | string, maxDaysOld: number = 30, now: Date = new Date()) {
  const minDate = getLocalToday(now);
  minDate.setDate(minDate.getDate() - maxDaysOld);

  return toLocalDateOnly(date) < minDate;
}

@Service()
export class AttendanceValidator {
  @I18n('attendance.errors') private at!: (key: string) => string;

  constructor(
    private attendanceRepository: AttendanceRepository,
    private studentValidator: StudentValidator,
    private staffValidator: StaffValidator,
    private teacherValidator: TeacherValidator,
    private sectionValidator: SectionValidator,
    private subjectValidator: SubjectValidator,
  ) { }

  async ensureExists(id: string) {
    const existingAttendance = await this.attendanceRepository.getById(id);
    if (!existingAttendance) {
      Err(404, this.at('notFound'));
    }
    return existingAttendance;
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
      Err(400, this.at('staffNotEligible') || `Staff member ${missingId} is not eligible for attendance on ${date}`);
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

  async validateAttendanceDate(date: Date | string) {
    await this.ensureDateNotInFuture(date);
    await this.ensureDateNotTooOld(date, 30);
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
    await this.ensureStudentInSection(studentId, sectionId);

    // Resolve teacherId/subjectId. Per_class requires both on the payload.
    // Daily mode may omit them; fall back to the caller's first teacher
    // assignment in the section. Non-teacher staff get teacherAssignmentId = null.
    let teacherId: string | undefined = data.teacherId;
    let subjectId: string | undefined = data.subjectId;

    if (mode === 'per_class') {
      if (!teacherId || !subjectId) {
        Err(400, this.at('teacherAndSubjectRequired') || 'Teacher and subject are required');
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
      await this.validateAttendanceDate(date);
      // Per_class mode enforces no duplicate per (student, assignment, date).
      // Daily mode is guarded separately in the service via findSameDayForStudentInSection.
      if (mode === 'per_class' && teacherAssignmentId) {
        await this.ensureNoDuplicateAttendance(studentId, teacherAssignmentId, date);
      }
    }

    return teacherAssignmentId;
  }

  async validateStaffAttendance(data) {
    const { staffId, date } = data;

    await this.ensureStaffExists(staffId);

    if (date) {
      await this.validateAttendanceDate(date);
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
