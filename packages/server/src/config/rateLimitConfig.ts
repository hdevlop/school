import { isProduction } from 'najm-core/env';
import { rateLimit } from 'najm-rate';
import { env } from '../env';

/**
 * Rate limits key on the client address, read from X-Forwarded-For through
 * `env.app.trustedProxyHops` trusted proxies.
 *
 * `next dev` route handlers expose no socket peer, so with 0 hops no request
 * has a client address. Skip before address resolution in that local setup.
 * In production an unresolved address still counts in one shared bucket.
 */

export const rateLimitConfig = () => {
  const production = isProduction();
  const trustedProxyHops = env.app.trustedProxyHops;
  return rateLimit({
    trustedProxyHops,
    skip: !production && trustedProxyHops === 0 ? () => true : undefined,
    onUnresolvedClient: production ? 'shared' : 'skip',
  });
};
