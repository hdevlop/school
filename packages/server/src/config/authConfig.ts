import { guards } from 'najm-guard';

import { auth, isAuth } from '../auth';
import { resolveCacheConfig } from './cacheConfig';
import { resolveEmailConfig } from './emailConfig';
import { resolveTrustedProxyHops } from './rateLimitConfig';

/**
 * Sign-in and route guards.
 *
 *   NAJM_ENCRYPTION_KEY   najm-auth's encryption key
 *
 * auth also reads the cache, email and rate-limit variables; see those files.
 */

/**
 * Registered before `auth()`, so a route that declares no guard asks for
 * sign-in instead of being public. A safety net, not a policy: give each route
 * the guard its data needs, and mark a deliberately public one `@Public()`.
 */
export const guardConfig = () => guards({ default: [isAuth()] });

export const authConfig = () =>
  auth({
    dialect: 'pg',
    encryptionKey: process.env.NAJM_ENCRYPTION_KEY,
    cache: resolveCacheConfig(),
    rateLimit: { trustedProxyHops: resolveTrustedProxyHops() },
    // najm-auth declares its own email plugin dependency. Forward the same
    // resolved transport config so builds and runtime startup do not rely on a
    // global EMAIL_PROVIDER merely to resolve that dependency.
    email: resolveEmailConfig(),
    // A self-registered account waits for an administrator, who activates it
    // and gives it a role. It used to be active at once, with no role, and
    // could sign in and call every route that asks only for sign-in. Accounts
    // School creates for staff, families and users pass an explicit status.
    registrationMode: 'pending',
  });
