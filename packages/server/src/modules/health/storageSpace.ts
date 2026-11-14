import { statfs } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { storageBasePath } from '../../config/storageConfig';

export type StorageSpace = { freeBytes: number; totalBytes: number };

/**
 * Free and total bytes of the disk that holds uploaded files, or null when it
 * cannot be read. The folder is created by the first upload, so a missing
 * folder is answered from its nearest existing parent: the same disk.
 */
export async function readStorageSpace(path = resolve(storageBasePath())): Promise<StorageSpace | null> {
  for (let current = path; ;) {
    try {
      const stats = await statfs(current);
      const totalBytes = Number(stats.blocks) * Number(stats.bsize);
      if (!totalBytes) return null;
      return { freeBytes: Number(stats.bavail) * Number(stats.bsize), totalBytes };
    } catch (error) {
      const parent = dirname(current);
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT' || parent === current) return null;
      current = parent;
    }
  }
}

/** Free-space levels, in percent, that alert the school once each. */
export const STORAGE_ALERT_LEVELS = [20, 10] as const;
export type StorageAlertLevel = typeof STORAGE_ALERT_LEVELS[number];

/**
 * What a reading of the disk changes. `level` is what to remember: the lowest
 * level free space is under, or null once it is above them all. `alert` is
 * set only when that level was not already alerted, so 25% → 18% alerts once,
 * 18% → 8% alerts once more, and 8% → 15% → 8% alerts again.
 */
export function storageAlertStep(space: StorageSpace, lastLevel: number | null) {
  const freePercent = (space.freeBytes / space.totalBytes) * 100;
  const level = [...STORAGE_ALERT_LEVELS].reverse().find((threshold) => freePercent < threshold) ?? null;
  const alert = level !== null && (lastLevel === null || level < lastLevel) ? level : null;
  return { level, alert, freePercent };
}
