import { fileRequest } from './http';

/** The whole school as one ZIP, with the name the server gave it. */
export async function downloadBackupApi() {
  const response = await fileRequest('GET', '/backup');
  const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'school-backup.zip';
  return { file: await response.blob(), name };
}

/** Replaces all of the school's data with the backup; everyone is signed out afterwards. */
export async function restoreBackupApi(file: Blob) {
  const body = file.type === 'application/zip' ? file : new Blob([file], { type: 'application/zip' });
  const response = await fileRequest('POST', '/backup/restore', body);
  return response.json();
}
