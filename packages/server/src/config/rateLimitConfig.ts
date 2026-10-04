import { rateLimit } from 'najm-rate';

import { envInt, isProduction } from './env';

/**
 * Rate limits key on the client address, read from X-Forwarded-For through
 * this many trusted proxies. Too few and every client shares the proxy's
 * address; too many and a client can forge its own.
 *
 *   SCHOOL_TRUSTED_PROXY_HOPS   0-8. Default 1 in production, 0 elsewhere.
 */

const MAX_TRUSTED_PROXY_HOPS = 8;

export const resolveTrustedProxyHops = () =>
  envInt('SCHOOL_TRUSTED_PROXY_HOPS', process.env.SCHOOL_TRUSTED_PROXY_HOPS, {
    fallback: isProduction() ? 1 : 0,
    max: MAX_TRUSTED_PROXY_HOPS,
  });

export const rateLimitConfig = () => rateLimit({ trustedProxyHops: resolveTrustedProxyHops() });
