import { createWriteMatcher, offlinePath, type OfflineRoute } from 'najm-offline';

/** School's read-only offline use, on najm-offline's protocol. Never contains credentials or command outcomes. */
export { OFFLINE_PROTOCOL, OFFLINE_SCHEMA, OFFLINE_DURATION_MS, OFFLINE_RENEWAL_MS, OFFLINE_SHARED_YEAR, OfflineUnavailableError,
  offlineEnabled, projectionId, type OfflineGrant, type OfflineInstallation, type ReadProjection } from 'najm-offline';
/** Prefixes School's offline storage keys, databases, locks and events. */
export const OFFLINE_NAMESPACE = 'school';
/** An installation turns offline use off with `SCHOOL_OFFLINE=off`, read at request time. */
export const OFFLINE_SWITCH = 'SCHOOL_OFFLINE';

/** No query family is implied by these exact projections. */
export function offlineRoute(path: string): OfflineRoute | null {
  const normalized = offlinePath(path);
  if (!normalized) return null;
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
export const offlineWriteAffectsReads = createWriteMatcher(['/students', '/parents', '/profiles/students', '/profiles/parents',
  '/student-enrollments', '/classes', '/sections', '/cycles', '/teachers', '/staff', '/settings', '/academic-years',
  '/academic-year-migration-issues', '/rollover', '/admin/access/users']);
