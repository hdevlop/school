import { api, fileRequest, fileUpload } from './http';

/** Bytes received so far; `total` is null when the response does not state its size. */
export type BackupTransferProgress = { loaded: number; total: number | null };

/**
 * The whole school as one ZIP, with the name the server gave it. The server
 * builds the file before it answers, so `onProgress` first fires when the
 * transfer starts: until then the only thing known is that it is still preparing.
 */
export async function downloadBackupApi(onProgress?: (progress: BackupTransferProgress) => void) {
  const response = await fileRequest('GET', '/backup');
  const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'school-backup.zip';
  if (!onProgress || !response.body) return { file: await response.blob(), name };

  const total = Number(response.headers.get('X-Backup-Bytes')) || null;
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  onProgress({ loaded, total });
  const reader = response.body.getReader();
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    chunks.push(part.value);
    loaded += part.value.byteLength;
    onProgress({ loaded, total });
  }
  return { file: new Blob(chunks, { type: 'application/zip' }), name };
}

/** Replaces all of the school's data with the backup; everyone is signed out afterwards. */
export async function restoreBackupApi(file: Blob, onProgress: (progress: BackupTransferProgress) => void) {
  const body = file.type === 'application/zip' ? file : new Blob([file], { type: 'application/zip' });
  return fileUpload('/backup/restore', body, onProgress);
}

/** Deletes all of the school's data and restores the defaults; everyone is signed out afterwards. */
export async function resetSchoolApi(password: string) {
  const response = await api.post('/backup/reset', { password });
  return response.data;
}
