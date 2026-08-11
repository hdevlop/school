import { Service } from '@server/najm';
import { SettingsRepository } from './SettingsRepository';
import { SettingsValidator } from './SettingsValidator';
import type { CreateSettingsDto, UpdateSettingsDto } from './SettingsDto';
import { getBusinessClockInfo } from '@server/shared';

@Service()
export class SettingsService {
  constructor(
    private settingsRepository: SettingsRepository,
    private settingsValidator: SettingsValidator,
  ) { }

  async getAll() {
    return await this.settingsRepository.getAll();
  }

  async getById(id: string) {
    await this.settingsValidator.ensureExists(id);
    return await this.settingsRepository.getById(id);
  }

  async getPublicSettings() {
    const settings = await this.settingsRepository.getPublicSettings();
    return settings ? { ...settings, ...getBusinessClockInfo() } : settings;
  }

  async getAdminSettings() {
    const settings = await this.settingsRepository.getAdminSettings();
    return settings ? { ...settings, ...getBusinessClockInfo() } : settings;
  }

  async create(data: CreateSettingsDto) {
    if (data.id) {
      await this.settingsValidator.ensureIdUnique(data.id);
    }

    const settingsDetails = {
      ...(data.id && { id: data.id }),

      // School Information
      schoolName: data.schoolName,
      schoolAddress: data.schoolAddress,
      schoolAddressPlaceId: data.schoolAddressPlaceId,
      schoolAddressLatitude: data.schoolAddressLatitude,
      schoolAddressLongitude: data.schoolAddressLongitude,
      schoolPhone: data.schoolPhone,
      schoolEmail: data.schoolEmail,
      schoolWebsite: data.schoolWebsite,
      schoolLogo: data.schoolLogo,
      currentAcademicYear: data.currentAcademicYear,

      // Academic Settings
      gradingScale: data.gradingScale,
      attendanceRequirement: data.attendanceRequirement || '75.00',
      attendanceMode: data.attendanceMode || 'daily',
      maxClassSize: data.maxClassSize || 34,
      minimumPassingGrade: data.minimumPassingGrade || '60.00',
      defaultExamDuration: data.defaultExamDuration || 120,
      calendarSystem: data.calendarSystem || 'SEMESTER',
      startMonth: data.startMonth || 'september',
      endMonth: data.endMonth || 'june',

      // Notification Settings
      academicAlerts: data.academicAlerts ?? true,
      attendanceAlerts: data.attendanceAlerts ?? true,
      eventAlerts: data.eventAlerts ?? true,
      homeworkAlerts: data.homeworkAlerts ?? true,
      feesReminder: data.feesReminder ?? true,
      feesOverdueAlerts: data.feesOverdueAlerts ?? true,
      emailNotifications: data.emailNotifications ?? true,
      smsNotifications: data.smsNotifications ?? false,
      parentNotifications: data.parentNotifications ?? true,
      lowGradeAlerts: data.lowGradeAlerts ?? true,
      allowLateSubmission: data.allowLateSubmission ?? true,
      examResultsAlerts: data.examResultsAlerts ?? true,
      disciplinaryAlerts: data.disciplinaryAlerts ?? true,
      achievementAlerts: data.achievementAlerts ?? true,
      maintenanceNotifications: data.maintenanceNotifications ?? true,

      // Security Settings
      twoFactorEnabled: data.twoFactorEnabled ?? false,
      sessionTimeout: data.sessionTimeout || '60',
      passwordRequireSymbols: data.passwordRequireSymbols ?? true,
      loginNotifications: data.loginNotifications ?? true,
      parentAccessEnabled: data.parentAccessEnabled ?? true,
      teacherAccessEnabled: data.teacherAccessEnabled ?? true,
      studentAccessEnabled: data.studentAccessEnabled ?? true,

      // System Preferences
      timeZone: data.timeZone || 'UTC',
      language: data.language || 'en',
      theme: data.theme || 'light',
      dateFormat: data.dateFormat || 'MM/DD/YYYY',
      timeFormat: data.timeFormat || '12',
      currency: data.currency || 'USD',

      // Academic Calendar Settings
      gradingPeriods: data.gradingPeriods || 4,
      schoolStartTime: data.schoolStartTime || '08:00',
      schoolEndTime: data.schoolEndTime || '15:00',
      lunchBreakDuration: data.lunchBreakDuration || 30,

      // Maintenance & Backup Settings
      maintenanceMode: data.maintenanceMode ?? false,
      autoBackup: data.autoBackup ?? true,
    };

    return await this.settingsRepository.create(settingsDetails);
  }

  async update(data: UpdateSettingsDto) {
    const { id } = await this.settingsRepository.getAdminSettings()
    await this.settingsValidator.ensureExists(id);
    return await this.settingsRepository.update(id, data);
  }


  async deleteAll() {
    return await this.settingsRepository.deleteAll();
  }



}
