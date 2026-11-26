import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { getGuardMetadata } from 'najm-guard';
import { ExamPlanningController } from '../../src/modules/examPlanning/ExamPlanningController';
import { ExamPlanningService } from '../../src/modules/examPlanning/ExamPlanningService';
import { EXAM_CONTROLS_CHANGED } from '../../src/modules/examPlanning/examPlanningEvents';
import type { ExamControl } from '@sms/contracts';
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

describe("a Contrôle read from Planning's months", () => {
  // A year with no saved Contrôle: November's exams stand for Contrôle 1, December's for Contrôle 2.
  function service() {
    const saved: ExamControl[] = [];
    const instance = Object.create(ExamPlanningService.prototype) as ExamPlanningService;
    Object.defineProperty(instance, 'year', { value: { id: 'year', label: '2026-2027' } });
    Object.assign(instance, { t: (key: string) => key,
      validator: { ensureMayManageControl: async () => {}, ensureControlValid: () => {} },
      subjectRepository: { getAll: async () => [] },
      repository: {
        storedControls: async () => saved.map(control => ({ ...control })),
        yearPlans: async () => [{ classId: 'cp', months: { '2026-11': [{ date: '2026-11-09' }, { date: '2026-11-13' }], '2026-12': [{ date: '2026-12-14' }] } }],
        yearClassIds: async () => ['cp'],
        insertControls: async (rows: Array<Omit<ExamControl, 'id'>>) => { for (const row of rows) saved.push({ ...row, id: `saved-${saved.length + 1}` }); },
        updateControl: async (id: string, row: Partial<ExamControl>) => { Object.assign(saved.find(control => control.id === id)!, row); },
        deleteControl: async (id: string) => { saved.splice(saved.findIndex(control => control.id === id), 1); },
      } });
    return { instance, saved };
  }
  const actor = { id: 'u', role: 'principal' };
  const input = { dateFrom: '2026-11-02', dateTo: '2026-11-06', classIds: ['cp'], subjectIds: [] };

  it("is changed like a saved one: the year's Contrôles are saved first, and that one takes the new days", async () => {
    const { instance, saved } = service();
    const [november] = await instance.controls();
    expect(november).toMatchObject({ id: 'derived-1-1', derived: true });
    const after = await instance.updateControl(november.id, input, actor);
    expect(saved.map(control => [control.dateFrom, control.dateTo])).toEqual([['2026-11-02', '2026-11-06'], ['2026-12-14', '2026-12-31']]);
    expect(after.every(control => !control.derived)).toBe(true);
  });

  it('is removed like a saved one, the others staying saved', async () => {
    const { instance, saved } = service();
    await instance.deleteControl('derived-1-1', actor);
    expect(saved.map(control => control.dateFrom)).toEqual(['2026-12-14']);
  });

  it('is not found once the year has saved ones, or under an id it never had', async () => {
    const { instance } = service();
    await expect(instance.updateControl('derived-1-9', input, actor)).rejects.toThrow('examPlanning.errors.controls.notFound');
    await instance.updateControl('derived-1-1', input, actor);
    await expect(instance.deleteControl('derived-1-2', actor)).rejects.toThrow('examPlanning.errors.controls.notFound');
  });
  // Massar opens a Contrôle once for the school; the level whose own comes later gets its grids from this.
  it('tells Massar each time the Contrôles change, after the change', async () => {
    const { instance, saved } = service();
    const heard: Array<[string, number]> = [];
    Object.assign(instance, { events: { emitAsync: async (event: string) => { heard.push([event, saved.length]); } } });
    await instance.createControl({ ...input, dateFrom: '2027-01-11', dateTo: '2027-01-15' }, actor);
    await instance.updateControl('saved-1', input, actor);
    await instance.deleteControl('saved-1', actor);
    expect(heard).toEqual([[EXAM_CONTROLS_CHANGED, 3], [EXAM_CONTROLS_CHANGED, 3], [EXAM_CONTROLS_CHANGED, 2]]);
  });
});
