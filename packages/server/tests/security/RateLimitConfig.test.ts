import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { createNajmServer } from 'najm-api';
import { Server, type NajmPlugin } from 'najm-core';
import { schoolServerOptions } from '../../src/config/server';

const keys = ['NODE_ENV', 'SCHOOL_TRUSTED_PROXY_HOPS'] as const;
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

/** The rate-limit config najm-api's preset registers for School's options. */
function configuration(mode: string, hops?: string) {
  process.env.NODE_ENV = mode;
  if (hops === undefined) delete process.env.SCHOOL_TRUSTED_PROXY_HOPS;
  else process.env.SCHOOL_TRUSTED_PROXY_HOPS = hops;
  const seen: NajmPlugin[] = [];
  const use = Server.prototype.use;
  Server.prototype.use = function (plugin: NajmPlugin) { seen.push(plugin); return use.call(this, plugin); };
  try {
    createNajmServer({ server: { isolated: true, silent: true }, events: false, rateLimit: schoolServerOptions().rateLimit });
  } finally {
    Server.prototype.use = use;
  }
  const { config } = seen.find(plugin => plugin.name === 'rate-limit')!;
  return { hops: config.trustedProxyHops, skipped: config.skip?.({}) ?? false, unresolved: config.onUnresolvedClient };
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
