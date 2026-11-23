import { api, fileRequest } from './http';

/**
 * Imported desk-card backgrounds are images in the school's file storage under
 * this namespace. Listing, importing and deleting are storage management, which
 * the server allows admins only; serving them to a signed-in user is open.
 */
const NAMESPACE = 'desk-card-backgrounds';

export type DeskCardBackgroundFile = { filePath: string; url: string; createdAt: string };

type StoredFile = { filePath: string; mimeType?: string; createdAt?: string };

export const deskCardBackgroundUrl = (filePath: string) =>
  `/api/${NAMESPACE}/files/serve/${filePath.split('/').map(encodeURIComponent).join('/')}`;

/** The imported backgrounds, newest first. */
export async function getDeskCardBackgroundsApi(): Promise<DeskCardBackgroundFile[]> {
  const res = await api.get(`/${NAMESPACE}/files`);
  const body = res.data;
  const files: StoredFile[] = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  return files
    .filter((file) => !file.mimeType || file.mimeType.startsWith('image/'))
    .map((file) => ({ filePath: file.filePath, url: deskCardBackgroundUrl(file.filePath), createdAt: file.createdAt ?? '' }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

export async function importDeskCardBackgroundApi(file: File) {
  await fileRequest('POST', `/${NAMESPACE}/files/${deskCardBackgroundFileName(file.name, file.type)}`, file);
}

export async function deleteDeskCardBackgroundApi(filePath: string) {
  await api.delete(`/${NAMESPACE}/files/${filePath.split('/').map(encodeURIComponent).join('/')}`);
}
