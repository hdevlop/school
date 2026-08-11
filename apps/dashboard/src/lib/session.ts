import 'server-only';

import { createReactServerAuth } from 'najm-auth/client/server/react';

import { auth } from './auth';

/**
 * School's one request-scoped session accessor.
 *
 * The factory must run exactly once, at module scope. React's `cache()` keys on
 * the function identity it returns, so a second instance — or one built inside a
 * layout, page, or helper — would resolve the session again instead of sharing
 * this render's result.
 *
 * Server Components only. Route handlers, the proxy, scripts, and the backend
 * package keep using the core `auth` methods.
 */
export const serverAuth = createReactServerAuth(auth);
