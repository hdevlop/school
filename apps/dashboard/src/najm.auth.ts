import { defineAuth } from 'najm-auth/client/server';

import { schoolApp } from '@/najm.config';

export const auth = defineAuth({
  ...schoolApp.auth,
  // The proxy answers a recovery that failed for a passing reason (the server
  // busy or unreachable) with the same login redirect as a signed-out visitor.
  // Only this log tells the two apart. The failure carries no secrets.
  onRecoveryFailure: (failure) => {
    console.warn('[school] session recovery failed', failure);
  },
});
