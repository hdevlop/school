/** School's read-only protocol. Never contains credentials or command outcomes. */
export const OFFLINE_PROTOCOL = 1;
export const OFFLINE_SCHEMA = 1;
export const OFFLINE_DURATION_MS = 8 * 60 * 60 * 1000;
export const OFFLINE_RENEWAL_MS = 15 * 60 * 1000;
export const OFFLINE_SHARED_YEAR = 'shared';
export const OFFLINE_HASH = 'school-read-v1';
export type OfflineInstallation = { installationId: string; installationEpoch: string };
export type OfflineGrant = OfflineInstallation & {
  protocol: 1;
  schema: 1;
  accountId: string;
  authorizationGeneration: string;
  issuedAt: number;
  validUntil: number;
  scopes: { id: string; academicYear: string; capabilities: string[] }[];
  account: { id: string; name: string | null; role: string; email: string | null; image: string | null };
  permissions: string[];
  activeYear: string;
};
export type ReadProjection = {
  path: string;
  language: string;
  downloadedAt: number;
  body: unknown;
};

/** No query family is implied by these exact projections. */
export function offlineRoute(path: string): { path: string; shared: boolean; capability: string } | null {
  // Reject external URLs, queries (including dated lists), fragments and encoded separators.
  if (!path.startsWith('/') || path.startsWith('//') || /[?#%\\]/.test(path)) return null;
  const normalized = path.replace(/\/$/, '') || '/';
  if (normalized === '/settings/public' || normalized === '/academic-years') {
    return { path: normalized, shared: true, capability: 'read:students' };
  }
  if (normalized === '/classes') return { path: normalized, shared: false, capability: 'read:classes' };
  if (normalized === '/students' || /^\/students\/[A-Za-z0-9_-]+(?:\/(?:parents|enrollments))?$/.test(normalized)) {
    if (['/students/count', '/students/my-identity'].includes(normalized)) return null;
    return { path: normalized, shared: false, capability: 'read:students' };
  }
  return null;
}

/**
 * Write routes whose tables the projections above read: students, parents,
 * enrollments and placements, classes and sections with their staff, public
 * settings and academic years. A write here makes retained copies unusable
 * until a replacement downloads; any other write is reflected by the next
 * scheduled replacement, at most OFFLINE_RENEWAL_MS later.
 */
const OFFLINE_WRITE_PREFIXES = ['/students', '/parents', '/profiles/students', '/profiles/parents', '/student-enrollments',
  '/classes', '/sections', '/cycles', '/teachers', '/staff', '/settings', '/academic-years', '/academic-year-migration-issues',
  '/rollover', '/admin/access/users'];
export function offlineWriteAffectsReads(path: string) {
  return OFFLINE_WRITE_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?'));
}

export function projectionId(language: string, path: string) { return JSON.stringify([language, path]); }
export class OfflineUnavailableError extends Error {
  readonly code = 'OFFLINE_DATA_UNAVAILABLE';
  constructor() { super('This data has not been downloaded or offline access is unavailable.'); }
}
