import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getGuardMetadata, guards, ROLE } from 'najm-guard';
import { validation } from 'najm-validation';
import { INJECTION_TYPES, Server, USER } from '../../src/najm';
import { AttendanceController } from '../../src/modules/attendance/AttendanceController';
import { AttendanceService } from '../../src/modules/attendance/AttendanceService';

const records = [{ id: 'staff-mark', type: 'staff' }];
const getAll = mock(async () => records);
const getByDate = mock(async () => records);
let server: Server;

beforeAll(async () => {
  server = new Server({ isolated: true, silent: true })
    .use(guards()).use(validation()).base('/api').load({ AttendanceController });
  server.container.set(AttendanceService, { getAll, getByDate } as unknown as AttendanceService);
  for (const { methodName } of getRoutes(AttendanceController)) {
    for (const { guardClass } of getGuardMetadata(AttendanceController, methodName)) {
      server.container.set(guardClass);
    }
    server.container.setInjection({
      type: INJECTION_TYPES.MIDDLEWARE,
      target: AttendanceController,
      methodName,
      order: 1,
      handler: async (context: { req: { header(name: string): string | undefined } }, next: () => Promise<void>) => {
        const actor = context.req.header('x-test-user');
        if (actor) {
          const user = JSON.parse(actor);
          server.container.set(USER, user);
          server.container.set(ROLE, user.role);
        }
        await next();
      },
    });
  }
  await server.init();
});

afterAll(async () => { await server?.stop(); });

function request(path: string, permissions?: string[], role = 'accounting') {
  return server.fetch(new Request(`http://school.local/api/attendance${path}`, {
    headers: permissions ? { 'x-test-user': JSON.stringify({ id: 'reader', role, permissions }) } : {},
  }));
}

describe('staff attendance read access', () => {
  it('loads a day with only staff View permission, ignoring a forged student type', async () => {
    getByDate.mockClear();
    const response = await request('/staff/records?date=2026-10-23&type=student', ['read:staff-attendance']);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(getByDate).toHaveBeenCalledWith('2026-10-23', 'staff');
  });

  it('loads the selected year with the same staff View permission', async () => {
    getAll.mockClear();
    const response = await request('/staff/records', ['read:staff-attendance']);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(getAll).toHaveBeenCalledWith({ type: 'staff' });
  });

  it('refuses student-only readers, writers without View, scoped roles and anonymous users', async () => {
    getAll.mockClear();
    for (const [permissions, role] of [
      [['read:attendance'], 'accounting'],
      [['update:staff-attendance'], 'accounting'],
      [['read:staff-attendance'], 'teacher'],
      [[], 'accounting'],
      [undefined, 'accounting'],
    ] as const) {
      const response = await request('/staff/records', permissions ? [...permissions] : undefined, role);
      expect([401, 403]).toContain(response.status);
    }
    expect(getAll).not.toHaveBeenCalled();
  });

  it('does not grant staff readers access to student attendance', async () => {
    const response = await request('/date/2026-10-23?type=student', ['read:staff-attendance']);
    expect(response.status).toBe(403);
  });

  it('rejects an invalid date before reading records', async () => {
    getByDate.mockClear();
    const response = await request('/staff/records?date=invalid', ['read:staff-attendance']);
    expect(response.status).toBe(400);
    expect(getByDate).not.toHaveBeenCalled();
  });
});
