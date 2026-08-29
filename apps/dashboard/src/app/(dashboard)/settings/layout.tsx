import { serverAuth } from '@/lib/session';

// Reads the per-request session cookie, so it cannot be prerendered.
export const dynamic = 'force-dynamic';

/**
 * Settings is the one screen restricted to a subset of signed-in roles, and the
 * restriction belongs on the server.
 *
 * It used to be a `useEffect` in the page that called `router.replace('/')`
 * once the client knew the role. That redirect raced the session verification
 * every full page load performs: the two overlapping refreshes rotated each
 * other's token, and the visitor was signed out and sent to `/login` instead of
 * being returned to the dashboard. Deciding here means the wrong role never
 * loads the route at all — no client navigation, and nothing to race.
 *
 * Backend authorization remains authoritative for the settings data itself.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await serverAuth.requireRole(['admin', 'principal']);

  return children;
}
