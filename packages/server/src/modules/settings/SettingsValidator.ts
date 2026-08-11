import { Service, Err, I18n } from '@server/najm';
import { SettingsRepository } from './SettingsRepository';

@Service()
export class SettingsValidator {
  @I18n('settings.errors') private t!: (key: string) => string;

  constructor(
    private settingsRepository: SettingsRepository,
  ) {}

  //======================= Existence Checks (boolean) =======================

  async isSettingsExists(id: string): Promise<boolean> {
    const existingSettings = await this.settingsRepository.getById(id);
    return !!existingSettings;
  }
  //======================= Existence Checks (throw errors) =======================

  async checkSettingsExists(id: string): Promise<boolean> {
    const settingsExists = await this.isSettingsExists(id);
    if (!settingsExists) {
      Err(404, this.t('notFound'));
    }
    return true;
  }

  //======================= Uniqueness Checks (throw errors) =======================

  async checkSettingsIdIsUnique(id){
    const existingSettings = await this.settingsRepository.getById(id);
    if (existingSettings) {
      Err(409, this.t('idExists'));
    }
  }

  //======================= Business Rules Validation =======================

  validateLanguage(language: string): boolean {
    const validLanguages = ['en', 'fr', 'ar', 'es'];
    if (!validLanguages.includes(language)) {
      Err(400, this.t('invalidLanguage'));
    }
    return true;
  }

  validateTheme(theme: string): boolean {
    const validThemes = ['light', 'dark'];
    if (!validThemes.includes(theme)) {
      Err(400, this.t('invalidTheme'));
    }
    return true;
  }

  validateTimeFormat(timeFormat: string): boolean {
    const validTimeFormats = ['12', '24'];
    if (!validTimeFormats.includes(timeFormat)) {
      Err(400, this.t('invalidTimeFormat'));
    }
    return true;
  }

  validateDateFormat(dateFormat: string): boolean {
    const validDateFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
    if (!validDateFormats.includes(dateFormat)) {
      Err(400, this.t('invalidDateFormat'));
    }
    return true;
  }

  validateLunchBreakDuration(duration: number): boolean {
    if (duration < 0 || duration > 180) {
      Err(400, this.t('invalidLunchBreakDuration'));
    }
    return true;
  }

  validateGradingPeriods(periods: number): boolean {
    if (periods < 1 || periods > 12) {
      Err(400, this.t('invalidGradingPeriods'));
    }
    return true;
  }

  async ensureExists(id: string): Promise<boolean> {
    return this.checkSettingsExists(id);
  }

  async ensureIdUnique(id: string) {
    return this.checkSettingsIdIsUnique(id);
  }

}
