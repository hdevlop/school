import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getGuardMetadata } from 'najm-guard';
import { ExamPlanningController } from '../../src/modules/examPlanning/ExamPlanningController';
import { examControlDto } from '../../src/modules/examPlanning/ExamPlanningDto';
import rolePermissions from '../../src/modules/seed-data/admin/rolePermissions.json';

const permissionOf = (method: string) => getGuardMetadata(ExamPlanningController, method)
  .map((guard: any) => [guard.guardClass?.name, guard.params ?? null])
  .find(([name]) => name === 'PermissionGuard')?.[1];
const grants = (role: string) => rolePermissions.find(entry => entry.roleName === role)?.permissions ?? [];
const MANAGE = ['create:exam-controls', 'update:exam-controls', 'delete:exam-controls'];

describe('Contrôles', () => {
  it('are read with the exams, and opened, changed and removed with their own permissions', () => {
    expect(permissionOf('getControls')).toBe('read:exams');
    expect(permissionOf('createControl')).toBe('create:exam-controls');
    expect(permissionOf('createControls')).toBe('create:exam-controls');
    expect(permissionOf('updateControl')).toBe('update:exam-controls');
    expect(permissionOf('deleteControl')).toBe('delete:exam-controls');
  });

  it('are opened by the principal and the supervisor, who also plans their classes, and by no teacher or monitor', () => {
    for (const role of ['principal', 'supervisor']) expect(grants(role), role).toEqual(expect.arrayContaining(MANAGE));
    expect(grants('supervisor')).toContain('update:exam-planning');
    for (const role of ['teacher', 'monitor', 'parent', 'student']) {
      expect(grants(role).filter(name => MANAGE.includes(name)), role).toEqual([]);
    }
  });

  it('reach an existing school on deploy', () => {
    const migration = readFileSync(new URL('../../src/database/migrations/0144_exam_controls.sql', import.meta.url), 'utf8');
    for (const name of [...MANAGE, 'update:exam-planning']) expect(migration).toContain(`'${name}'`);
    expect(migration).toContain(`role."name" IN ('principal', 'supervisor')`);
  });

  it('take days, classes and subjects (none: every subject), and no number: each class numbers its Contrôles by date', () => {
    const valid = { dateFrom: '2026-12-07', dateTo: '2026-12-11', classIds: ['cp', 'cp'], subjectIds: ['maths', 'maths'] };
    expect(examControlDto.parse(valid)).toMatchObject({ classIds: ['cp'], subjectIds: ['maths'] });
    expect(examControlDto.safeParse({ ...valid, subjectIds: [] }).success).toBe(true);
    for (const wrong of [{ massarExam: 2 }, { classIds: [] }, { subjectIds: undefined }, { dateFrom: '07/12/2026' }, { extra: true }]) {
      expect(examControlDto.safeParse({ ...valid, ...wrong }).success, JSON.stringify(wrong)).toBe(false);
    }
  });
});
