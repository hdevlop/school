import { DB } from '../../database/db';
import { routineDuties, routineEntries, routineSchedules, settings } from '../../database/schema';
import { Repository } from '../../najm';
import { and, eq, desc, inArray, notInArray, sql } from 'drizzle-orm';
import type { RoutineDay } from '@sms/contracts/routines';

const publicSettings = {
  // School Information
  id: settings.id,
  schoolName: settings.schoolName,
  schoolAddress: settings.schoolAddress,
  schoolAddressPlaceId: settings.schoolAddressPlaceId,
  schoolAddressLatitude: settings.schoolAddressLatitude,
  schoolAddressLongitude: settings.schoolAddressLongitude,
  schoolPhone: settings.schoolPhone,
  schoolEmail: settings.schoolEmail,
  schoolWebsite: settings.schoolWebsite,
  schoolLogo: settings.schoolLogo,
  schoolNameAr: settings.schoolNameAr,
  schoolAddressAr: settings.schoolAddressAr,
  schoolPhones: settings.schoolPhones,
  schoolLicenseNumber: settings.schoolLicenseNumber,
  schoolLicenseDate: settings.schoolLicenseDate,
  receiptLanguage: settings.receiptLanguage,
  currentAcademicYear: settings.currentAcademicYear,
  activeAcademicYearId: settings.activeAcademicYearId,

  // Academic Settings
  gradingScale: settings.gradingScale,
  attendanceRequirement: settings.attendanceRequirement,
  attendanceMode: settings.attendanceMode,
  maxClassSize: settings.maxClassSize,
  minimumPassingGrade: settings.minimumPassingGrade,
  defaultExamDuration: settings.defaultExamDuration,
  calendarSystem: settings.calendarSystem,
  teachingDays: settings.teachingDays,
  startMonth: settings.startMonth,
  endMonth: settings.endMonth,

  // Notification Settings
  academicAlerts: settings.academicAlerts,
  attendanceAlerts: settings.attendanceAlerts,
  eventAlerts: settings.eventAlerts,
  homeworkAlerts: settings.homeworkAlerts,
  feesReminder: settings.feesReminder,
  feesOverdueAlerts: settings.feesOverdueAlerts,
  emailNotifications: settings.emailNotifications,
  smsNotifications: settings.smsNotifications,
  parentNotifications: settings.parentNotifications,
  lowGradeAlerts: settings.lowGradeAlerts,
  allowLateSubmission: settings.allowLateSubmission,
  examResultsAlerts: settings.examResultsAlerts,
  disciplinaryAlerts: settings.disciplinaryAlerts,
  achievementAlerts: settings.achievementAlerts,
  maintenanceNotifications: settings.maintenanceNotifications,

  // Security Settings
  twoFactorEnabled: settings.twoFactorEnabled,
  sessionTimeout: settings.sessionTimeout,
  passwordRequireSymbols: settings.passwordRequireSymbols,
  loginNotifications: settings.loginNotifications,
  parentAccessEnabled: settings.parentAccessEnabled,
  teacherAccessEnabled: settings.teacherAccessEnabled,
  studentAccessEnabled: settings.studentAccessEnabled,

  // System Preferences
  timeZone: settings.timeZone,
  language: settings.language,
  theme: settings.theme,
  dateFormat: settings.dateFormat,
  timeFormat: settings.timeFormat,
  currency: settings.currency,

  // Academic Calendar Settings
  gradingPeriods: settings.gradingPeriods,
  schoolStartTime: settings.schoolStartTime,
  schoolEndTime: settings.schoolEndTime,
  lunchBreakDuration: settings.lunchBreakDuration,

  // Timestamps
  createdAt: settings.createdAt,
  updatedAt: settings.updatedAt,
};

@Repository()
export class SettingsRepository {

  declare db: DB;

  async getPublicSettings() {
    const [result] = await this.db
      .select(publicSettings)
      .from(settings)
      .orderBy(desc(settings.createdAt))
      .limit(1);
    return result;
  }

  async getAdminSettings() {
    const [result] = await this.db
      .select()
      .from(settings)
      .orderBy(desc(settings.createdAt))
      .limit(1);
    return result;
  }

  async getById(id) {
    const [result] = await this.db
      .select()
      .from(settings)
      .where(eq(settings.id, id));
    return result;
  }

  async create(data) {
    const [newSettings] = await this.db
      .insert(settings)
      .values(data)
      .returning();
    return newSettings;
  }

  // Moves the active-year pointer only from the year the caller checked, so
  // two activations can never both succeed. Returns null when it moved first.
  async switchActiveYear(fromYearId: string, to: { id: string; label: string }) {
    const [row] = await this.db
      .update(settings)
      .set({ activeAcademicYearId: to.id, currentAcademicYear: to.label, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(settings.activeAcademicYearId, fromYearId))
      .returning({ id: settings.id });
    return row ?? null;
  }

  async update(id, data) {
    const [updatedSettings] = await this.db
      .update(settings)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(settings.id, id))
      .returning();
    return updatedSettings;
  }

  // School settings target the active year explicitly, regardless of the
  // historical year selected by the caller. Past and archived routines keep
  // their own snapshot of the days that applied to them.
  private activeRoutines(academicYear: string) {
    return and(eq(routineSchedules.academicYear, academicYear), inArray(routineSchedules.status, ['draft', 'published']));
  }

  async teachingDayConflict(academicYear: string, days: RoutineDay[]) {
    const [lesson] = await this.db.select({ id: routineEntries.id }).from(routineEntries)
      .innerJoin(routineSchedules, eq(routineEntries.scheduleId, routineSchedules.id))
      .where(and(this.activeRoutines(academicYear), notInArray(routineEntries.dayOfWeek, days))).limit(1);
    if (lesson) return true;
    const [duty] = await this.db.select({ id: routineDuties.id }).from(routineDuties)
      .innerJoin(routineSchedules, eq(routineDuties.scheduleId, routineSchedules.id))
      .where(and(this.activeRoutines(academicYear), notInArray(routineDuties.dayOfWeek, days))).limit(1);
    return Boolean(duty);
  }

  async updateActiveRoutineDays(academicYear: string, days: RoutineDay[]) {
    await this.db.update(routineSchedules).set({ activeDays: days, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(this.activeRoutines(academicYear));
  }

  async deleteAll() {
    return await this.db.delete(settings);
  }

}
