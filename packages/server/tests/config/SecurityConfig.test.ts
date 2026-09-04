import { afterEach, describe, expect, it } from 'bun:test';
import { resolveClientAddress } from 'najm-rate';

import { mcpConfig, rateLimitConfig, resolveTrustedProxyHops } from '@server/config';

const originalNodeEnv = process.env.NODE_ENV;
const originalHops = process.env.SCHOOL_TRUSTED_PROXY_HOPS;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalHops === undefined) delete process.env.SCHOOL_TRUSTED_PROXY_HOPS;
  else process.env.SCHOOL_TRUSTED_PROXY_HOPS = originalHops;
});

describe('shared security configuration', () => {
  it('protects same-origin MCP discovery and sanitizes failures', () => {
    expect(mcpConfig().config).toMatchObject({
      auth: { type: 'najm-auth' },
      cors: false,
      exposeErrorDetails: false,
    });
  });

  it('uses the exact production proxy boundary and trusts none locally', () => {
    delete process.env.SCHOOL_TRUSTED_PROXY_HOPS;
    process.env.NODE_ENV = 'production';
    expect(resolveTrustedProxyHops()).toBe(1);
    expect(rateLimitConfig().config.trustedProxyHops).toBe(1);

    process.env.NODE_ENV = 'development';
    expect(resolveTrustedProxyHops()).toBe(0);
  });

  it('rejects invalid or excessive proxy-hop overrides', () => {
    process.env.SCHOOL_TRUSTED_PROXY_HOPS = '-1';
    expect(() => resolveTrustedProxyHops()).toThrow('from 0 to 8');

    process.env.SCHOOL_TRUSTED_PROXY_HOPS = '9';
    expect(() => resolveTrustedProxyHops()).toThrow('from 0 to 8');
  });

  it('ignores attacker-prepended addresses at the configured boundary', () => {
    const first = resolveClientAddress(
      { 'x-forwarded-for': '198.51.100.10, 203.0.113.7' },
      1,
    );
    const rotated = resolveClientAddress(
      { 'x-forwarded-for': '192.0.2.44, 203.0.113.7' },
      1,
    );
    expect(rotated).toBe(first);
  });
});
