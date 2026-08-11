import { handle } from '@sms/server/najm';
import server from '@sms/server';
import { withAuthCookiePersistence } from 'najm-auth/client/server';

const serverHandler = handle(server);

export const GET = serverHandler;
// Only POST carries login, logout, refresh and credential-setup bodies, so only
// POST needs the Remember Me rewrite. Najm recognizes its own auth routes and
// its own setup response without configuration; the cookie name is School's,
// and renaming it later would silently restore persistent cookies for a browser
// still holding `sms.remember=0`.
export const POST = withAuthCookiePersistence(serverHandler, {
  rememberCookieName: 'sms.remember',
});
export const PUT = serverHandler;
export const DELETE = serverHandler;
export const PATCH = serverHandler;
export const HEAD = serverHandler;
export const OPTIONS = serverHandler;
