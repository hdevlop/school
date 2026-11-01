import { sql } from 'drizzle-orm';

import { DB } from '../../database/db';
import { Repository } from '../../najm';

export type BackupTable = { name: string; columns: string[]; identity: boolean };
export type BackupReference = { table: string; references: string };
export type BackupRowPage = { rows: string[]; last: string | null };

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

  /** The newest applied migration: a backup restores only into the same database version. */
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

  /** `rows` is a JSON array of the objects `readRows` produced. */
  async insertRows({ name, columns, identity }: BackupTable, rows: string) {
    await this.db.execute(sql`
      INSERT INTO ${table(name)} (${columnList(columns)}) ${identity ? sql`OVERRIDING SYSTEM VALUE ` : sql``}
      SELECT ${columnList(columns)} FROM json_populate_recordset(NULL::${table(name)}, ${rows}::json)`);
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
