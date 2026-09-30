import { Service, Err, I18n } from '../../najm';
import { SettingsRepository } from './SettingsRepository';
import { defaultSchoolYearCalendar, isValidSchoolYearCalendar, parseSchoolYearLabel } from '@sms/contracts/academic-years';
import type { UpdateSettingsDto } from './SettingsDto';

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

@Service()
export class SettingsValidator {
  @I18n('settings.errors') private t!: (key: string) => string;

  constructor(
    private settingsRepository: SettingsRepository,
  ) {}

  initialCalendar(label: string, startMonth?: string, endMonth?: string) {
    const defaults = defaultSchoolYearCalendar(label);
    const years = parseSchoolYearLabel(label)!;
    const start = MONTHS.indexOf((startMonth || 'september').toLowerCase());
    const end = MONTHS.indexOf((endMonth || 'june').toLowerCase());
    if (start < 0 || end < 0) Err(400, this.t('invalidCalendarMonth'));
    const endYear = end < start ? years.endYear : years.startYear;
    const lastDay = new Date(Date.UTC(endYear, end + 1, 0)).getUTCDate();
    const calendar = {
      ...defaults,
      instructionStartsOn: `${years.startYear}-${String(start + 1).padStart(2, '0')}-01`,
      instructionEndsOn: `${endYear}-${String(end + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
    if (!isValidSchoolYearCalendar(label, calendar)) Err(400, this.t('invalidCalendar'));
    return calendar;
  }

  ensureCurrentSettings<T>(settings: T | null | undefined): T {
    if (!settings) Err(404, this.t('missing'));
    return settings;
  }

  ensureYearSettingsUnchanged(data: UpdateSettingsDto, current: { startMonth: string; endMonth: string; currentAcademicYear: string }) {
    if ((data.startMonth !== undefined && data.startMonth !== current.startMonth) ||
      (data.endMonth !== undefined && data.endMonth !== current.endMonth)) {
      Err(409, this.t('registeredCalendarLocked'));
    }
    if (data.currentAcademicYear && data.currentAcademicYear !== current.currentAcademicYear) {
      Err(409, this.t('activateThroughYears'));
    }
  }

  // The active year is the newest settings row's pointer (findWithActivePointer),
  // so a second row would switch years without activation. Settings are
  // created once, at installation; later changes are updates.
  ensureNotInstalled(settings: object | null | undefined) {
    if (settings) Err(409, this.t('alreadyExists'));
  }

  async ensureExists(id: string) {
    if (!await this.settingsRepository.getById(id)) Err(404, this.t('notFound'));
  }

}
