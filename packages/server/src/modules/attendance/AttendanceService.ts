import { Service, Err, I18n, Transaction } from '@server/najm';
import { AttendanceRepository } from './AttendanceRepository';
import { AttendanceValidator } from './AttendanceValidator';
import { pickProps } from '@server/shared';
import type {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  UpdateAttendanceStatusDto,
  UpsertStaffAttendanceRosterDto,
} from './AttendanceDto';

@Service()
export class AttendanceService {
  @I18n('attendance.errors') private at!: (key: string) => string;

  constructor(
    private attendanceRepository: AttendanceRepository,
    private attendanceValidator: AttendanceValidator,
  ) { }

  async getAll(type?: string) {
    return await this.attendanceRepository.getAll(type);
  }

  async getById(id: string) {
    return this.attendanceValidator.ensureExists(id);
  }

  async getByDate(date: string, type?: string) {
    return await this.attendanceRepository.getByDate(date, type);
  }

  async getBySection(sectionId: string) {
    await this.attendanceValidator.ensureSectionExists(sectionId);
    return await this.attendanceRepository.getBySection(sectionId);
  }

  async getByStudent(studentId: string) {
    await this.attendanceValidator.ensureStudentExists(studentId);
    return await this.attendanceRepository.getByStudent(studentId);
  }

  async getByStaff(staffId: string) {
    await this.attendanceValidator.ensureStaffExists(staffId);
    return await this.attendanceRepository.getByStaff(staffId);
  }

  async getByTeacher(teacherId: string) {
    await this.attendanceValidator.ensureTeacherExists(teacherId);
    return await this.attendanceRepository.getByTeacher(teacherId);
  }

  async getToday(type?: string) {
    return await this.attendanceRepository.getToday(type);
  }

  async mark(data: CreateAttendanceDto, user: { id: string; role?: string; teacherId?: string }) {
    if (data.type === 'staff') {
      return this.markStaffAttendance(data, user);
    }
    return this.markStudentAttendance(data, user);
  }

  private async markStudentAttendance(
    data: Extract<CreateAttendanceDto, { type: 'student' }>,
    user: { id: string; role?: string; teacherId?: string },
  ) {
    const mode = await this.attendanceRepository.getAttendanceMode();

    if (mode === 'daily') {
      // Daily mode: only the first teacher of the day creates a record.
      // Later teachers must correct it via updateStatus() rather than
      // creating a duplicate (which would double-count in analytics).
      const existing = await this.attendanceRepository.findSameDayForStudentInSection(
        data.studentId,
        data.sectionId,
        data.date,
      );
      if (existing) {
        Err(409, this.at('dailyAlreadyMarked'));
      }
    }

    // Resolve the marker's teacher assignment. In daily mode teacher/subject
    // are optional on the payload; fall back to the authenticated teacher's
    // first assignment in the section. Non-teacher staff (admin, assistant,
    // secretary, …) legitimately mark with teacherAssignmentId = null.
    const teacherAssignmentId = await this.attendanceValidator.validateStudentAttendance(
      data,
      { mode, user },
    );

    return await this.attendanceRepository.create({
      type: 'student',
      studentId: data.studentId,
      sectionId: data.sectionId,
      teacherAssignmentId,
      date: data.date,
      status: data.status,
      notes: data.notes,
      markedBy: user.id,
    });
  }

  // Daily-mode status update. A later teacher of the same section can correct
  // an earlier entry (e.g. absent → late for a student who arrived mid-day).
  // Allowed transitions: absent → {late, present}, late → present,
  // Anything that would erase a present record requires admin override.
  async updateStatus(
    { studentId, sectionId, status, note, date }: UpdateAttendanceStatusDto,
    user: { id: string; role?: string; teacherId?: string },
  ) {
    let targetDate = date;
    if (!targetDate) {
      const today = new Date();
      today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
      targetDate = today.toISOString().split('T')[0];
    }

    const existing = await this.attendanceRepository.findSameDayForStudentInSection(
      studentId, sectionId, targetDate,
    );
    if (!existing) {
      Err(404, this.at('noRecordToday'));
    }

    const isAdmin = user.role === 'admin';
    const isTeacherOfSection = await this.attendanceRepository.isTeacherInSection(
      user.teacherId ?? '', sectionId,
    );
    if (!isTeacherOfSection && !isAdmin) {
      Err(403, this.at('notAuthorizedForSection'));
    }

    const allowed: Record<string, string[]> = {
      absent: ['late', 'present'],
      late: ['present'],
      present: [],
    };
    const canTransition = allowed[existing.status]?.includes(status);
    if (!canTransition && !isAdmin) {
      Err(400, this.at('invalidTransition'));
    }

    await this.attendanceRepository.update(existing.id, {
      status,
      lastUpdatedBy: user.id,
    });

    await this.attendanceRepository.createHistory({
      attendanceId: existing.id,
      oldStatus: existing.status,
      newStatus: status,
      note: note ?? null,
      changedBy: user.id,
    });

    return await this.attendanceRepository.getById(existing.id);
  }

  async getHistory(id: string) {
    await this.attendanceValidator.ensureExists(id);
    return await this.attendanceRepository.getHistory(id);
  }

  private async markStaffAttendance(data: Extract<CreateAttendanceDto, { type: 'staff' }>, user: { id: string }) {
    await this.attendanceValidator.validateStaffAttendance(data);

    return await this.attendanceRepository.create({
      type: 'staff',
      staffId: data.staffId,
      date: data.date,
      status: data.status,
      notes: data.notes,
      markedBy: user.id,
    });
  }

  @Transaction()
  async upsertStaffRoster(data: UpsertStaffAttendanceRosterDto, user: { id: string }) {
    const staffIds = data.items.map((item) => item.staffId);
    if (new Set(staffIds).size !== staffIds.length) {
      Err(400, this.at('duplicateStaffInRoster') || 'Each staff member may appear only once in a roster');
    }

    const dates = new Set(data.items.map((item) => item.date));
    if (dates.size !== 1) {
      Err(400, this.at('mixedRosterDates') || 'All staff attendance records must use the same date');
    }

    const [date] = dates;
    await this.attendanceValidator.validateAttendanceDate(date);
    await this.attendanceValidator.ensureStaffRosterEligible(staffIds, date);

    return this.attendanceRepository.upsertStaffRoster(data.items, user.id);
  }

  async update(id: string, data: UpdateAttendanceDto) {
    const ATTENDANCE_UPDATE_KEYS = ['status', 'notes'];
    const attendanceData = pickProps(data, ATTENDANCE_UPDATE_KEYS);

    await this.attendanceValidator.ensureExists(id);
    return await this.attendanceRepository.update(id, attendanceData);
  }

  async delete(id: string) {
    await this.attendanceValidator.ensureExists(id);
    return await this.attendanceRepository.delete(id);
  }

  async deleteAll() {
    return await this.attendanceRepository.deleteAll();
  }

  async seedDemo(attendanceData) {
    const createdAttendance = [];

    for (const attendanceEntry of attendanceData) {
      try {
        const attendanceEntity = await this.attendanceRepository.create(attendanceEntry);
        createdAttendance.push(attendanceEntity);
      } catch {
        continue;
      }
    }

    return createdAttendance;
  }
}
