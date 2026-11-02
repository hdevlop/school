import { sql } from 'drizzle-orm';

import { DB } from '../../database/db';
import { Repository } from '../../najm';
import type { BackupMigration } from './backupMigrations';

export type BackupTable = { name: string; columns: string[]; identity: boolean };
export type BackupReference = { table: string; references: string };
export type BackupRowPage = { rows: string[]; last: string | null };
export type AccessDefaults = {
  roles: { id: string; name: string; description: string }[];
  permissions: { id: string; name: string; description: string; resource: string; action: string }[];
  grants: { role: string; permission: string }[];
};

const table = (name: string) => sql.identifier(name);
const columnList = (columns: string[]) => sql.join(columns.map(column => sql.identifier(column)), sql`, `);

/**
 * Reads and writes whole tables in PostgreSQL's own JSON form, so every value
 * (numeric, timestamp, array, vector) comes back exactly as it was stored.
 */
@Repository()
export class BackupRepository {
  declare db: DB;

  /** The school's tables with the columns a restore writes: generated columns compute themselves. */
  async tables(): Promise<BackupTable[]> {
    // Columns come back as JSON text: a PostgreSQL array would make the driver
    // look up array types first, which stalls inside a transaction.
    const rows = await this.db.execute<{ name: string; columns: string; identity: boolean }>(sql`
      SELECT c.relname AS name,
        coalesce(json_agg(a.attname::text ORDER BY a.attnum) FILTER (WHERE a.attgenerated = ''), '[]')::text AS columns,
        bool_or(a.attidentity <> '') AS identity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
      GROUP BY c.relname
      ORDER BY c.relname`);
    return rows.map(({ name, columns, identity }) => ({ name, columns: JSON.parse(columns) as string[], identity }));
  }

  async references(): Promise<BackupReference[]> {
    const rows = await this.db.execute<BackupReference>(sql`
      SELECT DISTINCT child.relname AS "table", parent.relname AS "references"
      FROM pg_constraint k
      JOIN pg_class child ON child.oid = k.conrelid
      JOIN pg_class parent ON parent.oid = k.confrelid
      JOIN pg_namespace n ON n.oid = child.relnamespace
      WHERE k.contype = 'f' AND n.nspname = 'public'`);
    return [...rows];
  }

  /** The newest applied migration: a backup records it, a restore starts from it. */
  async latestMigration() {
    const [row] = await this.db.execute<{ hash: string; created_at: string | number }>(sql`
      SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC, id DESC LIMIT 1`);
    return row ? { hash: row.hash, createdAt: Number(row.created_at) } : null;
  }

  async schoolName() {
    const [row] = await this.db.execute<{ school_name: string | null }>(sql`SELECT school_name FROM settings LIMIT 1`);
    return row?.school_name ?? null;
  }

  /** One page of rows in physical order, continuing after `after` (a row position). */
  async readRows(name: string, after: string | null, limit: number): Promise<BackupRowPage> {
    const rows = await this.db.execute<{ position: string; row: string }>(sql`
      SELECT t.ctid::text AS position, row_to_json(t)::text AS row
      FROM ${table(name)} t
      WHERE t.ctid > ${after ?? '(0,0)'}::tid
      ORDER BY t.ctid
      LIMIT ${limit}`);
    return { rows: rows.map(({ row }) => row), last: rows.at(-1)?.position ?? null };
  }

  /** One restore at a time, held until its transaction ends. */
  async lockRestore() {
    await this.db.execute(sql`SELECT pg_advisory_xact_lock(hashtext('school.backup.restore'))`);
  }

  /** Users and session families as they are before a restore, so their sessions can be ended after it. */
  async signedInState() {
    const families = await this.db.execute<{ family: string }>(sql`SELECT DISTINCT token_family AS family FROM tokens WHERE token_family IS NOT NULL`);
    return { userIds: await this.userIds(), families: families.map(({ family }) => family) };
  }

  async userIds() {
    const rows = await this.db.execute<{ id: string }>(sql`SELECT id FROM users`);
    return rows.map(({ id }) => id);
  }

  /** Empties every table at once; one statement, so references between them never block it. */
  async truncate(names: string[]) {
    await this.db.execute(sql`TRUNCATE TABLE ${sql.join(names.map(table), sql`, `)} RESTART IDENTITY`);
  }

  /** The periods no timetable owns, as a JSON array `insertRows` accepts: new timetables copy them. */
  async routinePeriodTemplates() {
    const [row] = await this.db.execute<{ rows: string }>(sql`
      SELECT coalesce(json_agg(t), '[]')::text AS rows FROM routine_periods t WHERE t.schedule_id IS NULL`);
    return row.rows;
  }

