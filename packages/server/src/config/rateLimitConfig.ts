import { envInt, isProduction } from 'najm-core/env';
import { MAX_TRUSTED_PROXY_HOPS, rateLimit } from 'najm-rate';

/**
 * Rate limits key on the client address, read from X-Forwarded-For through
 * this many trusted proxies. Too few and every client shares the proxy's
 * address; too many and a client can forge its own.
 *
 *   SCHOOL_TRUSTED_PROXY_HOPS   0-8. Default 1 in production, 0 elsewhere.
 *
 * `next dev` route handlers expose no socket peer, so with 0 hops no request
 * has a client address. Skip before address resolution in that local setup.
 * In production an unresolved address still counts in one shared bucket.
 */

export const rateLimitConfig = () => {
  const production = isProduction();
  const trustedProxyHops = envInt('SCHOOL_TRUSTED_PROXY_HOPS', process.env.SCHOOL_TRUSTED_PROXY_HOPS, {
    fallback: production ? 1 : 0,
    max: MAX_TRUSTED_PROXY_HOPS,
  });
  return rateLimit({
    trustedProxyHops,
    skip: !production && trustedProxyHops === 0 ? () => true : undefined,
    onUnresolvedClient: production ? 'shared' : 'skip',
  });
};
