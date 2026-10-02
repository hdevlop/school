import { requirePageAccess } from '@/shared/requirePageAccess';

// Reads the per-request session cookie, so it cannot be prerendered.
export const dynamic = 'force-dynamic';

/**
 * Settings follows the shared page access rule on the server.
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
  await requirePageAccess('settings');

  return children;
}
