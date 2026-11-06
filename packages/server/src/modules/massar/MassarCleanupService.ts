import { Inject, LoggerService, Service, Transaction } from '../../najm';
import { StorageService } from 'najm-storage';
import { MassarRepository } from './MassarRepository';

const HOUR = 60 * 60 * 1000;

/** Trusted maintenance owns only Massar's private files, across academic years. */
@Service()
export class MassarCleanupService {
  @Inject(LoggerService) private log!: LoggerService;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private repository: MassarRepository, private storage: StorageService) {}

  async onInit() {
    await this.sweep();
    this.timer = setInterval(() => { void this.sweep(); }, 5 * 60 * 1000);
    this.timer.unref();
  }
  onDestroy() { clearInterval(this.timer); }
  private async sweep() {
    if (this.running) return;
    this.running = true;
    try { await this.cleanup(); }
    catch (error) { this.log.error('Massar storage cleanup failed; the next sweep will retry', error); }
    finally { this.running = false; }
  }

  @Transaction()
  async cleanup(now = new Date()) {
    // Skip a preview locked by Confirm. Delete the file first so an I/O error
    // leaves its expired database reference available for a later retry.
    for (const preview of await this.repository.expiredPreviewsForMaintenance(now.toISOString())) {
      await this.storage.delete('massar', preview.fileId);
      await this.repository.removeExpiredPreviewForMaintenance(preview.id, now.toISOString());
    }
    const { previews, templates } = await this.repository.storageReferencesForMaintenance();
    const retained = new Set([...previews, ...templates].map(row => row.fileId));
    for (const file of await this.storage.list('massar')) {
      // The grace period protects files saved by an import still in flight.
      // It also recovers originals left by a crash or a failed old cleanup.
      if (/^[\w-]+_(?:preview\.txt|template\.xlsx)$/.test(file.filePath) && !retained.has(file.filePath) && Date.parse(file.updatedAt) <= now.getTime() - HOUR) {
        await this.storage.delete('massar', file.filePath);
      }
    }
  }
}
