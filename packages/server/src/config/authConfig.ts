import { readFileSync } from 'node:fs';
import { guards } from 'najm-guard';

import { schoolTheme } from '@sms/server/theme';
import { auth, isAuth } from '../auth';

/**
 * Sign-in and route guards.
 *
 *   NAJM_ENCRYPTION_KEY   najm-auth's encryption key
 *   FRONTEND_URL          origin of the set-password link in invitation and
 *                         reset mails (default http://localhost:3000)
 *
 * auth uses the cache, email and rate-limit plugins `src/index.ts` registers
 * before it, so their variables are read in those files. Passing their config
 * here as well would be ignored, and the server warns when it is.
 */

/**
 * Registered before `auth()`, so a route that declares no guard asks for
 * sign-in instead of being public. A safety net, not a policy: give each route
 * the guard its data needs, and mark a deliberately public one `@Public()`.
 */
export const guardConfig = () => guards({ default: [isAuth()] });

// The name the dashboard shows (`najm.config.ts`); mail subjects carry it.
const APP_NAME = 'MyScolAI';

/**
 * The logo embedded in the account invitation mail. It is the same file the
 * sign-in page shows, so an invited teacher recognises the school the link
 * comes from.
 */
function accountInviteLogo() {
  const logo = schoolTheme.asset('authLogo');
  if (!logo) return undefined;
  return {
    alt: APP_NAME,
    contentBase64: readFileSync(logo.sourcePath).toString('base64'),
    contentType: logo.mimeType,
    filename: logo.fileName,
  };
}

export const authConfig = () =>
  auth({
    appName: APP_NAME,
    accountInviteLogo: accountInviteLogo(),
    frontendUrl: process.env.FRONTEND_URL,
    dialect: 'pg',
    encryptionKey: process.env.NAJM_ENCRYPTION_KEY,
    // A self-registered account waits for an administrator, who activates it
    // and gives it a role. It used to be active at once, with no role, and
    // could sign in and call every route that asks only for sign-in. Accounts
    // School creates for staff, families and users pass an explicit status.
    registrationMode: 'pending',
  });