  /** Every account but this one goes; its photo went with the uploaded files. */
  async keepOnlyUser(userId: string) {
    await this.db.execute(sql`DELETE FROM users WHERE id <> ${userId}`);
    await this.db.execute(sql`UPDATE users SET image = NULL WHERE id = ${userId}`);
  }

  /**
   * Puts the default roles and grants back, dropping every other role and grant.
   * The catalog goes in as JSON text: see `tables` on arrays inside a transaction.
   */
  async restoreAccessDefaults({ roles, permissions, grants }: AccessDefaults) {
    await this.db.execute(sql`DELETE FROM role_permissions`);
    await this.db.execute(sql`
      DELETE FROM roles WHERE name NOT IN (SELECT name FROM json_to_recordset(${JSON.stringify(roles)}::json) AS d(name text))`);
    await this.db.execute(sql`
      INSERT INTO roles (id, name, description)
      SELECT id, name, description FROM json_to_recordset(${JSON.stringify(roles)}::json) AS d(id text, name text, description text)
      ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`);
    await this.db.execute(sql`
      INSERT INTO permissions (id, name, description, resource, action)
      SELECT id, name, description, resource, action
      FROM json_to_recordset(${JSON.stringify(permissions)}::json) AS d(id text, name text, description text, resource text, action text)
      ON CONFLICT (name) DO NOTHING`);
    await this.db.execute(sql`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM json_to_recordset(${JSON.stringify(grants)}::json) AS d(role text, permission text)
      JOIN roles r ON r.name = d.role
      JOIN permissions p ON p.name = d.permission`);
  }

  /** `rows` is a JSON array of the objects `readRows` produced. */
  async insertRows({ name, columns, identity }: BackupTable, rows: string) {
    await this.db.execute(sql`
      INSERT INTO ${table(name)} (${columnList(columns)}) ${identity ? sql`OVERRIDING SYSTEM VALUE ` : sql``}
      SELECT ${columnList(columns)} FROM json_populate_recordset(NULL::${table(name)}, ${rows}::json)`);
  }

  /**
   * Drops everything the migrations made in the public schema: tables (with
   * their indexes, triggers and sequences), views, routines and types. What an
   * extension owns, such as pgvector's type, stays; the migrations create
   * extensions only if missing. The drizzle ledger is in its own schema.
   */
  async dropSchema() {
    await this.db.execute(sql`
      DO $$
      DECLARE item record;
      BEGIN
        FOR item IN
          SELECT format('DROP %s IF EXISTS public.%I CASCADE',
            CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE'
              WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END, c.relname) AS statement
          FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'f', 'v', 'm', 'S')
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
          ORDER BY c.relkind IN ('r', 'p', 'f') DESC
        LOOP
          EXECUTE item.statement;
        END LOOP;
        FOR item IN
          SELECT format('DROP ROUTINE IF EXISTS %s CASCADE', p.oid::regprocedure) AS statement
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
        LOOP
          EXECUTE item.statement;
        END LOOP;
        FOR item IN
          SELECT format('DROP %s IF EXISTS public.%I CASCADE', CASE t.typtype WHEN 'd' THEN 'DOMAIN' ELSE 'TYPE' END, t.typname) AS statement
          FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
          LEFT JOIN pg_class c ON c.oid = t.typrelid
          WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd', 'r', 'c') AND (t.typtype <> 'c' OR c.relkind = 'c')
            AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')
        LOOP
          EXECUTE item.statement;
        END LOOP;
      END $$`);
  }

  /**
   * Runs these migrations' statements the way `drizzle-kit migrate` does,
   * without recording them: the ledger already lists every one.
   */
  async runMigrations(migrations: BackupMigration[]) {
    for (const migration of migrations) {
      for (const statement of migration.sql) {
        if (statement.trim()) await this.db.execute(sql.raw(statement));
      }
    }
  }

  /**
   * Runs the integrity checks deferred to commit now, for the rows restored so
   * far, and for every later change in this transaction as it happens. A table
   * with checks still pending could not be altered by a migration.
   */
  async checkConstraintsNow() {
    await this.db.execute(sql`SET CONSTRAINTS ALL IMMEDIATE`);
  }

  async countRows(name: string) {
    const [row] = await this.db.execute<{ count: string | number }>(sql`SELECT count(*) AS count FROM ${table(name)}`);
    return Number(row?.count ?? 0);
  }

  /** Points every serial and identity counter past the restored rows. */
  async resetSequences() {
    await this.db.execute(sql`
      DO $$
      DECLARE item record;
      BEGIN
        FOR item IN
          SELECT c.relname AS tbl, a.attname AS col,
            pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
          WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        LOOP
          IF item.seq IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, coalesce(max(%I), 1), max(%I) IS NOT NULL) FROM public.%I', item.seq, item.col, item.col, item.tbl);
          END IF;
        END LOOP;
      END $$`);
  }
}
