import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { AccessResetRepository } from '../../src/modules/accessReset/AccessResetRepository';
import { AccessResetService } from '../../src/modules/accessReset/AccessResetService';
import { AccessResetValidator } from '../../src/modules/accessReset/AccessResetValidator';

/**
 * Real-PostgreSQL checks for the access-reset command.
 *
 * NOT YET EXECUTED. No PostgreSQL was reachable where this was written, so
 * these have never run. They are written to fail loudly rather than to pass,
 * and the whole suite reports as *skipped* — not passed — when no database
 * answers, so an absent database can never be mistaken for a green result.
 *
 * Run against a disposable local database, never live data:
 *
 *   cd packages/server
 *   bun --env-file=../../apps/dashboard/.env.local test tests/accessReset/AccessResetPostgres.test.ts
 *
 * What only a real database can show, and what the unit suites therefore do
 * not cover: that `@Transaction()` is actually composed onto the service
 * method, that najm-auth's writes join that same transaction rather than
 * committing beside it, and that a failure rolls the credential back.
 */

const DB_URL = process.env.DB_URL ?? process.env.DATABASE_URL;

/**
 * Probed at module load, before `describe` runs, because `skipIf` is evaluated
 * at registration time — a `beforeAll` probe would be too late and every case
 * would report as a pass.
 */
const probe = await (async () => {
  if (!DB_URL) return { ok: false as const, reason: 'DB_URL is not set' };
  try {
    const postgres = (await import('postgres')).default;
    const sql = postgres(DB_URL, { max: 1, connect_timeout: 5, onnotice: () => {} });
    await sql`select 1`;
    return { ok: true as const, sql };
  } catch (error) {
    return { ok: false as const, reason: (error as Error).message };
  }
})();

if (!probe.ok) {
  console.warn(`[access-reset:pg] SUITE SKIPPED — ${probe.reason}. Atomicity remains unproven.`);
}

const sql: any = probe.ok ? probe.sql : null;

/**
 * `audit_logs.user_id` is NOT NULL and references `users`, so every audit row
 * these tests cause — directly or through the command — needs a real actor to
 * point at. This is that actor: created once, deleted at the end, and never an
 * account the suite did not make.
 */
const ADMIN_ID = 'pgaradmin';
const ADMIN_ACTOR = { id: ADMIN_ID, role: 'admin' };

beforeAll(async () => {
  if (!probe.ok) return;
  const [role] = await sql`select id from roles where name = 'admin' limit 1`;
  await sql`
    insert into users (id, name, email, password, status, role_id)
    values (${ADMIN_ID}, 'Access Reset Probe Admin', 'ar-probe-admin@example.invalid',
            'probe-hash', 'active', ${role?.id ?? null})
    on conflict (id) do nothing
  `;
});

afterAll(async () => {
  if (sql) {
    await sql`delete from audit_logs where user_id = ${ADMIN_ID}`.catch(() => {});
    await sql`delete from users where id = ${ADMIN_ID}`.catch(() => {});
    await sql.end({ timeout: 5 }).catch(() => {});
  }
});

/**
 * A container holding only what this command needs.
 *
 * The full `server` from `src/index.ts` also boots RAG, the chatbot and MCP,
 * which reach for an embedding host that has nothing to do with this test and
 * would turn an unrelated outage into a failure here.
 */
const buildContainer = async () => {
  const { Server } = await import('najm-core');
  const config = await import('../../src/config');

  const server = new Server()
    .use(config.databaseConfig())
    .use(config.cacheConfig())
    .use(config.i18nConfig())
    .use(config.validationConfig())
    .use(config.eventsConfig())
    .use(config.emailConfig())
    .use(config.authConfig())
    .load({ AccessResetService, AccessResetRepository, AccessResetValidator });

  await server.init();
  return server;
};

describe.skipIf(!probe.ok)('audit_logs accepts the access-reset security record', () => {
  it('stores actor, target, mode, reason and outcome without losing the metadata', async () => {
    await sql
      .begin(async (tx: any) => {
        const [row] = await tx`
          insert into audit_logs
            (user_id, user_role, action, resource, resource_id, status, ip_address, metadata)
          values
            (${ADMIN_ID}, 'admin', 'access.reset', 'user-access', 'target-user',
             'success', null,
             ${sql.json({
               mode: 'parent_credential_setup',
               reason: 'Parent lost their password',
               outcome: 'credential_replaced',
             })})
          returning action, resource, resource_id, status, metadata
        `;

        expect(row.action).toBe('access.reset');
        expect(row.resource).toBe('user-access');
        expect(row.resource_id).toBe('target-user');
        expect(row.status).toBe('success');
        expect(row.metadata.mode).toBe('parent_credential_setup');
        expect(row.metadata.outcome).toBe('credential_replaced');

        const serialized = JSON.stringify(row.metadata).toLowerCase();
        expect(serialized).not.toContain('token');
        expect(serialized).not.toContain('http');

        throw new Error('rollback fixture');
      })
      .catch((error: Error) => {
        if (error.message !== 'rollback fixture') throw error;
      });
  });

  it('accepts the value-free undeliveredLinkLive flag', async () => {
    await sql
      .begin(async (tx: any) => {
        const [row] = await tx`
          insert into audit_logs
            (user_id, user_role, action, resource, resource_id, status, metadata)
          values
            (${ADMIN_ID}, 'admin', 'access.reset', 'user-access', 'target-user', 'failure',
             ${sql.json({ mode: 'reset_email_sent', reason: 'retry', outcome: 'not_sent', undeliveredLinkLive: true })})
          returning metadata
        `;
        expect(row.metadata.undeliveredLinkLive).toBe(true);
        throw new Error('rollback fixture');
      })
      .catch((error: Error) => {
        if (error.message !== 'rollback fixture') throw error;
      });
  });
});

