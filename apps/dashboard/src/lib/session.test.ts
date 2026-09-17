import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const serverBootstrap = read('../najm.server.ts');
const appConfig = read('../najm.config.ts');
const authConfig = read('../najm.auth.ts');
const proxy = read('../proxy.ts');
const routeHandlers = read('../app/api/[[...route]]/route.ts');

const sessionConsumers = {
  'app/layout.tsx': read('../app/layout.tsx'),
  '(auth)/layout.tsx': read('../app/(auth)/layout.tsx'),
  '(dashboard)/layout.tsx': read('../app/(dashboard)/layout.tsx'),
};

describe('the server session boundary is package-owned', () => {
  it('delegates to exactly one Next adapter, at module scope', () => {
    expect(serverBootstrap).toContain("from 'najm-next/app/next'");
    const calls = serverBootstrap
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('createNajmNextServerApp('));

    expect(calls).toEqual(['export const najmServer = createNajmNextServerApp({']);
    expect(serverBootstrap).not.toContain('createReactServerAuth(');
    expect(serverBootstrap).not.toContain("from 'next/headers'");
  });

  it('keeps the server-only marker first', () => {
    expect(serverBootstrap).toStartWith("import 'server-only';");
  });

  it('preserves typed route-facing accessors without local guard logic', () => {
    expect(serverBootstrap).toContain(
      'export const { getSession, requireSession, requireRole, loadSettings, loadUiSnapshot } = najmServer',
    );
    expect(serverBootstrap).not.toContain("from 'next/navigation'");
    expect(serverBootstrap).not.toContain('session.roles ??');
  });
});

describe('the proxy and core config stay free of React-server code', () => {
  it('proxy.ts composes the core auth and shared location policy', () => {
    expect(proxy).toContain("import { auth } from '@/najm.auth'");
    expect(proxy).toContain('composeNajmProxy({');
    expect(proxy).not.toContain('resolveLocationCsp');
    expect(proxy).not.toContain('@/najm.server');
    expect(proxy).not.toContain('client/server/react');
  });

  it('najm.auth.ts derives policy from the shared-safe definition', () => {
    expect(authConfig).toContain("from 'najm-auth/client/server'");
    expect(authConfig).toContain("from '@/najm.config'");
    expect(authConfig).toContain('defineAuth(schoolApp.auth)');
    expect(authConfig).not.toContain('client/server/react');
    expect(appConfig).toContain("proxySessionMode: 'authoritative'");
    expect(appConfig).not.toContain('verifyAlways');
  });

  it('removes the cookie-presence prefetch authorization bypass', () => {
    expect(proxy).not.toContain('hasRefreshToken');
    expect(proxy).not.toContain('isSpeculativePrefetch');
  });

  it('composes every optional catch-all verb and stable Remember Me cookie', () => {
    expect(routeHandlers).toContain("import { auth } from '@/najm.auth'");
    expect(routeHandlers).toContain('const handlers = auth.routeHandlers(serverHandler)');
    expect(routeHandlers).not.toContain('rememberCookieName:');
    expect(appConfig).toContain("rememberCookieName: 'sms.remember'");
  });
});

describe('every server boundary shares one resolution', () => {
  it('the root loads one public UI snapshot', () => {
    expect(sessionConsumers['app/layout.tsx']).toContain("from '@/najm.server'");
    expect(sessionConsumers['app/layout.tsx']).toContain('await loadUiSnapshot()');
  });

  it.each([
    ['(auth)/layout.tsx', 'getSession'],
    ['(dashboard)/layout.tsx', 'requireSession'],
  ] as const)('%s resolves %s through @/najm.server', (name, accessor) => {
    expect(sessionConsumers[name]).toContain("from '@/najm.server'");
    expect(sessionConsumers[name]).toContain(`${accessor}()`);
  });

  it.each(Object.entries(sessionConsumers))(
    '%s does not rewrite an operational failure as anonymous',
    (_name, source) => {
      expect(source).not.toContain('catch(() => null)');
      expect(source).not.toMatch(/getSession\(\)\s*\.catch/);
    },
  );
});
