import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const session = read('./session.ts');
const authConfig = read('./auth.ts');
const proxy = read('../proxy.ts');

const sessionConsumers = {
  'app/layout.tsx': read('../app/layout.tsx'),
  '(auth)/layout.tsx': read('../app/(auth)/layout.tsx'),
  '(dashboard)/layout.tsx': read('../app/(dashboard)/layout.tsx'),
};

describe('the server session boundary is package-owned', () => {
  it('creates exactly one adapter, at module scope', () => {
    expect(session).toContain(
      "import { createReactServerAuth } from 'najm-auth/client/server/react'",
    );

    // A second call, or one nested inside a function, would build a separate
    // memoized resolver that shares nothing with this one.
    const calls = session
      .split('\n')
      .filter((line) => line.includes('createReactServerAuth('));

    expect(calls).toEqual(["export const serverAuth = createReactServerAuth(auth);"]);
  });

  it('keeps the server-only marker first', () => {
    expect(session).toStartWith("import 'server-only';");
  });

  it('reimplements none of the guard logic Najm now owns', () => {
    for (const owned of [
      "from 'react'", // React.cache
      "from 'next/navigation'", // redirect
      'session.roles ??', // role fallback
      '/login',
    ]) {
      expect(session).not.toContain(owned);
    }
  });
});

describe('the proxy and core config stay free of React-server code', () => {
  it('proxy.ts reaches only the core auth object', () => {
    expect(proxy).toContain("import { auth } from '@/lib/auth'");
    expect(proxy).not.toContain('@/lib/session');
    expect(proxy).not.toContain('client/server/react');
  });

  it('auth.ts imports nothing React-server', () => {
    expect(authConfig).toContain("from 'najm-auth/client/server'");
    expect(authConfig).not.toContain('client/server/react');
    expect(authConfig).not.toContain("from 'react'");
  });

  it('keeps the speculative-prefetch bypass', () => {
    expect(proxy).toContain('isSpeculativePrefetch');
  });
});

describe('every server boundary shares one resolution', () => {
  it.each(Object.entries(sessionConsumers))(
    '%s resolves through @/lib/session',
    (_name, source) => {
      expect(source).toContain("from '@/lib/session'");
    },
  );

  it.each(Object.entries(sessionConsumers))(
    '%s never resolves a session for itself',
    (_name, source) => {
      // auth.getSession() and friends bypass the request cache, so a layout
      // calling them pays for its own cookie verification and recovery.
      expect(/\bauth\.(getSession|requireSession|requireRole)\s*\(/.test(source)).toBe(false);
    },
  );

  it.each(Object.entries(sessionConsumers))(
    '%s does not rewrite an operational failure as an anonymous session',
    (_name, source) => {
      expect(source).not.toContain('catch(() => null)');
      expect(source).not.toMatch(/getSession\(\)\s*\.catch/);
    },
  );

  it('guards the protected tree with requireSession', () => {
    expect(sessionConsumers['(dashboard)/layout.tsx']).toContain(
      'await serverAuth.requireSession()',
    );
  });
});
