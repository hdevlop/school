import { bootRefreshScript } from 'najm-auth/client';
import { defineAuth } from 'najm-auth/client/server';

import { schoolApp } from '@/najm.config';

/**
 * Starts a signed-in page's first token refresh from its HTML; the root layout
 * renders it. A page is hydrated with its user but no access token, so every
 * data request waits for that refresh, which the client sent only once all of
 * its JavaScript had run: 1.3-1.9 s into a phone's load on JHL. It asks the
 * endpoint the client's first refresh would (defineAuth's defaults included),
 * so the client takes this answer instead of asking again.
 */
export const authBootRefreshScript = bootRefreshScript({
  url: `${schoolApp.auth.apiBaseURL ?? '/api'}${schoolApp.auth.authPrefix ?? '/auth'}/refresh`,
});

export const auth = defineAuth({
  ...schoolApp.auth,
  // The proxy answers a recovery that failed for a passing reason (the server
  // busy or unreachable) with the same login redirect as a signed-out visitor.
  // Only this log tells the two apart. The failure carries no secrets.
  onRecoveryFailure: (failure) => {
    console.warn('[school] session recovery failed', failure);
  },
});
