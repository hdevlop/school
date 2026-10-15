import { describe, expect, it } from 'bun:test';
import { auth } from '@/najm.auth';
import { loginRedirectPath } from '@/shared/loginRedirect';

describe('public homepage and protected portal', () => {
  it.each(['/', '/?source=website', '/welcome', '/login'])('allows signed-out navigation to %s', async (path) => {
    const response = await auth.proxy(new Request(`https://school.example${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/home', '/dashboard', '/students', '/users', '/students/owned-fixture?tab=fees', '/welcome/private'])('keeps %s protected when the root is public', async (path) => {
    const response = await auth.proxy(new Request(`https://school.example${path}`));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.origin).toBe('https://school.example');
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('from')).toBe(path);
  });
});

describe('post-login destination', () => {
  it.each([null, undefined, '', '/', '/?source=website', '/welcome', '/welcome/', '/welcome/#contact', '/login', '/register', '/forgot-password', '/reset-password?token=discarded', '/change-password', '/api/auth/session', '/_next/static/test.js', '/images/test.png', '/storage/test', '/favicon.ico', '/sw.js', 'https://outside.example', '//outside.example', '/\\outside.example', '/\noutside.example', '/students/../login', '/%2e%2e/login'])('uses the protected home for an unsuitable return path: %s', (from) => {
    expect(loginRedirectPath(from)).toBe('/home');
  });

  it.each(['/home', '/dashboard', '/students/owned-fixture?tab=fees#history', '/grades?academicYear=2026-2027'])('preserves the app deep link %s', (from) => {
    expect(loginRedirectPath(from)).toBe(from);
  });
});
