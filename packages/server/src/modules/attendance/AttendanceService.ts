import { Service, Transaction } from '../../najm';
import { AttendanceRepository, type AttendanceListFilters } from './AttendanceRepository';
import { AttendanceValidator } from './AttendanceValidator';
import { AcademicYearValidator } from '../academicYears/AcademicYearValidator';
import { SectionRepository } from '../sections/SectionRepository';
import { pickProps } from '../../shared';
import { getBusinessDateOnly } from '../../shared/businessDate';
import type {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  UpdateAttendanceStatusDto,
  UpsertStaffAttendanceRosterDto,
} from './AttendanceDto';

@Service()
export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private attendanceValidator: AttendanceValidator,
    private years: AcademicYearValidator,
    private sections: SectionRepository,
  ) { }

  private async teacherIdForUser(user: { id: string; role?: string; teacherId?: string }) {
    return user.role === 'teacher'
      ? await this.attendanceRepository.teacherIdForUser(user.id) : user.teacherId;
  }

  // The registered year a new mark is stored under.
  async yearForStudentMark(sectionId: string, date: string) {
    const [section] = await this.sections.listYearContexts([sectionId]);
    const context = this.attendanceValidator.ensureSectionForMark(section);
    const year = await this.years.requireLabel(context.academicYear);
    this.attendanceValidator.ensureStudentMarkYear(year, date);
    return year.id;
  }

  async yearForStaffMark(date: string) {
    const year = this.attendanceValidator.ensureStaffMarkYear(await this.years.findForDate(date));
    return year.id;
  }

  // The year's marks, optionally of one type, section, student or staff
  // member; a filter naming a missing record is a 404 before the list is read.
  async getAll(filters: AttendanceListFilters = {}) {
    if (filters.sectionId) await this.attendanceValidator.ensureSectionExists(filters.sectionId);
    if (filters.studentId) await this.attendanceValidator.ensureStudentExists(filters.studentId);
    if (filters.staffId) await this.attendanceValidator.ensureStaffExists(filters.staffId);
    return await this.attendanceRepository.getAll(filters);
  }

  // A mark belongs to its stored year, else its date's year; the role must be
  // allowed that year.
  async getById(id: string, role?: string) {
    const record = await this.attendanceValidator.ensureExists(id);
    await this.years.resolveRecord(record.academicYearId, record.date, role);
    return record;
  }

  // The repository keeps the date and selected year in one read predicate.
  async getByDate(date: string, type?: string) {
    return await this.attendanceRepository.getByDate(date, type);
  }

  async getByTeacher(teacherId: string) {
    await this.attendanceValidator.ensureTeacherExists(teacherId);
    return await this.attendanceRepository.getByTeacher(teacherId);
  }

  // Today's marks exist only in the selected year when the repository reads them.
  async getToday(type?: string) {
    return this.attendanceRepository.getToday(type);
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
    const academicYearId = await this.yearForStudentMark(data.sectionId, data.date);
    this.attendanceValidator.ensureSelectedYear(academicYearId);
    await this.years.resolveRecord(academicYearId, data.date, user.role);
    const teacherId = await this.teacherIdForUser(user);
    await this.attendanceValidator.ensureTeacherCanMark(data, teacherId, user.role);
    const mode = await this.attendanceRepository.getAttendanceMode();

    if (mode === 'daily') {
      // Daily mode: only the first teacher of the day creates a record.
      // Later teachers must correct it via updateStatus() rather than
      // creating a duplicate (which would double-count in analytics).
      await this.attendanceValidator.ensureNoDuplicateDailyAttendance(
        data.studentId,
        data.sectionId,
        data.date,
      );
    }

    // Resolve the marker's teacher assignment. In daily mode teacher/subject
    // are optional on the payload; fall back to the authenticated teacher's
    // first assignment in the section. Non-teacher staff (admin, assistant,
    // secretary, …) legitimately mark with teacherAssignmentId = null.
    const teacherAssignmentId = await this.attendanceValidator.validateStudentAttendance(
      data,
      { mode, user: { ...user, teacherId } },
    );
    return await this.attendanceRepository.create({
      type: 'student',
      studentId: data.studentId,
      sectionId: data.sectionId,
      academicYearId,
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
    const targetDate = date ?? getBusinessDateOnly();

    const academicYearId = await this.yearForStudentMark(sectionId, targetDate);
    this.attendanceValidator.ensureSelectedYear(academicYearId);
    await this.years.resolveRecord(academicYearId, targetDate, user.role);

    const existing = await this.attendanceValidator.ensureSameDayAttendanceExists(
      studentId, sectionId, targetDate,
    );
    await this.attendanceValidator.ensureExists(existing.id);

    await this.attendanceValidator.validateAttendanceDate(targetDate, user.role);
    const teacherId = await this.teacherIdForUser(user);
    await this.attendanceValidator.validateStatusCorrection(
      sectionId, existing.status, status, { role: user.role, teacherId },
    );

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

  async getHistory(id: string, role?: string) {
    await this.getById(id, role);
    return await this.attendanceRepository.getHistory(id);
  }

  private async markStaffAttendance(data: Extract<CreateAttendanceDto, { type: 'staff' }>, user: { id: string; role?: string }) {
    this.attendanceValidator.ensureStaffAttendanceAuthorized(user.role);
    const academicYearId = await this.yearForStaffMark(data.date);
    this.attendanceValidator.ensureSelectedYear(academicYearId);
    await this.years.resolveRecord(academicYearId, data.date, user.role);
    await this.attendanceValidator.validateStaffAttendance(data, user.role);

    return await this.attendanceRepository.create({
      type: 'staff',
      staffId: data.staffId,
      academicYearId,
      date: data.date,
      status: data.status,
      notes: data.notes,
      markedBy: user.id,
    });
  }

  @Transaction()
  async upsertStaffRoster(data: UpsertStaffAttendanceRosterDto, user: { id: string; role?: string }) {
    const { staffIds, date } = this.attendanceValidator.ensureStaffRosterConsistent(data.items);
    await this.attendanceValidator.validateAttendanceDate(date, user.role);
    await this.attendanceValidator.ensureStaffRosterEligible(staffIds, date);
    const academicYearId = await this.yearForStaffMark(date);
    this.attendanceValidator.ensureSelectedYear(academicYearId);
    await this.years.resolveRecord(academicYearId, date, user.role);

    const saved = await this.attendanceRepository.upsertStaffRoster(data.items, user.id);
    this.attendanceValidator.ensureStaffRosterSaved(saved.savedCount, data.items.length);
    return saved;
  }

  async update(id: string, data: UpdateAttendanceDto, user: { id: string; role?: string; teacherId?: string }) {
    const ATTENDANCE_UPDATE_KEYS = ['status', 'notes'];
    const attendanceData = pickProps(data, ATTENDANCE_UPDATE_KEYS);

    const record = await this.getById(id, user.role);
    const teacherId = await this.teacherIdForUser(user);
    await this.attendanceValidator.ensureTeacherCanUpdate(record, teacherId, user.role);
    return await this.attendanceRepository.update(id, attendanceData);
  }

  async delete(id: string, role?: string) {
    await this.getById(id, role);
    return await this.attendanceRepository.delete(id);
  }

  async deleteAll() {
    return await this.attendanceRepository.deleteAll();
  }

  async clearForSeedReset() {
    return this.attendanceRepository.clearForSeedReset();
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
