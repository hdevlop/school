import { DB } from '@server/database/db';
import { settings, users } from '@server/database/schema';
import { Repository } from '@server/najm';
import { count, eq, desc, sql } from 'drizzle-orm';

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
  currentAcademicYear: settings.currentAcademicYear,

  // Academic Settings
  gradingScale: settings.gradingScale,
  attendanceRequirement: settings.attendanceRequirement,
  attendanceMode: settings.attendanceMode,
  maxClassSize: settings.maxClassSize,
  minimumPassingGrade: settings.minimumPassingGrade,
  defaultExamDuration: settings.defaultExamDuration,
  calendarSystem: settings.calendarSystem,
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

  async update(id, data) {
    const [updatedSettings] = await this.db
      .update(settings)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(settings.id, id))
      .returning();
    return updatedSettings;
  }


  async getAll() {
    return await this.db
      .select()
      .from(settings)
      .orderBy(desc(settings.createdAt));
  }

  async deleteAll() {
    return await this.db.delete(settings);
  }

  async delete(id) {
    const [deletedSettings] = await this.db
      .delete(settings)
      .where(eq(settings.id, id))
      .returning();
    return deletedSettings;
  }

}
