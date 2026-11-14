import { StorageService } from 'najm-storage';
import { HOMEWORK_DEFAULT_RETENTION_DAYS, type HomeworkAttachmentKind } from '@sms/contracts';
import { Inject, LoggerService, Service } from '../../najm';
import { HomeworkAttachmentRepository } from './HomeworkAttachmentRepository';
import { HOMEWORK_FILE_NAME, HOMEWORK_NAMESPACE, homeworkFilePath } from './HomeworkAttachmentService';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Trusted maintenance of homework files, across academic years. The text of
 * a homework is kept; its files expire. Runs at start, then every hour.
 */
@Service()
export class HomeworkCleanupService {
  @Inject(LoggerService) private log!: LoggerService;
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private repository: HomeworkAttachmentRepository, private storage: StorageService) {}

  async onInit() {
    await this.sweep();
    this.timer = setInterval(() => { void this.sweep(); }, HOUR);
    this.timer.unref();
  }

  onDestroy() { clearInterval(this.timer); }

  private async sweep() {
    if (this.running) return;
    this.running = true;
    try { await this.cleanup(); }
    catch (error) { this.log.error('Homework storage cleanup failed; the next sweep will retry', error); }
    finally { this.running = false; }
  }

  async cleanup(now = new Date()) {
    const retentionDays = (await this.repository.storageSettings())?.retentionDays ?? HOMEWORK_DEFAULT_RETENTION_DAYS;

    // 1. Retention: the rows stop pointing at their files. A file is kept
    //    for `retentionDays` full days after the due date.
    const cutoff = new Date(now.getTime() - retentionDays * DAY).toISOString().slice(0, 10);
    const expired = await this.repository.expiredBefore(cutoff);
    await this.repository.markPurged(expired.map((row) => row.id), now.toISOString());

    const live = await this.repository.liveFiles();
    const livePaths = new Set(live.map((row) => homeworkFilePath(row.fileHash, row.kind as HomeworkAttachmentKind)));

    // 2. The files those rows pointed at, unless another live row shares them.
    for (const path of new Set(expired.map((row) => homeworkFilePath(row.fileHash, row.kind as HomeworkAttachmentKind)))) {
      if (!livePaths.has(path)) await this.storage.delete(HOMEWORK_NAMESPACE, path);
    }

    // 3. Files no live row points at: a deleted homework, a failed upload. The
    //    hour protects an upload whose row is not written yet.
    for (const file of await this.storage.list(HOMEWORK_NAMESPACE)) {
      const fileHash = file.filePath.match(HOMEWORK_FILE_NAME)?.[1];
      if (!fileHash || livePaths.has(file.filePath) || Date.parse(file.updatedAt) > now.getTime() - HOUR) continue;
      // Asked again just before deleting: a new upload of the same bytes may
      // have pointed a row at this file since the list above was read.
      if ((await this.repository.liveHashesAmong([fileHash])).size) continue;
      await this.storage.delete(HOMEWORK_NAMESPACE, file.filePath);
    }
  }
}
