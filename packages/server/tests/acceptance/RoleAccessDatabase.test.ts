import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { cache } from 'najm-cache';
import { database } from 'najm-database';
import { email } from 'najm-email';
import { Can } from '../../src/auth';
import { Controller, Get, Server } from '../../src/najm';
import { authConfig, eventsConfig, guardConfig, i18nConfig, validationConfig } from '../../src/config';
import * as roleAccess from '../../src/modules/roleAccess';

/** Real transactions and HTTP guards, in a disposable schema; no app rows change. */
const connection = process.env.DB_URL;
const schema = `role_access_${crypto.randomUUID().replaceAll('-', '')}`;
const sql = connection ? postgres(connection, { max: 1, connect_timeout: 5, onnotice: () => {} }) : null;
let isolated: ReturnType<typeof postgres>;
let server: Server;
let service: roleAccess.RoleAccessService;
let repository: roleAccess.RoleAccessRepository;
const password = `Probe-${crypto.randomUUID()}-Aa1!`;
let adminToken: string;
let targetToken: string;

@Controller('/role-access-probe')
class PayrollProbe {
  @Get()
  @Can('read:payroll')
  read() { return { allowed: true }; }
}

const send = (path: string, token?: string, method = 'GET', body?: unknown) => server.fetch(new Request(`http://school.test/api${path}`, {
  method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
}));
async function login(name: string) {
  const response = await send('/auth/login', undefined, 'POST', { email: `${name}@example.invalid`, password });
  const body = await response.json() as any;
  expect(response.status, JSON.stringify(body)).toBe(200);
  const result = body.data ?? body;
  return result.accessToken ?? result.tokens?.accessToken;
}
async function restore() {
  await isolated`delete from role_permissions where role_id = 'target-role'`;
  await isolated`insert into role_permissions (role_id, permission_id) values ('target-role', 'read-fees'), ('target-role', 'read-payroll')`;
}

beforeAll(async () => {
  if (!sql || !connection) return;
  await sql.unsafe(`CREATE SCHEMA "${schema}"`);
  for (const table of ['roles', 'permissions', 'role_permissions', 'users', 'tokens', 'audit_logs', 'credential_setup_requirements', 'credential_setup_sessions']) {
    await sql.unsafe(`CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING ALL)`);
  }
  isolated = postgres(connection, { max: 4, connection: { search_path: schema }, onnotice: () => {} });
  await isolated`insert into roles (id, name) values ('admin-role', 'admin'), ('target-role', 'accounting')`;
  await isolated`insert into permissions (id, name, resource, action) values
    ('read-fees', 'read:fees', 'fees', 'read'), ('read-payroll', 'read:payroll', 'payroll', 'read'),
    ('read-fee-types', 'read:feeTypes', 'feeTypes', 'read')`;
  const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 4 });
  await isolated`insert into users (id, email, password, status, role_id) values
    ('actor', 'actor@example.invalid', ${hash}, 'active', 'admin-role'),
    ('holder', 'holder@example.invalid', ${hash}, 'active', 'target-role')`;
  await restore();
  server = new Server().use(database({ default: drizzle(isolated) }))
    .use(cache()).use(eventsConfig()).use(i18nConfig()).use(validationConfig())
    .use(email({ provider: { provider: 'memory' } })).use(guardConfig()).use(authConfig())
    .base('/api').load({ ...roleAccess, PayrollProbe });
  await server.init();
  service = await server.container.resolve(roleAccess.RoleAccessService);
  repository = await server.container.resolve(roleAccess.RoleAccessRepository);
  adminToken = await login('actor');
  targetToken = await login('holder');
}, 30000);

afterAll(async () => {
  try { await server?.stop(); }
  finally {
    await isolated?.end({ timeout: 5 });
    if (sql) {
      // This generated test-only schema is the sole cleanup target.
      if (!/^role_access_[a-f0-9]{32}$/.test(schema)) throw Error('Unexpected test schema');
      await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await sql.end({ timeout: 5 });
    }
  }
});

