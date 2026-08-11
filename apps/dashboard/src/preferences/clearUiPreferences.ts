import { SCHOOL_UI_PREFERENCE_ENDPOINTS } from './cookies';

/**
 * Clears the three School UI preference cookies.
 *
 * Called on sign-out. The cookies outrank the signed-in user's stored
 * preferences by design — they are the more recent explicit choice — so on a
 * shared machine an uncleared cookie would render the next person's session in
 * the previous person's language, theme, and time zone.
 *
 * Best-effort and never blocking: failing to clear a display preference must
 * not keep someone signed in. Each response is ignored, and the redirect that
 * follows re-renders against whatever cookies survived.
 */
export async function clearSchoolUiPreferences(): Promise<void> {
  await Promise.allSettled(
    Object.values(SCHOOL_UI_PREFERENCE_ENDPOINTS).map((endpoint) =>
      fetch(endpoint, { method: 'DELETE', credentials: 'same-origin' }),
    ),
  );
}
