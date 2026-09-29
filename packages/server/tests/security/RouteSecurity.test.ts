import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getEffectiveGuards, getGuardMetadata } from 'najm-guard';
import { StorageController, StorageMcpTools, StorageStudioController } from 'najm-storage';
import { guardConfig, storageConfig } from '../../src/config';
import { ADMIN_STORAGE_ROUTES } from '../../src/config/storageRoutes';
import { ClassRoutineController } from '../../src/modules/classRoutines/ClassRoutineController';
import { HealthController } from '../../src/modules/health/HealthController';
import { NotificationController } from '../../src/modules/financial/notifications/NotificationController';

const signIn = ['AuthGuard', null];
const administrator = [signIn, ['RoleGuard', 'admin']];

function guards(target: any, method?: string) {
  return getGuardMetadata(target, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

it('requires sign-in on forgotten routes while preserving deliberate public endpoints', () => {
  class ForgottenController { read() {} }
  const config = guardConfig().config;
  expect(getEffectiveGuards(ForgottenController, 'read', config).map(({ guardClass }) => guardClass.name)).toEqual(['AuthGuard']);
  for (const method of ['getHealth', 'getStatus', 'ping']) {
    expect(getEffectiveGuards(HealthController, method, config), method).toEqual([]);
  }
  for (const method of ['runOverdue', 'runCheckDue', 'listRecent']) {
    expect(getEffectiveGuards(NotificationController, method, config), method).toEqual([]);
  }
  expect(getEffectiveGuards(NotificationController, 'listRecentForAdmin', config)
    .map(({ guardClass }) => guardClass.name)).toEqual(['AuthGuard', 'RoleGuard']);
});

describe('storage routes', () => {
  it('disables Studio and MCP, guards management for admins, and serves to signed-in users', () => {
    const plugin = storageConfig();
    expect(plugin.services).not.toContain(StorageStudioController);
    expect(plugin.services).not.toContain(StorageMcpTools);

    const routes = getRoutes(StorageController).map((route) => route.methodName);
    expect(routes.sort()).toEqual([...ADMIN_STORAGE_ROUTES, 'serveFile', 'servePreview'].sort());
    for (const method of ADMIN_STORAGE_ROUTES) expect(guards(StorageController, method), method).toEqual(administrator);
    for (const method of ['serveFile', 'servePreview']) expect(guards(StorageController, method), method).toEqual([signIn]);
  });
});

// Every route that reads a timetable; the others are for administrators.
const TIMETABLE_READS = ['getAssignments', 'getById', 'getPeriods', 'getPublished', 'getTeacherRoutine', 'list'];

describe('class routine routes', () => {
  it('ask for read:classes to read a timetable, and never stop at sign-in', () => {
    for (const method of TIMETABLE_READS) {
      expect(guards(ClassRoutineController, method), method).toEqual([signIn, ['PermissionGuard', 'read:classes']]);
    }
    const routes = getRoutes(ClassRoutineController).map((route) => route.methodName);
    expect(routes).toEqual(expect.arrayContaining(TIMETABLE_READS));
    for (const method of routes) {
      const names = guards(ClassRoutineController, method).map(([name]) => name);
      expect(names.some((name) => name !== 'AuthGuard'), method).toBe(true);
    }
  });
});
