import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { PrivateStorageGuard } from '../../src/config/PrivateStorageGuard';
import { SchoolStorageValidator } from '../../src/config/SchoolStorageValidator';
import { yearScopedModules } from '../../src/config/yearScope';
import { HomeworkController } from '../../src/modules/homework/HomeworkController';
import { HomeworkService } from '../../src/modules/homework/HomeworkService';
import { HomeworkValidator } from '../../src/modules/homework/HomeworkValidator';

const seedData = (name: string) => JSON.parse(readFileSync(
  new URL(`../../src/modules/seed-data/admin/${name}.json`, import.meta.url), 'utf8',
));
const ALL = ['create:homework', 'read:homework', 'update:homework', 'delete:homework'];
const can = (permission: string) => [['AuthGuard', null], ['PermissionGuard', permission]];

function guards(method: string) {
  return getGuardMetadata(HomeworkController, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

describe('homework permissions', () => {
  const grants: Record<string, string[]> = Object.fromEntries(
    (seedData('rolePermissions') as { roleName: string; permissions: string[] }[]).map((row) => [row.roleName, row.permissions]),
  );
  const homeworkOf = (role: string) => grants[role].filter((name) => name.endsWith(':homework')).sort();

  it('are declared, one per action', () => {
    const declared = (seedData('permissions') as { name: string; resource: string; action: string }[])
      .filter((permission) => permission.resource === 'homework');
    expect(declared.map((permission) => permission.name).sort()).toEqual([...ALL].sort());
    for (const permission of declared) expect(permission.name).toBe(`${permission.action}:homework`);
  });

  it('let a teacher post, and everyone around the class read', () => {
    expect(homeworkOf('teacher')).toEqual([...ALL].sort());
    expect(homeworkOf('principal')).toEqual([...ALL].sort());
    for (const reader of ['monitor', 'supervisor', 'parent', 'student']) expect(homeworkOf(reader), reader).toEqual(['read:homework']);
    for (const other of ['accounting', 'secretary', 'driver', 'assistant', 'registrar']) expect(homeworkOf(other), other).toEqual([]);
  });
});

describe('homework routes', () => {
  it('each ask for the permission of what they do', () => {
    const expected: Record<string, string> = {
      getAll: 'read:homework', getBySection: 'read:homework', getByStudent: 'read:homework', getById: 'read:homework',
      readAttachment: 'read:homework', acknowledge: 'read:homework', parts: 'read:homework',
      create: 'create:homework',
      update: 'update:homework', addAttachments: 'update:homework', removeAttachment: 'update:homework',
      deleteById: 'delete:homework',
    };
    const routes = getRoutes(HomeworkController).map((route) => route.methodName).sort();
    expect(routes).toEqual(Object.keys(expected).sort());
    for (const [method, permission] of Object.entries(expected)) expect(guards(method), method).toEqual(can(permission));
  });

  it('read the year the request selected', () => {
    expect(yearScopedModules.homework).toBe(HomeworkController);
  });
});

describe('homework files are private', () => {
  it('are refused by the generic storage route, whatever the case', () => {
    const guard = new PrivateStorageGuard();
    for (const namespace of ['homework', 'Homework', 'HOMEWORK']) expect(guard.canActivate(namespace), namespace).toBe(false);
    expect(guard.canActivate('massar')).toBe(false);
    for (const namespace of ['students', 'staff', 'homeworks']) expect(guard.canActivate(namespace), namespace).toBe(true);
  });

  it('hold only images and PDFs', () => {
    const validator = new SchoolStorageValidator();
    expect(validator.resolveUploadTarget('homework', `${'a'.repeat(64)}.webp`, 'image/webp').mimeType).toBe('image/webp');
    expect(validator.resolveUploadTarget('homework', `${'a'.repeat(64)}.pdf`, 'application/pdf').mimeType).toBe('application/pdf');
    for (const path of ['notes.docx', 'marks.xlsx', 'page.txt']) {
      expect(() => validator.resolveUploadTarget('homework', path, undefined), path).toThrow();
    }
  });

  // The file route reads the homework through ownership before the file.
  it('are read only through a homework the reader can see', async () => {
    const calls: string[] = [];
    const service = new HomeworkService(
      {} as never,
      { ensureExists: async (id: string) => { calls.push(`ensureExists ${id}`); throw new Error('Homework not found'); } } as never,
      {} as never,
      { read: async () => { calls.push('read'); return { bytes: Buffer.from('x'), mimeType: 'image/webp' }; } } as never,
    );
    await expect(service.readAttachment('hw-1', 'att-1')).rejects.toThrow('Homework not found');
    expect(calls).toEqual(['ensureExists hw-1']);
  });
});

describe('who writes homework', () => {
  function validator(repository: object = {}) {
    const instance = new HomeworkValidator(repository as never, {} as never);
    Object.defineProperty(instance, 'ht', { value: (key: string) => `homework.errors.${key}` });
    return instance;
  }

  it('is a teacher or a school-wide role, even for a role granted the permission later', () => {
    const rules = validator();
    for (const role of ['teacher', 'admin', 'principal', 'secretary']) expect(() => rules.ensureMayWrite({ id: 'u', role }), role).not.toThrow();
    for (const role of ['monitor', 'supervisor', 'parent', 'student', 'custom-role', undefined]) {
      expect(() => rules.ensureMayWrite({ id: 'u', role }), String(role)).toThrow('homework.errors.writeNotAllowed');
    }
  });

  it('posts a teacher as themselves, whatever teacher the body names', async () => {
    const rules = validator({ teacherIdOfUser: async (userId: string) => (userId === 'teacher-user' ? 'teacher-1' : null) });
    expect(await rules.resolveTeacherId({ id: 'teacher-user', role: 'teacher' }, 'teacher-2')).toBe('teacher-1');
    await expect(rules.resolveTeacherId({ id: 'no-record', role: 'teacher' }, 'teacher-2')).rejects.toThrow('homework.errors.noTeacherRecord');
    expect(await rules.resolveTeacherId({ id: 'admin-user', role: 'principal' }, 'teacher-2')).toBe('teacher-2');
    await expect(rules.resolveTeacherId({ id: 'admin-user', role: 'principal' }, null)).rejects.toThrow('homework.errors.teacherRequired');
  });

  it('requires the teacher to teach the subject in every target section', async () => {
    const rules = validator({ findAssignment: async (_teacher: string, _subject: string, sectionId: string) => (sectionId === 'section-b' ? null : `ta-${sectionId}`) });
    expect(await rules.ensureAssignments('teacher-1', 'subject-1', ['section-a'])).toEqual(['ta-section-a']);
    await expect(rules.ensureAssignments('teacher-1', 'subject-1', ['section-a', 'section-b'])).rejects.toThrow('homework.errors.notAssigned');
  });

  it('lets only a parent mark homework seen, and only for a child it was given to', async () => {
    const asked: string[][] = [];
    const rules = validator({
      isChildOfParentInHomework: async (homeworkId: string, studentId: string, userId: string) => {
        asked.push([homeworkId, studentId, userId]);
        return studentId === 'own-child';
      },
    });
    await expect(rules.ensureParentOfChild('hw-1', 'own-child', { id: 'teacher-user', role: 'teacher' })).rejects.toThrow('homework.errors.parentOnly');
    await expect(rules.ensureParentOfChild('hw-1', 'other-child', { id: 'parent-user', role: 'parent' })).rejects.toThrow('homework.errors.notYourChild');
    await rules.ensureParentOfChild('hw-1', 'own-child', { id: 'parent-user', role: 'parent' });
    expect(asked).toEqual([['hw-1', 'other-child', 'parent-user'], ['hw-1', 'own-child', 'parent-user']]);
  });
});
