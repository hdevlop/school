import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { themeConfig } from '../../src/config/themeConfig';
import { AccessResetController } from '../../src/modules/accessReset/AccessResetController';
import { AttendanceController } from '../../src/modules/attendance/AttendanceController';
import { AttendanceValidator } from '../../src/modules/attendance/AttendanceValidator';
import { ClassRoutineController } from '../../src/modules/classRoutines/ClassRoutineController';
import { CycleController } from '../../src/modules/cycles/CycleController';
import { FinancialAuditController } from '../../src/modules/financial/auditLog/FinancialAuditController';
import { ExpenseController } from '../../src/modules/financial/expenses/ExpenseController';
import { FeeController } from '../../src/modules/financial/fees/FeeController';
import { PaymentController } from '../../src/modules/financial/payments/PaymentController';
import { PayrollController } from '../../src/modules/financial/payroll/PayrollController';
import { RolloverController } from '../../src/modules/financial/rollover/RolloverController';
import { SettingsController } from '../../src/modules/settings/SettingsController';
import { createStaffDto, updateStaffDto } from '../../src/modules/staff/StaffDto';
import { StaffController } from '../../src/modules/staff/StaffController';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';
import { StaffRoleController } from '../../src/modules/staff/roles/StaffRoleController';
import { MaintenanceController } from '../../src/modules/transport/maintenance/MaintenanceController';
import { StudentRouteController } from '../../src/modules/transport/studentRoutes/StudentRouteController';
import { withEnglishMessages } from '../support/englishMessages';

/** Pinned here, not read from the code under test. */
const SCHOOL_WIDE = ['admin', 'principal', 'accounting', 'secretary', 'driver', 'assistant', 'supervisor'];
const admin = [['AuthGuard', null], ['RoleGuard', 'admin']];
const can = (permission: string) => [['AuthGuard', null], ['PermissionGuard', permission]];
const schoolWide = (permission: string) => [['AuthGuard', null], ['RoleGuard', SCHOOL_WIDE], ['PermissionGuard', permission]];

function guards(target: any, method?: string) {
  return getGuardMetadata(target, method).map((guard: any) => [guard.guardClass?.name, guard.params ?? null]);
}

/** Every route of a controller, grouped by the permission it asks for. */
function byPermission(controller: any) {
  const result: Record<string, string[]> = {};
  for (const { methodName } of getRoutes(controller)) {
    const chain = guards(controller, methodName);
    const key = chain.find(([name]) => name === 'PermissionGuard')?.[1]
      ?? (JSON.stringify(chain) === JSON.stringify(admin) ? 'admin' : JSON.stringify(chain));
    (result[key] ??= []).push(methodName);
  }
  for (const list of Object.values(result)) list.sort();
  return result;
}

const seedData = (name: string) => JSON.parse(readFileSync(
  new URL(`../../../seed/src/scripts/admin/data/${name}.json`, import.meta.url), 'utf8',
));

