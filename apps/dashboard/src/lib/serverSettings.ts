import 'server-only';

import { cache } from 'react';

import type { SchoolUiSettings } from '@sms/server';

/**
 * School settings as the first server render sees them, resolved once per
 * React request.
 *
 * `cache()` rather than a module-level promise: root, auth, and dashboard
 * layouts all read this within one render and must agree, while the next
 * request must see a settings change an administrator just saved.
 *
 * The server package is imported dynamically for the same reason
 * `serverTheme.ts` does it — the layout module graph should not pull the whole
 * backend in at import time.
 *
 * Returns `null` both for an installation that has no settings row yet and for
 * a read that failed. These are display preferences with typed fallbacks
 * behind them, and taking the login screen down because the row could not be
 * read would turn a cosmetic degradation into an outage. The failure is
 * reported, not swallowed silently — and only its shape is, never the row, the
 * connection string, or the raw thrown value.
 */
export const loadSchoolSettings = cache(async (): Promise<SchoolUiSettings | null> => {
  try {
    const { loadSchoolUiSettings } = await import('@sms/server');
    return await loadSchoolUiSettings();
  } catch (error) {
    console.warn(
      '[settings] ui-snapshot-unavailable: falling back to typed defaults',
      error instanceof Error ? error.name : 'unknown',
    );
    return null;
  }
});
