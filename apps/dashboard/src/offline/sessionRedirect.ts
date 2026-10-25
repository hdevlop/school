import { useAuthEvent } from 'najm-auth/client/react';
import { lockRefusedSession } from './runtime';

const LOCK_WAIT_MS = 3000;

/**
 * najm-auth's `useRedirectOnSessionExpired`, except that a refused session's
 * offline lock commits before the page leaves (at most `LOCK_WAIT_MS`).
 */
export function useSignInOnSessionExpired(loginRoute: string) {
  useAuthEvent('sessionExpired', event => {
    const locked = lockRefusedSession(event);
    void Promise.race([locked, new Promise(resolve => setTimeout(resolve, LOCK_WAIT_MS))]).then(() => {
      const login = new URL(loginRoute, window.location.origin);
      login.searchParams.set('from', `${window.location.pathname}${window.location.search}`);
      window.location.assign(login.toString());
    });
  });
}