describe.skipIf(!connection)('role access against real PostgreSQL', () => {
  it('refuses anonymous and non-admin callers and protects the administrator', async () => {
    expect((await send('/admin/access/roles/target-role')).status).toBe(401);
    expect((await send('/admin/access/roles/target-role', targetToken)).status).toBe(403);
    expect((await send('/admin/access/roles/target-role', adminToken)).status).toBe(200);
    expect((await send('/admin/access/roles/admin-role', adminToken, 'PUT', {
      permissionIds: [], expectedPermissionIds: [], sidebarKeys: [],
    })).status).toBe(403);
  });

  it('rolls grants and the sidebar catalog back when the audit fails', async () => {
    const snapshot = await service.get('target-role');
    const audit = repository.audit;
    repository.audit = async () => { throw Error('injected audit failure'); };
    try {
      await expect(service.save('target-role', {
        permissionIds: ['read-fee-types'], expectedPermissionIds: snapshot.permissions.map((p) => p.id), sidebarKeys: ['feeTypes'],
      }, 'actor')).rejects.toThrow('injected audit failure');
    } finally { repository.audit = audit; }
    expect((await service.get('target-role')).permissions.map((p) => p.name).sort()).toEqual(['read:fees', 'read:payroll']);
    const [catalog] = await isolated`select count(*)::int as n from permissions where resource = 'sidebar'`;
    expect(catalog.n).toBe(0);
  });

  it('serializes two simultaneous editors and refuses the stale one', async () => {
    const snapshot = await service.get('target-role');
    const expectedPermissionIds = snapshot.permissions.map((p) => p.id);
    const results = await Promise.allSettled([
      service.save('target-role', { permissionIds: ['read-fees'], expectedPermissionIds, sidebarKeys: ['fees'] }, 'actor'),
      service.save('target-role', { permissionIds: ['read-payroll'], expectedPermissionIds, sidebarKeys: ['payroll'] }, 'actor'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason.status).toBe(409);
  });

  it('expires issued permission claims and keeps sidebar choice independent of read access', async () => {
    await restore();
    const token = await login('holder');
    expect((await send('/role-access-probe', token)).status).toBe(200);
    const snapshot = await service.get('target-role');
    const response = await send('/admin/access/roles/target-role', adminToken, 'PUT', {
      permissionIds: ['read-fees', 'read-fee-types'], expectedPermissionIds: snapshot.permissions.map((p) => p.id), sidebarKeys: ['feeTypes'],
    });
    expect(response.status, await response.clone().text()).toBe(200);
    expect((await send('/role-access-probe', token)).status).toBe(401);
    expect((await send('/role-access-probe', await login('holder'))).status).toBe(403);
    const names = (await service.get('target-role')).permissions.map((p) => p.name);
    expect(names).toContain('read:fees');
    expect(names).not.toContain('sidebar:fees');
    expect(names).toContain('sidebar:feeTypes');
  });

  it('migrates long legacy IDs through an admin-only, atomic and repeatable REST action', async () => {
    await isolated`insert into permissions (id, name, resource, action) values
      ('perm_manage_class_routines', 'manage:class-routines', 'class-routines', 'manage'),
      ('perm_manage_attendance', 'manage:attendance', 'attendance', 'manage'),
      ('perm_rollover_finance', 'rollover:financial-operations', 'financial-operations', 'rollover'),
      ('perm_resolve_discipline', 'resolve:discipline', 'discipline', 'resolve')`;
    await isolated`insert into role_permissions (role_id, permission_id) values
      ('target-role', 'perm_manage_class_routines'), ('target-role', 'perm_manage_attendance'),
      ('target-role', 'perm_rollover_finance'), ('target-role', 'perm_resolve_discipline')`;
    const token = await login('holder');
    const path = '/admin/access/roles/migrate-actions';
    expect((await send(path, undefined, 'POST', {})).status).toBe(401);
    expect((await send(path, token, 'POST', {})).status).toBe(403);
    const before = (await service.get('target-role')).permissions.map((p) => p.name).sort();
    const audit = repository.audit;
    repository.audit = async () => { throw Error('injected migration audit failure'); };
    try {
      await expect(service.migrateActions('actor')).rejects.toThrow('injected migration audit failure');
      expect((await service.get('target-role')).permissions.map((p) => p.name).sort()).toEqual(before);
      expect((await isolated`select * from permissions where name = 'create:class-routines'`)).toHaveLength(0);
    } finally { repository.audit = audit; }
    const response = await send(path, adminToken, 'POST', {});
    expect(response.status, await response.clone().text()).toBe(200);
    const after = (await service.get('target-role')).permissions.map((p) => p.name).sort();
    expect(after).toEqual([...before.filter((name) => !/^(manage|rollover|resolve):/.test(name)),
      'create:class-routines', 'update:class-routines', 'delete:class-routines',
      'update:financial-operations', 'update:discipline'].sort());
    expect((await isolated`select * from permissions where action = 'manage'`)).toHaveLength(0);
    expect((await send('/role-access-probe', token)).status).toBe(401);
    expect(await service.migrateActions('actor')).toEqual({ retired: 0, rolesChanged: 0 });
  });

  it('removes legacy staff grants through REST without configuring or changing the sidebar', async () => {
    await restore();
    await isolated`insert into permissions (id, name, resource, action) values
      ('perm_create_staff', 'create:staff', 'staff', 'create'),
      ('perm_update_staff', 'update:staff', 'staff', 'update'),
      ('perm_read_staff', 'read:staff', 'staff', 'read')`;
    await isolated`insert into role_permissions (role_id, permission_id) values
      ('target-role', 'perm_create_staff'), ('target-role', 'perm_update_staff'), ('target-role', 'perm_read_staff')`;
    const token = await login('holder');
    const before = await service.get('target-role');
    const desired = before.permissions.filter((p) => !['create:staff', 'update:staff'].includes(p.name));
    const response = await send('/admin/access/roles/target-role', adminToken, 'PUT', {
      permissionIds: desired.map((p) => p.id), expectedPermissionIds: before.permissions.map((p) => p.id),
    });
    expect(response.status, await response.clone().text()).toBe(200);
    const after = await service.get('target-role');
    expect(after.permissions.map((p) => p.name).sort()).toEqual(['read:fees', 'read:payroll', 'read:staff']);
    expect((await send('/role-access-probe', token)).status).toBe(401);
  });
});