describe('routes that were admin-only ask for a permission', () => {
  it('reads and writes payroll, staff and financial operations past ownership', () => {
    expect(byPermission(PayrollController)).toEqual({
      'read:payroll': ['getAll', 'getById', 'getByPeriod', 'getByStaff', 'getRoster'],
      'create:payroll': ['run'],
      'update:payroll': ['payPayslip', 'payStaffBulk', 'payStaffMember', 'unpayStaff', 'update'],
      'delete:payroll': ['deleteBulk', 'deleteById'],
    });
    expect(byPermission(StaffController)).toEqual({
      'read:staff': ['getByCin', 'getByEmployeeCode', 'getStaffByRole', 'getStaffCount', 'getStaffMember', 'listStaff'],
      'read:staff-attendance': ['getAttendanceRoster'],
      'create:staff': ['create'],
      'update:staff': ['update'],
      'delete:staff': ['deleteBulk', 'deleteById'],
    });
    expect(byPermission(RolloverController)).toEqual({
      'read:financial-operations': ['getRun', 'preview'],
      'update:financial-operations': ['commit'],
    });
    expect(byPermission(FinancialAuditController)).toEqual({ 'read:financial-operations': ['getById', 'list'] });
    for (const route of ['getAll', 'getByPeriod']) expect(guards(PayrollController, route)).toEqual(schoolWide('read:payroll'));
    expect(guards(AttendanceController, 'upsertStaffRoster')).toEqual(schoolWide('update:staff-attendance'));
  });

  it('gives finance routes the finance permissions instead of the finance roles', () => {
    expect(guards(FeeController, 'getFees')).toEqual(schoolWide('read:fees'));
    expect(guards(FeeController, 'getSummary')).toEqual(schoolWide('read:fees'));
    expect(guards(FeeController, 'deleteById')).toEqual(schoolWide('delete:fees'));
    expect(guards(PaymentController, 'record')).toEqual(schoolWide('create:payments'));
    expect(guards(PaymentController, 'voidPayment')).toEqual(schoolWide('update:payments'));
    expect(guards(ExpenseController, 'handleApproval')).toEqual(schoolWide('update:expenses'));
  });

  it('keeps job titles, which can link any login role, with the administrator', () => {
    expect(byPermission(StaffRoleController)).toEqual({ 'read:staff': ['listActive', 'listAll'], admin: ['create', 'remove', 'update'] });
  });

  it('keeps delete-all and seeding with the administrator', () => {
    expect(guards(MaintenanceController, 'deleteAll')).toEqual(admin);
    expect(guards(AttendanceController, 'deleteAll')).toEqual(admin);
    expect(guards(AttendanceController, 'seedAttendanceDemo')).toEqual(admin);
    expect(guards(MaintenanceController)).toEqual([]);
  });

  it('asks plain permissions for school structure, settings and timetables', () => {
    expect(byPermission(CycleController)).toEqual({
      'read:cycles': ['getActiveCycles', 'getCycleById', 'getCycles'],
      'create:cycles': ['create'],
      'update:cycles': ['update'],
      'delete:cycles': ['delete'],
    });
    expect(guards(SettingsController, 'update')).toEqual(can('update:settings'));
    expect(guards(ClassRoutineController, 'publish')).toEqual(can('update:class-routines'));
    expect(guards(StudentRouteController, 'assign')).toEqual(schoolWide('create:student-routes'));
    expect(guards(AccessResetController)).toEqual(can('reset:users'));
  });

  it('keeps appearance and branding with the administrator alone', () => {
    const config = (themeConfig() as any).config.guards;
    for (const key of ['manageAppearance', 'manageBranding']) {
      class Probe { route() {} }
      for (const guard of [].concat(config[key])) {
        (guard as MethodDecorator)(Probe.prototype, 'route', Object.getOwnPropertyDescriptor(Probe.prototype, 'route')!);
      }
      expect(guards(Probe, 'route'), key).toEqual(admin);
    }
  });
});

describe('seeded permissions', () => {
  const permissions = new Set<string>(seedData('permissions').map((permission: { name: string }) => permission.name));
  const grants = Object.fromEntries(seedData('rolePermissions').map((row: { roleName: string; permissions: string[] }) => [row.roleName, row.permissions]));

  // A guard naming a permission nobody can be granted (`read:refuels` against
  // the seeded `refuel`) silently leaves the route to `*:*` alone.
  it('declare every permission a server guard asks for', () => {
    const named = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) {
          for (const match of readFileSync(path, 'utf8').matchAll(/Can(?:SchoolWide)?\('([\w-]+:[\w-]+)'\)/g)) named.add(match[1]);
        }
      }
    };
    walk(new URL('../../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    expect(named.size).toBeGreaterThan(40);
    expect([...named].filter((permission) => !permissions.has(permission)).sort()).toEqual([]);
  });

  it('grant only declared permissions', () => {
    for (const [role, list] of Object.entries(grants)) {
      expect(list.filter((permission) => permission !== '*:*' && !permissions.has(permission)), role).toEqual([]);
    }
  });

  it('give the principal everything but access control, and the administrator all', () => {
    expect(grants.admin).toContain('*:*');
    const principal = new Set(grants.principal);
    const missing = [...permissions].filter((permission) => permission !== '*:*' && !principal.has(permission));
    expect(missing.every((permission) => /^[\w-]+:(users|roles|system|\*)$/.test(permission)), missing.join(', ')).toBe(true);
    expect(principal.has('reset:users')).toBe(true);
  });

  it('lets accounting manage students, parents and teachers, read staff, and run finance', () => {
    const accounting = new Set(grants.accounting);
    for (const people of ['students', 'parents', 'teachers']) {
      expect(accounting.has(`create:${people}`) && accounting.has(`update:${people}`), people).toBe(true);
      expect(accounting.has(`delete:${people}`), people).toBe(false);
    }
    expect(accounting.has('read:staff')).toBe(true);
    for (const action of ['create', 'update', 'delete']) expect(accounting.has(`${action}:staff`)).toBe(false);
    for (const permission of ['delete:fees', 'delete:payments', 'delete:payroll', 'update:financial-operations', 'update:staff-attendance', 'delete:student-routes']) {
      expect(accounting.has(permission), permission).toBe(true);
    }
  });
});