describe.skipIf(!probe.ok)('the real command against a real database', () => {
  /**
   * Fixtures are created by this suite and deleted by it. It must never touch
   * an account it did not create.
   *
   * `digits` must be digits only: a CIN is 1–3 letters followed by digits, so
   * a base-36 suffix would produce an invalid one and the command would refuse
   * the fixture for the wrong reason.
   */
  const makeParent = async (digits: string) => {
    const userId = `pgu${digits}`;
    const parentId = `pgp${digits}`;
    const [role] = await sql`select id from roles where name = 'parent' limit 1`;
    if (!role) throw new Error('no parent role seeded — run the role seed first');

    await sql`
      insert into users (id, name, email, password, status, role_id)
      values (${userId}, 'Access Reset Probe', ${`ar-${digits}@example.invalid`},
              'original-hash', 'active', ${role.id})
    `;
    await sql`
      insert into parents (id, user_id, name, cin, relationship_type)
      values (${parentId}, ${userId}, 'Access Reset Probe', ${`ar${digits}`}, 'father')
    `;
    return { userId, parentId };
  };

  /**
   * Six digits keeps `ar` + digits inside the 7–20 character CIN shape. The
   * counter matters: `users.email`, `parents.cin` and both ids are unique, and
   * two cases starting inside the same millisecond would otherwise collide on
   * every one of them.
   */
  let sequence = 0;
  const digitSuffix = () =>
    String((Date.now() + sequence++) % 1_000_000).padStart(6, '0');

  const cleanup = async (userId: string, parentId: string) => {
    await sql`delete from audit_logs where resource_id = ${userId}`;
    await sql`delete from parents where id = ${parentId}`;
    await sql`delete from users where id = ${userId}`;
  };

  it('rolls the credential back when the audit write inside the same transaction fails', async () => {
    const { userId, parentId } = await makeParent(digitSuffix());
    const server = await buildContainer();

    try {
      const service = await server.container.resolve(AccessResetService);
      const repository = await server.container.resolve(AccessResetRepository);

      const original = repository.recordAudit.bind(repository);
      repository.recordAudit = async () => {
        throw new Error('audit write failed');
      };

      try {
        await expect(
          service.resetAccess(
            userId,
            { reason: 'Atomicity probe', expectedMode: 'parent_credential_setup' },
            ADMIN_ACTOR,
          ),
        ).rejects.toThrow(/audit write failed/);
      } finally {
        repository.recordAudit = original;
      }

      // If this is not the original hash, najm-auth's credential write
      // committed outside School's transaction: the parent would be holding a
      // temporary credential that no audit row explains.
      const [after] = await sql`select password from users where id = ${userId}`;
      expect(after.password).toBe('original-hash');

      const [audited] = await sql`select count(*)::int as n from audit_logs where resource_id = ${userId}`;
      expect(audited.n).toBe(0);

      // The rolled-back attempt must also leave no credential-setup demand.
      const [required] = await sql`
        select count(*)::int as n from credential_setup_requirements where user_id = ${userId}
      `;
      expect(required.n).toBe(0);
    } finally {
      await cleanup(userId, parentId);
    }
  });

  it('refuses a second command for the same target inside the cooldown window', async () => {
    const { userId, parentId } = await makeParent(digitSuffix());
    const server = await buildContainer();

    try {
      const service = await server.container.resolve(AccessResetService);
      const body = { reason: 'Concurrency probe', expectedMode: 'parent_credential_setup' as const };

      const results = await Promise.allSettled([
        service.resetAccess(userId, body, ADMIN_ACTOR),
        service.resetAccess(userId, body, ADMIN_ACTOR),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);

      const [audited] = await sql`select count(*)::int as n from audit_logs where resource_id = ${userId}`;
      expect(audited.n).toBe(1);
    } finally {
      await cleanup(userId, parentId);
    }
  });
});
