import { expect, test } from 'bun:test';
import { offlineRoute } from '@sms/contracts/offline';

// najm-offline answers only the routes School lists; its own suite covers the replica and dispatcher.
test('only enumerated exact routes can read offline', () => {
  for (const path of ['/students?onDate=2026-01-01', '/students/count', '/students/my-identity', '/students/one/fees',
    '/fees', '/alerts', '/auth/session', '//external/students', 'https://external/students', '/students/a%2Fb']) expect(offlineRoute(path)).toBeNull();
  expect(offlineRoute('/students/one/parents')?.capability).toBe('read:students');
  expect(offlineRoute('/students/one/enrollments')).toEqual({ path: '/students/one/enrollments', shared: false, capability: 'read:students' });
  expect(offlineRoute('/classes')).toEqual({ path: '/classes', shared: false, capability: 'read:classes' });
  for (const path of ['/settings/public', '/academic-years/']) expect(offlineRoute(path)?.shared).toBe(true);
});