describe('the deploy migration', () => {
  const sql = readFileSync(new URL('../../src/database/migrations/0066_role_permission_defaults.sql', import.meta.url), 'utf8');
  const grantedTo = (role: string) => {
    const block = sql.split('--> statement-breakpoint').find((part) => part.includes(`"roles"."name" = '${role}'`)) ?? '';
    return new Set([...block.matchAll(/'([\w-]+:[\w-]+)'/g)].map((match) => match[1]));
  };
  const finance = ['fees', 'payments', 'expenses', 'feeTypes'].flatMap((resource) =>
    ['create', 'read', 'update', 'delete'].map((action) => `${action}:${resource}`));

  // isFinancial() let these roles in by name; the routes now ask for the permission.
  it('keeps the finance roles in finance', () => {
    for (const role of ['accounting', 'principal']) {
      const granted = grantedTo(role);
      expect(finance.filter((permission) => !granted.has(permission)), role).toEqual([]);
    }
  });

  it('keeps the principal in settings, timetables and staff attendance', () => {
    const granted = grantedTo('principal');
    for (const permission of ['read:settings', 'update:settings', 'manage:class-routines', 'manage:staff-attendance']) {
      expect(granted.has(permission), permission).toBe(true);
    }
  });

  // New defaults are adopted once with seed:role-permissions, never on deploy.
  it('grants nothing the role did not reach before', () => {
    expect(grantedTo('principal').has('read:payroll')).toBe(false);
    expect(grantedTo('accounting').has('create:staff')).toBe(false);
    expect(grantedTo('secretary').size).toBe(0);
  });
});

describe('staff logins', () => {
  const roles: Record<string, string[]> = {
    admin: ['*:*'],
    principal: ['read:students', 'create:staff', 'read:payroll'],
    driver: ['read:students'],
  };
  const validator = withEnglishMessages(new StaffValidator(
    {} as any,
    {} as any,
    { getPermissionsByRole: async (roleId: string) => (roles[roleId] ?? []).map((name) => ({ name })) } as any,
  ));
  const accountant = { permissions: ['read:students', 'create:staff', 'read:fees'] };

  it('are given only for a role whose every permission the actor holds', async () => {
    await expect(validator.ensureCanManageLogin(accountant, 'driver')).resolves.toBeUndefined();
    await expect(validator.ensureCanManageLogin(accountant, 'principal')).rejects.toMatchObject({ status: 403 });
    await expect(validator.ensureCanManageLogin(accountant, 'admin')).rejects.toMatchObject({ status: 403 });
    await expect(validator.ensureCanManageLogin({ permissions: ['*:*'] }, 'admin')).resolves.toBeUndefined();
  });

  it('are left to in-process callers, which pass no actor', async () => {
    await expect(validator.ensureCanManageLogin(undefined, 'admin')).resolves.toBeUndefined();
  });

  it('are never linked from a request body', () => {
    const body = { name: 'Amina Idrissi', address: 'Rue 1', role: 'secretary', salary: 4000, hireDate: '2026-09-01', cin: 'AB123456', phone: '212612345678' };
    expect('userId' in createStaffDto.parse({ ...body, userId: 'admin-user' })).toBe(false);
    expect('userId' in updateStaffDto.parse({ userId: 'admin-user' })).toBe(false);
  });
});

describe('staff attendance', () => {
  const validator = withEnglishMessages(new AttendanceValidator(...(Array(8).fill({}) as [any])));

  it('is marked by a school-wide role holding update:staff-attendance', () => {
    expect(() => validator.ensureStaffAttendanceAuthorized({ role: 'accounting', permissions: ['update:staff-attendance'] })).not.toThrow();
    expect(() => validator.ensureStaffAttendanceAuthorized({ role: 'admin', permissions: ['*:*'] })).not.toThrow();
    expect(() => validator.ensureStaffAttendanceAuthorized({ role: 'supervisor', permissions: ['manage:attendance'] })).toThrow();
    expect(() => validator.ensureStaffAttendanceAuthorized({ role: 'teacher', permissions: ['update:staff-attendance'] })).toThrow();
  });
});
