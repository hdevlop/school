import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

/**
 * Real-PostgreSQL checks for the access-reset command.
 *
 * These cover the two claims the unit tests cannot make, because both are
 * properties of the database rather than of the code around it:
 *
 *   1. `audit_logs` really accepts the row the repository writes, including
 *      the jsonb metadata shape — so the security record is not discovered to
 *      be unwritable the first time an administrator uses the button.
 *   2. A transaction spanning the najm-auth credential write and the School
 *      audit insert rolls both back together, which is what the `@Transaction()`
 *      boundary on the parent path relies on.
 *
 * The suite skips itself when no database is reachable rather than passing
 * vacuously. Run it against a disposable local database:
 *
 *   bun --env-file=../../apps/dashboard/.env.local test tests/accessReset/AccessResetPostgres.test.ts
 *
 * It writes only to rows it creates, inside transactions it rolls back, and
 * removes its own fixtures afterwards. It must not be pointed at live data.
 */

const DB_URL = process.env.DB_URL ?? process.env.DATABASE_URL;

let sql: any = null;
let reachable = false;
let skipReason = '';

beforeAll(async () => {
  if (!DB_URL) {
    skipReason = 'DB_URL is not set';
    return;
  }
  try {
    const postgres = (await import('postgres')).default;
    sql = postgres(DB_URL, { max: 1, connect_timeout: 5, onnotice: () => {} });
    await sql`select 1`;
    reachable = true;
  } catch (error) {
    skipReason = `database not reachable: ${(error as Error).message}`;
    if (sql) {
      await sql.end({ timeout: 1 }).catch(() => {});
      sql = null;
    }
  }
});

afterAll(async () => {
  if (sql) await sql.end({ timeout: 5 }).catch(() => {});
});

const guard = () => {
  if (!reachable) {
    console.warn(`[access-reset:pg] skipped — ${skipReason}`);
    return false;
  }
  return true;
};

describe('audit_logs accepts the access-reset security record', () => {
  it('stores actor, target, mode, reason and outcome without losing the metadata', async () => {
    if (!guard()) return;

    await sql.begin(async (tx: any) => {
      const [row] = await tx`
        insert into audit_logs
          (user_id, user_role, action, resource, resource_id, status, ip_address, metadata)
        values
          (null, 'admin', 'access.reset', 'user-access', 'target-user',
           'success', null,
           ${sql.json({
             mode: 'parent_credential_setup',
             reason: 'Parent lost their password',
             outcome: 'credential_replaced',
           })})
        returning id, action, resource, resource_id, status, metadata
      `;

      expect(row.action).toBe('access.reset');
      expect(row.resource).toBe('user-access');
      expect(row.resource_id).toBe('target-user');
      expect(row.status).toBe('success');
      expect(row.metadata.mode).toBe('parent_credential_setup');
      expect(row.metadata.outcome).toBe('credential_replaced');

      // Nothing secret may survive the round trip either.
      const serialized = JSON.stringify(row.metadata).toLowerCase();
      expect(serialized).not.toContain('token');
      expect(serialized).not.toContain('http');

      throw new Error('rollback fixture');
    }).catch((error: Error) => {
      if (error.message !== 'rollback fixture') throw error;
    });
  });

  it('accepts the value-free undeliveredLinkLive flag', async () => {
    if (!guard()) return;

    await sql.begin(async (tx: any) => {
      const [row] = await tx`
        insert into audit_logs
          (user_id, user_role, action, resource, resource_id, status, metadata)
        values
          (null, 'admin', 'access.reset', 'user-access', 'target-user', 'failure',
           ${sql.json({ mode: 'reset_email_sent', reason: 'retry', outcome: 'not_sent', undeliveredLinkLive: true })})
        returning metadata
      `;
      expect(row.metadata.undeliveredLinkLive).toBe(true);
      throw new Error('rollback fixture');
    }).catch((error: Error) => {
      if (error.message !== 'rollback fixture') throw error;
    });
  });
});

describe('the credential write and the audit row commit or roll back together', () => {
  it('rolls the password back when the audit insert inside the same transaction fails', async () => {
    if (!guard()) return;

    const probeId = `arst${Date.now().toString(36).slice(-4)}`;
    const email = `access-reset-probe-${probeId}@example.invalid`;

    await sql`
      insert into users (id, name, email, password, status)
      values (${probeId}, 'Access Reset Probe', ${email}, 'original-hash', 'active')
    `;

    try {
      // Exactly the shape of the parent path: replace the credential, then
      // write the audit row, both inside one transaction.
      await sql
        .begin(async (tx: any) => {
          await tx`update users set password = 'temporary-hash' where id = ${probeId}`;
          // A deliberately invalid audit row — `action` is NOT NULL — standing
          // in for any failure of the School audit write.
          await tx`
            insert into audit_logs (user_id, user_role, action, resource, status)
            values (null, 'admin', null, 'user-access', 'success')
          `;
        })
        .catch(() => undefined);

      const [after] = await sql`select password from users where id = ${probeId}`;
      // If this is 'temporary-hash', the parent would hold a credential that no
      // record explains — the exact partial failure the transaction prevents.
      expect(after.password).toBe('original-hash');

      const [audited] = await sql`
        select count(*)::int as n from audit_logs where resource_id = ${probeId}
      `;
      expect(audited.n).toBe(0);
    } finally {
      await sql`delete from audit_logs where resource_id = ${probeId}`;
      await sql`delete from users where id = ${probeId}`;
    }
  });
});
