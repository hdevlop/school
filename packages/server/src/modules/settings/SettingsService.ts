import { Service, Transaction } from '../../najm';
import { SettingsRepository } from './SettingsRepository';
import { SettingsValidator } from './SettingsValidator';
import type { CreateSettingsDto, UpdateSettingsDto } from './SettingsDto';
import { getBusinessClockInfo } from '../../shared';
import { AcademicYearRepository } from '../academicYears/AcademicYearRepository';

@Service()
export class SettingsService {
  constructor(
    private settingsRepository: SettingsRepository,
    private settingsValidator: SettingsValidator,
    private academicYears: AcademicYearRepository,
  ) { }

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

  @Transaction()
  async create(data: CreateSettingsDto) {
    this.settingsValidator.ensureNotInstalled(await this.settingsRepository.getAdminSettings());

    let activeYear = await this.academicYears.findByLabel(data.currentAcademicYear);
    if (!activeYear) {
      activeYear = await this.academicYears.create({
        label: data.currentAcademicYear,
        ...this.settingsValidator.initialCalendar(data.currentAcademicYear, data.startMonth, data.endMonth),
        status: 'open',
        provenance: 'assumed',
        provenanceNote: 'Imported from initial School settings; calendar requires review',
      });
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
      activeAcademicYearId: activeYear.id,

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

  @Transaction()
  async update(data: UpdateSettingsDto) {
    const current = this.settingsValidator.ensureCurrentSettings(await this.settingsRepository.getAdminSettings());
    // Registered years own their calendars and the active year moves only
    // through activation, so an ordinary Settings edit can change neither.
    this.settingsValidator.ensureYearSettingsUnchanged(data, current);
    return await this.settingsRepository.update(current.id, data);
  }


  async deleteAll() {
    return await this.settingsRepository.deleteAll();
  }
}
