import { unzipSync, strFromU8 } from 'fflate';
import { BACKUP_MANIFEST_NAME, isBackupManifest, MAX_BACKUP_BYTES, type BackupManifest } from '@sms/contracts/backup';

/** What the restore sheet lists from a backup, in this order; files come from the manifest's file count. */
export const BACKUP_CONTENT_TABLES = ['students', 'parents', 'teachers', 'staff', 'users', 'fees', 'payments', 'attendance', 'grades'] as const;

export type BackupFileCheck =
  | { ok: true; manifest: BackupManifest }
  | { ok: false; error: 'backup.errors.tooLarge' | 'backup.errors.invalidFile' };

/** Reads only the manifest of a chosen backup, so the sheet can show what it holds before anything is sent. */
export async function readBackupManifest(file: Blob): Promise<BackupFileCheck> {
  if (file.size > MAX_BACKUP_BYTES) return { ok: false, error: 'backup.errors.tooLarge' };
  try {
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: ({ name }) => name === BACKUP_MANIFEST_NAME });
    const manifest: unknown = entries[BACKUP_MANIFEST_NAME] ? JSON.parse(strFromU8(entries[BACKUP_MANIFEST_NAME])) : null;
    return isBackupManifest(manifest) ? { ok: true, manifest } : { ok: false, error: 'backup.errors.invalidFile' };
  } catch {
    return { ok: false, error: 'backup.errors.invalidFile' };
  }
}

/** Saves a downloaded file. The link outlives the click so the browser can name the file. */
export function saveBackupFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 40_000);
}
