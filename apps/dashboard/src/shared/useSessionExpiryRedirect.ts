'use client';

import { useAuthEvent } from 'najm-auth/client/react';
import { schoolApp } from '@/najm.config';

/**
 * Sends the user to sign in when the session ends while a page is open. The
 * server checks the session only when it renders a page, so a session revoked
 * or expired afterwards used to leave the shell up: the sidebar fell back to
 * the teacher's, and every read answered 401 and showed as an empty list.
 *
 * A full navigation lets the proxy clear the dead cookies, and `from` brings
 * the user back to this page, as the proxy's own redirect does. A normal
 * logout emits `logout`, not `sessionExpired`, so the sign-out button keeps
 * its own navigation and clears the UI preferences first.
 */
export function useSessionExpiryRedirect() {
  useAuthEvent('sessionExpired', () => {
    const login = new URL(schoolApp.auth.loginRoute, window.location.origin);
    login.searchParams.set('from', `${window.location.pathname}${window.location.search}`);
    window.location.assign(login.toString());
  });
}
