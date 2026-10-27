import { describe, expect, it } from 'bun:test';

function configuration(mode: string, hops?: string) {
  const env = { ...process.env, NODE_ENV: mode };
  if (hops === undefined) delete env.SCHOOL_TRUSTED_PROXY_HOPS;
  else env.SCHOOL_TRUSTED_PROXY_HOPS = hops;
  const moduleUrl = new URL('../../src/config/rateLimitConfig.ts', import.meta.url).href;
  const result = Bun.spawnSync([process.execPath, '-e', `
    const { rateLimitConfig } = await import(${JSON.stringify(moduleUrl)});
    const { config } = rateLimitConfig();
    console.log(JSON.stringify({ hops: config.trustedProxyHops,
      skipped: config.skip?.({}) ?? false, unresolved: config.onUnresolvedClient }));
  `], { env });
  expect(result.exitCode).toBe(0);
  return JSON.parse(new TextDecoder().decode(result.stdout));
}

describe('rate limit environment policy', () => {
  it('skips local requests before resolving an unavailable socket address', () => {
    expect(configuration('development')).toEqual({ hops: 0, skipped: true, unresolved: 'skip' });
    expect(configuration('test', '0')).toEqual({ hops: 0, skipped: true, unresolved: 'skip' });
  });

  it('keeps rate limiting enabled with an explicit development proxy', () => {
    expect(configuration('development', '1')).toEqual({ hops: 1, skipped: false, unresolved: 'skip' });
  });

  it('never skips production requests, including a zero-hop deployment', () => {
    expect(configuration('production')).toEqual({ hops: 1, skipped: false, unresolved: 'shared' });
    expect(configuration('production', '0')).toEqual({ hops: 0, skipped: false, unresolved: 'shared' });
  });
});
