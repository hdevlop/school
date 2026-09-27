import { Err, Service, Transaction } from '../../najm';
import { SettingsRepository } from './SettingsRepository';
import { SettingsValidator } from './SettingsValidator';
import type { CreateSettingsDto, UpdateSettingsDto } from './SettingsDto';
import { getBusinessClockInfo } from '../../shared';
import { defaultSchoolYearCalendar, isValidSchoolYearCalendar, parseSchoolYearLabel } from '@sms/contracts/academic-years';
import { AcademicYearRepository } from '../academicYears/AcademicYearRepository';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function initialCalendar(label: string, startMonth?: string, endMonth?: string) {
  const defaults = defaultSchoolYearCalendar(label);
  const years = parseSchoolYearLabel(label)!;
  const start = MONTHS.indexOf((startMonth || 'september').toLowerCase());
  const end = MONTHS.indexOf((endMonth || 'june').toLowerCase());
  if (start < 0 || end < 0) Err(400, 'Invalid academic calendar month');
  const endYear = end < start ? years.endYear : years.startYear;
  const lastDay = new Date(Date.UTC(endYear, end + 1, 0)).getUTCDate();
  const calendar = {
    ...defaults,
    instructionStartsOn: `${years.startYear}-${String(start + 1).padStart(2, '0')}-01`,
    instructionEndsOn: `${endYear}-${String(end + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
  if (!isValidSchoolYearCalendar(label, calendar)) Err(400, 'Invalid academic calendar');
  return calendar;
}

@Service()
export class SettingsService {
  constructor(
    private settingsRepository: SettingsRepository,
    private settingsValidator: SettingsValidator,
    private academicYears: AcademicYearRepository,
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

  @Transaction()
  async create(data: CreateSettingsDto) {
    if (data.id) {
      await this.settingsValidator.ensureIdUnique(data.id);
    }

    let activeYear = await this.academicYears.findByLabel(data.currentAcademicYear);
    if (!activeYear) {
      activeYear = await this.academicYears.create({
        label: data.currentAcademicYear,
        ...initialCalendar(data.currentAcademicYear, data.startMonth, data.endMonth),
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
    const current = await this.settingsRepository.getAdminSettings();
    if (!current) Err(404, 'School settings are missing');
    const { id } = current!;
    await this.settingsValidator.ensureExists(id);
    // Registered years own their calendars and the active year moves only
    // through activation, so an ordinary Settings edit can change neither.
    if (
      (data.startMonth !== undefined && data.startMonth !== current!.startMonth) ||
      (data.endMonth !== undefined && data.endMonth !== current!.endMonth)
    ) {
      Err(409, 'Registered year calendars require a reviewed correction');
    }
    if (data.currentAcademicYear && data.currentAcademicYear !== current!.currentAcademicYear) {
      Err(409, 'Activate the registered year through academic-year operations');
    }
    return await this.settingsRepository.update(id, data);
  }


  async deleteAll() {
    return await this.settingsRepository.deleteAll();
  }



}
