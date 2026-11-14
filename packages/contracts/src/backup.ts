/**
 * A whole school in one ZIP: every table of the database, one JSON-lines file
 * each, and every uploaded file. It restores into the same database version
 * or through an explicitly reviewed data-only upgrade, keeping every ID so
 * links between records survive unchanged.
 */
export const BACKUP_FORMAT = 'school-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_MANIFEST_NAME = 'manifest.json';
export const BACKUP_TABLES_PREFIX = 'database/';
export const BACKUP_FILES_PREFIX = 'files/';
/** The archive is read in memory on the server, so it stays below what a small server can hold. */
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

/**
 * Left out of a backup and emptied by a restore: sign-in sessions and one-time
 * setup links belong to the moment, not the school. Restoring them would revive
 * sessions that were ended since.
 */
export const BACKUP_EXCLUDED_TABLES = ['tokens', 'credential_setup_sessions'] as const;

/**
 * Storage folders left out of a backup. Homework photos expire on their own
 * and would soon outgrow MAX_BACKUP_BYTES, which a restore refuses; the text of
 * each homework is in the database and is kept. After a restore those files
 * are gone, and their attachments are marked as removed.
 */
export const BACKUP_EXCLUDED_FILE_NAMESPACES = ['homework'] as const;

/** Whether a stored file, by its path inside the storage folder, belongs in a backup. */
export function isBackedUpFile(path: string): boolean {
  const folder = path.split('/')[0]?.toLowerCase() ?? '';
  return !(BACKUP_EXCLUDED_FILE_NAMESPACES as readonly string[]).includes(folder);
}

export type BackupManifest = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  schoolName: string | null;
  /** The newest database migration applied when the backup was made. */
  migration: { hash: string; createdAt: number };
  /** Rows per table, by table name. */
  tables: Record<string, number>;
  files: { count: number; bytes: number };
};

/** One line per row of `database/<table>.jsonl`. */
export const backupTableEntry = (table: string) => `${BACKUP_TABLES_PREFIX}${table}.jsonl`;

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const TABLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/;

export function isBackupManifest(value: unknown): value is BackupManifest {
  if (!record(value) || value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) return false;
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) return false;
  if (value.schoolName !== null && typeof value.schoolName !== 'string') return false;
  const { migration, tables, files } = value;
  if (!record(migration) || typeof migration.hash !== 'string' || !migration.hash || !count(migration.createdAt)) return false;
  if (!record(tables) || !Object.keys(tables).length) return false;
  if (!Object.entries(tables).every(([name, rows]) => TABLE_NAME.test(name) && count(rows))) return false;
  return record(files) && count(files.count) && count(files.bytes);
}

/**
 * A stored file's path inside the storage folder, or null when the archive
 * names one that could land outside it. Top-level names starting with a dot
 * are the restore's own working folders, never school files.
 */
export function backupFilePath(entry: string): string | null {
  if (!entry.startsWith(BACKUP_FILES_PREFIX)) return null;
  const path = entry.slice(BACKUP_FILES_PREFIX.length);
  const parts = path.split('/');
  if (!path || path.includes('\\') || path.includes('\0') || /^[A-Za-z]:/.test(path)) return null;
  if (parts[0].startsWith('.') || parts.some(part => !part || part === '.' || part === '..')) return null;
  return path;
}
