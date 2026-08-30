import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const session = read('./session.ts');
const authConfig = read('./auth.ts');
const proxy = read('../proxy.ts');
const routeHandlers = read('../app/api/[[...route]]/route.ts');

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
    // Trimmed before comparing: on a CRLF checkout every line carries a
    // trailing `\r`, which has nothing to do with how many adapters exist.
    const calls = session
      .split('\n')
      .map((line) => line.trim())
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

  it('uses the explicit authoritative proxy mode and package proxy alias', () => {
    expect(authConfig).toContain("proxySessionMode: 'authoritative'");
    expect(authConfig).not.toContain('verifyAlways');
    expect(proxy).toContain('auth.proxy(req)');
    expect(proxy).not.toContain('auth.middleware(req)');
  });

  it('composes every Next.js API verb through the shared auth definition', () => {
    expect(routeHandlers).toContain("import { auth } from '@/lib/auth'");
    expect(routeHandlers).toContain(
      'export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = auth.routeHandlers(',
    );
    expect(routeHandlers).toContain("rememberCookieName: 'sms.remember'");
    expect(routeHandlers).not.toContain('withAuthCookiePersistence');
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
