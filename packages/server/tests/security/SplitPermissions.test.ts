import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getGuardMetadata } from 'najm-guard';
import { readFileSync } from 'node:fs';
import { ClassRoutineController } from '../../src/modules/classRoutines/ClassRoutineController';
import { RoutineCandidateGuard } from '../../src/modules/classRoutines/ClassRoutineGuards';
import { EventController } from '../../src/modules/events/EventController';
import { DisciplineController } from '../../src/modules/discipline/DisciplineController';
import { RolloverController } from '../../src/modules/financial/rollover/RolloverController';
import { PERMISSION_ACTION_REPLACEMENTS } from '../../src/modules/roleAccess/PermissionActionMigration';

const permission = (controller: any, method: string) => getGuardMetadata(controller, method)
  .filter((guard) => guard.guardClass.name === 'PermissionGuard').map((guard) => guard.params);

describe('split action guards', () => {
  it('treats rollover and discipline resolution/reopening as edits', () => {
    expect(permission(RolloverController, 'commit')).toEqual(['update:financial-operations']);
    for (const method of ['update', 'resolve', 'reopen']) {
      expect(permission(DisciplineController, method)).toEqual(['update:discipline']);
    }
  });
  it('requires each timetable action independently', () => {
    for (const method of ['create', 'createPeriod', 'addEntry', 'addDuty']) {
      expect(permission(ClassRoutineController, method)).toEqual(['create:class-routines']);
    }
    for (const method of ['update', 'updatePeriod', 'updateEntry', 'updateDuty', 'updateLayout', 'archive']) {
      expect(permission(ClassRoutineController, method)).toEqual(['update:class-routines']);
    }
    for (const method of ['delete', 'deleteEntry', 'deleteDuty']) {
      expect(permission(ClassRoutineController, method)).toEqual(['delete:class-routines']);
    }
    expect(permission(ClassRoutineController, 'publish')).toEqual(['update:class-routines']);
  });

  it('keeps candidate details available to editors without opening them to timetable readers', () => {
    const guard = new RoutineCandidateGuard();
    for (const action of ['create', 'update', 'delete']) {
      expect(guard.canActivate([`${action}:class-routines`])).toBe(true);
    }
    expect(guard.canActivate(['*:*'])).toBe(true);
    expect(guard.canActivate(['read:classes'])).toBe(false);
    expect(guard.canActivate(['publish:class-routines'])).toBe(false);
    expect(guard.canActivate(undefined)).toBe(false);
    expect(getGuardMetadata(ClassRoutineController, 'getDutyCandidates').map((g) => g.guardClass.name))
      .toEqual(['AuthGuard', 'RoutineCandidateGuard']);
  });

  it('splits participant reads, creation, editing/attendance, and deletion', () => {
    for (const method of ['getParticipants', 'getParticipantsByType', 'getEventsByParticipant', 'getParticipantCount']) {
      expect(permission(EventController, method)).toEqual(['read:participants']);
    }
    expect(permission(EventController, 'addParticipant')).toEqual(['create:participants']);
    for (const method of ['updateParticipant', 'markAttendance']) {
      expect(permission(EventController, method)).toEqual(['update:participants']);
    }
    expect(permission(EventController, 'removeParticipant')).toEqual(['delete:participants']);
  });

  it('has no manage action in fresh-install permissions or role defaults', () => {
    const catalog = JSON.parse(readFileSync(new URL('../../../seed/src/scripts/admin/data/permissions.json', import.meta.url), 'utf8'));
    const grants = JSON.parse(readFileSync(new URL('../../../seed/src/scripts/admin/data/rolePermissions.json', import.meta.url), 'utf8'));
    expect(catalog.filter((p: any) => ['manage', 'rollover', 'resolve', 'publish'].includes(p.action))).toEqual([]);
    expect(grants.flatMap((role: any) => role.permissions).filter((name: string) => name.startsWith('manage:'))).toEqual([]);
    const migration = ['0073_split_manage_permissions', '0074_edit_workflow_permissions', '0075_publish_is_edit'].map((name) => readFileSync(new URL(`../../src/database/migrations/${name}.sql`, import.meta.url), 'utf8')).join('\n');
    for (const [legacy, replacements] of Object.entries(PERMISSION_ACTION_REPLACEMENTS)) {
      for (const replacement of replacements) {
        expect(migration).toContain(`('${legacy}', '${replacement}')`);
        expect(catalog.some((p: any) => p.name === replacement)).toBe(true);
      }
    }
  });
});
