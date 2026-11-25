import { api, fileRequest } from './http';

/**
 * Imported desk-card backgrounds are images in the school's file storage under
 * this namespace. Listing, importing and deleting ask for
 * update:desk-card-backgrounds (the server's StorageManageGuard); serving them
 * to a signed-in user is open.
 */
const NAMESPACE = 'desk-card-backgrounds';

export type DeskCardBackgroundFile = { filePath: string; url: string; createdAt: string };

type StoredFile = { filePath: string; mimeType?: string; createdAt?: string };

export const deskCardBackgroundUrl = (filePath: string) =>
  `/api/${NAMESPACE}/files/serve/${filePath.split('/').map(encodeURIComponent).join('/')}`;

/**
 * When a background was imported: the timestamp its file name starts with
 * (`deskCardBackgroundFileName`), else the storage's own date. The storage date
 * is the file's birth time, which a Linux container often does not record, so
 * on its own it left every import tied and the order arbitrary.
 */
export function deskCardBackgroundImportedAt(file: { filePath: string; createdAt?: string }) {
  const stamp = /^(\d{13})-/.exec(file.filePath.split('/').pop() ?? '')?.[1];
  if (stamp) return Number(stamp);
  const stored = Date.parse(file.createdAt ?? '');
  return Number.isFinite(stored) ? stored : 0;
}

/** The imported backgrounds, newest first. */
export async function getDeskCardBackgroundsApi(): Promise<DeskCardBackgroundFile[]> {
  const res = await api.get(`/${NAMESPACE}/files`);
  const body = res.data;
  const files: StoredFile[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return files
    .filter((file) => !file.mimeType || file.mimeType.startsWith('image/'))
    .sort((a, b) => deskCardBackgroundImportedAt(b) - deskCardBackgroundImportedAt(a))
    .map((file) => ({ filePath: file.filePath, url: deskCardBackgroundUrl(file.filePath), createdAt: file.createdAt ?? '' }));
}

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * A storage-safe file name: a timestamp, the original name's letters and
 * digits, and the extension of the image's type rather than of its name.
 */
export function deskCardBackgroundFileName(name: string, mimeType: string, now = Date.now()) {
  const stem = name.replace(/\.[^./\\]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${now}-${stem || 'background'}.${EXTENSIONS[mimeType] ?? 'png'}`;
}

/** Imports the image and resolves to the path it was stored at, so the caller can select exactly it. */
export async function importDeskCardBackgroundApi(file: File) {
  const filePath = deskCardBackgroundFileName(file.name, file.type);
  await fileRequest('POST', `/${NAMESPACE}/files/${filePath}`, file);
  return filePath;
}

export async function deleteDeskCardBackgroundApi(filePath: string) {
  await api.delete(`/${NAMESPACE}/files/${filePath.split('/').map(encodeURIComponent).join('/')}`);
}
