import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { AlertController } from '../../src/modules/alerts/AlertController';
import { AlertService } from '../../src/modules/alerts/AlertService';
import { AlertValidator } from '../../src/modules/alerts/AlertValidator';
import { AnnouncementController } from '../../src/modules/announcements/AnnouncementController';
import { AnnouncementValidator } from '../../src/modules/announcements/AnnouncementValidator';

const staff = { id: 'staff-user', role: 'principal' };
const teacher = { id: 'teacher-user', role: 'teacher' };
const parent = { id: 'parent-user', role: 'parent' };
const student = { id: 'student-user', role: 'student' };

const aboutStudent = { id: 'alert-1', studentId: 'student-1', teacherId: null, teacherAssignmentId: null };
const namingTeacher = { id: 'alert-2', studentId: null, teacherId: 'teacher-1', teacherAssignmentId: null };
const classNotice = { id: 'alert-3', studentId: null, teacherId: null, teacherAssignmentId: null };

// The repository's owned read decides what the user can see; these stubs
// stand in for it and record what the service did.
function alertService(readable: object | undefined, calls: string[] = []) {
  const repository = {
    getById: async () => { calls.push('read'); return readable; },
    updateStatus: async (_id: string, status: string) => { calls.push(`status:${status}`); return { ...readable, status }; },
    update: async () => { calls.push('update'); return readable; },
  };
  const validator = new AlertValidator(repository as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  (validator as any).at = (key: string) => key;
  return { service: new AlertService(repository as any, validator), validator };
}

function announcementValidator(readable: object | undefined) {
  const validator = new AnnouncementValidator({ getById: async () => readable } as any, {} as any);
  (validator as any).at = (key: string) => key;
  return validator;
}

function refusal(run: () => unknown) {
  try {
    run();
    return null;
  } catch (error: any) {
    return [error.status, error.message];
  }
}

async function asyncRefusal(run: () => Promise<unknown>) {
  try {
    await run();
    return null;
  } catch (error: any) {
    return [error.status, error.message];
  }
}

describe('alert status handling', () => {
  const { validator } = alertService(undefined);

  it('lets staff set any status on any alert they can read', () => {
    for (const alert of [aboutStudent, namingTeacher, classNotice]) {
      expect(refusal(() => validator.ensureCanHandle(alert, 'resolved', staff))).toBeNull();
    }
  });

  it('lets a teacher set any status on an alert about a student or about themselves', () => {
    for (const alert of [aboutStudent, namingTeacher]) {
      expect(refusal(() => validator.ensureCanHandle(alert, 'dismissed', teacher))).toBeNull();
    }
  });

  it('lets parents and students only acknowledge an alert about their child or themselves', () => {
    for (const actor of [parent, student]) {
      expect(refusal(() => validator.ensureCanHandle(aboutStudent, 'acknowledged', actor))).toBeNull();
      expect(refusal(() => validator.ensureCanHandle(aboutStudent, 'resolved', actor))).toEqual([403, 'acknowledgeOnly']);
    }
  });

  it('keeps class and school notices with staff, because their one status is shared', () => {
    for (const actor of [teacher, parent, student]) {
      expect(refusal(() => validator.ensureCanHandle(classNotice, 'acknowledged', actor)))
        .toEqual([403, 'sharedNoticeStaffOnly']);
    }
  });

  it('keeps alert content with staff', () => {
    expect(refusal(() => validator.ensureCanEdit(staff))).toBeNull();
    for (const actor of [teacher, parent, student]) {
      expect(refusal(() => validator.ensureCanEdit(actor))).toEqual([403, 'editStaffOnly']);
    }
  });

  it('reads the alert through ownership, then writes its status', async () => {
    const calls: string[] = [];
    const { service } = alertService(aboutStudent, calls);
    await service.updateStatus('alert-1', 'acknowledged', parent);
    expect(calls).toEqual(['read', 'status:acknowledged']);
  });

  it('writes nothing for an alert the user cannot read or may not handle', async () => {
    const hidden: string[] = [];
    expect(await asyncRefusal(() => alertService(undefined, hidden).service.updateStatus('alert-9', 'acknowledged', parent)))
      .toEqual([404, 'notFound']);
    expect(hidden).toEqual(['read']);

    const refused: string[] = [];
    expect(await asyncRefusal(() => alertService(aboutStudent, refused).service.updateStatus('alert-1', 'resolved', parent)))
      .toEqual([403, 'acknowledgeOnly']);
    expect(refused).toEqual(['read']);
  });

  it('refuses a content edit before reading the alert', async () => {
    const calls: string[] = [];
    expect(await asyncRefusal(() => alertService(aboutStudent, calls).service.update('alert-1', { title: 'Changed' }, teacher)))
      .toEqual([403, 'editStaffOnly']);
    expect(calls).toEqual([]);
  });
});

describe('announcement changes', () => {
  const written = { id: 'announcement-1', authorId: 'teacher-user', isPublished: false };
  const someoneElses = { ...written, authorId: 'staff-user' };

  it('lets staff change any announcement they can read', async () => {
    expect(await asyncRefusal(() => announcementValidator(someoneElses).ensureChangeable('announcement-1', staff))).toBeNull();
  });

  it('lets anyone else change only what they wrote', async () => {
    expect(await asyncRefusal(() => announcementValidator(written).ensureChangeable('announcement-1', teacher))).toBeNull();
    expect(await asyncRefusal(() => announcementValidator(someoneElses).ensureChangeable('announcement-1', teacher)))
      .toEqual([403, 'authorOnly']);
    expect(await asyncRefusal(() => announcementValidator(someoneElses).ensureCanPublish('announcement-1', teacher)))
      .toEqual([403, 'authorOnly']);
  });

  it('answers not found for an announcement the user cannot read', async () => {
    expect(await asyncRefusal(() => announcementValidator(undefined).ensureChangeable('announcement-9', staff)))
      .toEqual([404, 'notFound']);
  });
});

// The guards the framework runs for a route, read from its metadata:
// @Policy applies sign-in to the class and one permission per route.
function guards(controller: any, method: string) {
  return getGuardMetadata(controller, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

describe('alert and announcement routes', () => {
  it('lets anyone with read:alerts list and read alerts, narrowed by ownership', () => {
    for (const route of ['getAlerts', 'getAlertsCount', 'getDashboardSummary', 'getAlertsByStudent', 'getAlertById']) {
      expect(guards(AlertController, route)).toEqual([['AuthGuard', null], ['PermissionGuard', 'read:alerts']]);
    }
  });

  it('handles status and edits with update:alerts; the service keeps edits with staff', () => {
    for (const route of ['updateStatus', 'update']) {
      expect(guards(AlertController, route)).toEqual([['AuthGuard', null], ['PermissionGuard', 'update:alerts']]);
    }
  });

  it('keeps bulk alert deletion and generation admin-only', () => {
    for (const route of ['deleteAll', 'deleteResolved', 'generateAttendanceAlerts', 'generateAcademicAlerts']) {
      expect(guards(AlertController, route)).toEqual([['AuthGuard', null], ['RoleGuard', 'admin']]);
    }
  });

  it('requires sign-in and read:announcements for the published and active lists', () => {
    for (const route of ['getPublished', 'getActiveForAudience', 'getAnnouncements', 'getAnnouncement']) {
      expect(guards(AnnouncementController, route))
        .toEqual([['AuthGuard', null], ['PermissionGuard', 'read:announcements']]);
    }
  });

  it('keeps announcement statistics and bulk management admin-only', () => {
    for (const route of ['getStats', 'getUpcoming', 'getExpired', 'getByAuthor', 'createBulk', 'deleteBulk', 'deleteAll']) {
      expect(guards(AnnouncementController, route)).toEqual([['AuthGuard', null], ['RoleGuard', 'admin']]);
    }
  });
});
