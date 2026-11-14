import { schoolI18n, type SchoolLocale } from '@sms/contracts/locales';
import { Inject, LoggerService, Service } from '../../najm';
import { AlertRepository } from '../alerts/AlertRepository';
import { SettingsRepository } from '../settings/SettingsRepository';
import { readStorageSpace, storageAlertStep, type StorageSpace } from './storageSpace';

const HOUR = 60 * 60 * 1000;
const GB = 1024 ** 3;

/**
 * Watches the disk that holds uploaded files. The disk is shared with other
 * installations, so the level is a share of the whole disk, not of School's
 * own files. Staff with school-wide reads get one system alert when free
 * space falls under 20%, and another under 10%.
 */
@Service()
export class StorageMonitorService {
  @Inject(LoggerService) private log!: LoggerService;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private settings: SettingsRepository, private alerts: AlertRepository) {}

  async onInit() {
    await this.sweep();
    this.timer = setInterval(() => { void this.sweep(); }, HOUR);
    this.timer.unref();
  }

  onDestroy() { clearInterval(this.timer); }

  private async sweep() {
    if (this.running) return;
    this.running = true;
    try { await this.check(); }
    catch (error) { this.log.error('Storage space check failed; the next sweep will retry', error); }
    finally { this.running = false; }
  }

  async check(space: StorageSpace | null = null) {
    const reading = space ?? await readStorageSpace();
    // No installation yet, or a disk that cannot be read: nothing to compare.
    const current = await this.settings.getAdminSettings();
    if (!reading || !current) return null;

    const step = storageAlertStep(reading, current.storageAlertLevel);
    if (step.alert !== null) {
      const language = (current.language ?? 'en') as SchoolLocale;
      const kind = step.alert === 10 ? 'critical' : 'low';
      const numbers = {
        percent: Math.floor(step.freePercent),
        free: (reading.freeBytes / GB).toFixed(1),
        total: (reading.totalBytes / GB).toFixed(1),
      };
      await this.alerts.createSystemNotice({
        title: schoolI18n.translate(language, `alerts.storage.${kind}Title`, numbers),
        message: schoolI18n.translate(language, `alerts.storage.${kind}Message`, numbers),
        priority: step.alert === 10 ? 'critical' : 'high',
      });
    }
    // Remembered after the alert is written, so a failed write alerts next time.
    if (step.level !== current.storageAlertLevel) {
      await this.settings.update(current.id, { storageAlertLevel: step.level });
    }
    return step;
  }
}
