import { expect, it } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

it('executes server page guards before rendering, without hiding session failures', () => {
  // Isolate the mocked framework modules from the rest of the config suite.
  // Exercise the real guard while keeping auth, database and network external.
  const result = spawnSync(process.execPath, ['--eval', String.raw`
    import { mock } from 'bun:test';
    import assert from 'node:assert/strict';

    let session;
    let sessionError;
    class Redirect extends Error {
      constructor(path) { super(path); this.path = path; }
    }
    mock.module('server-only', () => ({}));
    mock.module('next/navigation', () => ({ redirect: (path) => { throw new Redirect(path); } }));
    mock.module('./src/najm.server.ts', () => ({
      requireSession: async () => {
        if (sessionError) throw sessionError;
        return session;
      },
    }));
    mock.module('./src/najm.config.ts', () => ({ schoolApp: { auth: { forbiddenRoute: '/denied' } } }));
    const { requirePageAccess } = await import('./src/shared/requirePageAccess.ts');

    for (const role of ['admin', 'principal', 'accounting']) {
      session = { user: { role }, permissions: [] };
      assert.equal(await requirePageAccess('fees'), session);
    }
    session = { user: { role: 'teacher' }, permissions: ['read:students'] };
    assert.equal(await requirePageAccess('students'), session);
    assert.equal(await requirePageAccess('dashboard'), session);
    for (const [access, role, permissions, destination] of [
      ['accessControl', 'principal', ['*:*'], '/denied'],
      ['fees', 'teacher', ['read:fees'], '/denied'],
      ['students', 'teacher', [], '/denied'],
      ['dashboard', 'parent', ['read:students'], '/students'],
      ['dashboard', 'student', ['read:students'], '/students'],
      ['dashboard', 'parent', [], '/notifications'],
      ['dashboard', 'student', [], '/notifications'],
      ['dashboard', 'driver', [], '/notifications'],
      ['dashboard', 'custom-role', [], '/notifications'],
    ]) {
      session = { user: { role }, permissions };
      await assert.rejects(requirePageAccess(access), (error) =>
        error instanceof Redirect && error.path === destination);
    }
    // An unauthenticated request keeps the session adapter's login redirect.
    sessionError = new Redirect('/login');
    await assert.rejects(requirePageAccess('students'), (error) => error === sessionError);
    // An unavailable auth service stays an operational error, not a redirect.
    sessionError = new Error('session recovery unavailable');
    await assert.rejects(requirePageAccess('students'), (error) => error === sessionError);
  `], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    encoding: 'utf8',
    timeout: 30_000,
  });
  expect(result.error).toBeUndefined();
  expect(result.stdout + result.stderr).toBe('');
  expect(result.status).toBe(0);
});
