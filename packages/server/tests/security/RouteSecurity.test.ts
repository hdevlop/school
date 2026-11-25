import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getEffectiveGuards, getGuardMetadata } from 'najm-guard';
import { StorageController, StorageMcpTools, StorageStudioController } from 'najm-storage';
import { storage } from 'najm-storage';
import { SchoolStorageValidator } from '../../src/config/SchoolStorageValidator';
import { schoolServerOptions } from '../../src/config/server';
import { PERMISSION_MANAGED_NAMESPACES, StorageManageGuard } from '../../src/config/StorageManageGuard';
import { ClassRoutineController } from '../../src/modules/classRoutines/ClassRoutineController';
import { HealthController } from '../../src/modules/health/HealthController';
import { NotificationController } from '../../src/modules/financial/notifications/NotificationController';

const signIn = ['AuthGuard', null];
// The routes najm-storage puts under `manageGuards`; serving stays under `guards`.
const MANAGE_STORAGE_ROUTES = ['listFiles', 'getFileInfo', 'uploadFile', 'deleteFile', 'deleteNamespace'];

function guards(target: any, method?: string) {
  return getGuardMetadata(target, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

it('requires sign-in on forgotten routes while preserving deliberate public endpoints', () => {
  class ForgottenController { read() {} }
  const config = schoolServerOptions().guards;
  expect(getEffectiveGuards(ForgottenController, 'read', config).map(({ guardClass }) => guardClass.name)).toEqual(['AuthGuard']);
  for (const method of ['getHealth', 'getStatus', 'ping']) {
    expect(getEffectiveGuards(HealthController, method, config), method).toEqual([]);
  }
  for (const method of ['runOverdue', 'runCheckDue', 'listRecent']) {
    expect(getEffectiveGuards(NotificationController, method, config), method).toEqual([]);
  }
  expect(getEffectiveGuards(NotificationController, 'listRecentForAdmin', config)
    .map(({ guardClass }) => guardClass.name)).toEqual(['AuthGuard', 'RoleGuard', 'PermissionGuard']);
  expect(guards(NotificationController, 'listRecentForAdmin').at(-1)).toEqual(['PermissionGuard', 'read:fees']);
});

describe('storage routes', () => {
  it('disables Studio and MCP, guards management, and serves to signed-in users', () => {
    const plugin = storage(schoolServerOptions().storage);
    expect(plugin.services).not.toContain(StorageStudioController);
    expect(plugin.services).not.toContain(StorageMcpTools);

    const routes = getRoutes(StorageController).map((route) => route.methodName);
    expect(routes.sort()).toEqual([...MANAGE_STORAGE_ROUTES, 'serveFile', 'servePreview'].sort());
    for (const method of MANAGE_STORAGE_ROUTES) expect(guards(StorageController, method), method).toEqual([signIn, ['StorageManageGuard', null]]);
    for (const method of ['serveFile', 'servePreview']) expect(guards(StorageController, method), method).toEqual([signIn, ['PrivateStorageGuard', null]]);
  });
});

describe('storage management', () => {
  const guard = new StorageManageGuard();
  const secretary = ['read:teachers', 'update:desk-card-backgrounds'];

  it('is the admin role for every namespace without a permission of its own', () => {
    for (const namespace of ['avatars', 'massar', 'homework', 'Desk-Card-Backgrounds', undefined]) {
      expect(guard.canActivate(namespace, 'admin', []), String(namespace)).toBe(true);
      expect(guard.canActivate(namespace, 'secretary', secretary), String(namespace)).toBe(false);
    }
  });

  it('lets desk-card backgrounds be managed by their permission, not by a role', () => {
    expect(PERMISSION_MANAGED_NAMESPACES).toEqual({ 'desk-card-backgrounds': 'update:desk-card-backgrounds' });
    expect(guard.canActivate('desk-card-backgrounds', 'secretary', secretary)).toBe(true);
    expect(guard.canActivate('desk-card-backgrounds', 'admin', ['*:*'])).toBe(true);
    expect(guard.canActivate('desk-card-backgrounds', 'admin', [])).toBe(false);
    expect(guard.canActivate('desk-card-backgrounds', 'teacher', ['read:teachers'])).toBe(false);
    expect(guard.canActivate('desk-card-backgrounds', 'secretary', undefined)).toBe(false);
  });

  it('stores only images as desk-card backgrounds', () => {
    const validator = new SchoolStorageValidator();
    expect(validator.resolveUploadTarget('desk-card-backgrounds', '1795429600443-ideas.webp', 'image/webp').mimeType).toBe('image/webp');
    for (const path of ['1795429600443-notes.pdf', '1795429600443-notes.docx']) {
      expect(() => validator.resolveUploadTarget('desk-card-backgrounds', path, undefined), path).toThrow();
    }
  });
});

// Every route that reads a timetable; the others are for administrators.
const TIMETABLE_READS = ['getAssignments', 'getById', 'getPeriods', 'getPublished', 'getTeacherRoutine', 'list'];

describe('class routine routes', () => {
  it('asks for its own read permission to read a timetable, and never stops at sign-in', () => {
    for (const method of TIMETABLE_READS) {
      expect(guards(ClassRoutineController, method), method).toEqual([signIn, ['PermissionGuard', 'read:class-routines']]);
    }
    const routes = getRoutes(ClassRoutineController).map((route) => route.methodName);
    expect(routes).toEqual(expect.arrayContaining(TIMETABLE_READS));
    for (const method of routes) {
      const names = guards(ClassRoutineController, method).map(([name]) => name);
      expect(names.some((name) => name !== 'AuthGuard'), method).toBe(true);
    }
  });
});
