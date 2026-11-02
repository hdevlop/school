import {
  BACKUP_EXCLUDED_TABLES,
  BACKUP_MANIFEST_NAME,
  backupFilePath,
  backupTableEntry,
  isBackupManifest,
  MAX_BACKUP_BYTES,
  type BackupManifest,
} from '@sms/contracts/backup';
import { UserService, UserValidator } from 'najm-auth';
import { Err, Inject, Service, t } from '../../najm';
import { BackupArchiveReader } from './backupArchive';
import type { BackupMigration } from './backupMigrations';
import type { BackupTable } from './BackupRepository';

const excluded = new Set<string>(BACKUP_EXCLUDED_TABLES);

export type RestorePlan = {
  /** Rebuild the database as it was when the backup was made. */
  schema: BackupMigration[];
  /** Then bring the restored rows up to this version, as a deploy did for the live ones. */
  upgrade: BackupMigration[];
};

@Service()
export class BackupValidator {
  @Inject(UserService) private users!: UserService;
  @Inject(UserValidator) private passwords!: UserValidator;

  /** The signed-in account's own password, asked again before everything is deleted. */
  async ensurePassword(userId: string, password: string) {
    const account = await this.users.getAuthRecordById(userId);
    const valid = account?.password ? await this.passwords.comparePassword(password, account.password) : false;
    if (!valid) Err(400, t('backup.errors.wrongPassword'));
  }

  /** The archive and its manifest, or a refusal before anything is written. */
  readArchive(data: Uint8Array): { archive: BackupArchiveReader; manifest: BackupManifest } {
    if (data.byteLength > MAX_BACKUP_BYTES) Err(413, t('backup.errors.tooLarge'));
    let archive: BackupArchiveReader | undefined;
    let manifest: unknown;
    try {
      archive = new BackupArchiveReader(data);
      manifest = archive.names.includes(BACKUP_MANIFEST_NAME) ? archive.manifest() : null;
    } catch {
      manifest = null;
    }
    if (!archive || !isBackupManifest(manifest)) return Err(400, t('backup.errors.invalidFile'));
    return { archive, manifest };
  }

  /** Every table the manifest counts is in the archive, and every stored file stays inside the storage folder. */
  ensureComplete(archive: BackupArchiveReader, manifest: BackupManifest) {
    const names = new Set(archive.names);
    const tablesPresent = Object.keys(manifest.tables).every(table => names.has(backupTableEntry(table)));
    const files = archive.fileNames;
    if (!tablesPresent || files.length !== manifest.files.count || !files.every(name => backupFilePath(name))) {
      Err(400, t('backup.errors.damaged'));
    }
  }

  /**
   * A migration is named by its journal timestamp (`created_at`), as drizzle
   * does: its hash is of the file's bytes, which differ between CRLF and LF
   * checkouts. The database must be at this app's newest migration, and the
   * backup at one of them; a newer or unknown backup is refused.
   */
  restorePlan(manifest: BackupManifest, installed: { createdAt: number } | null, migrations: BackupMigration[]): RestorePlan {
    if (!installed || installed.createdAt !== migrations.at(-1)?.folderMillis) Err(409, t('backup.errors.databaseMismatch'));
    const made = migrations.findIndex(({ folderMillis }) => folderMillis === manifest.migration.createdAt);
    if (made < 0) Err(409, t('backup.errors.otherVersion'));
    return { schema: migrations.slice(0, made + 1), upgrade: migrations.slice(made + 1) };
  }

  /**
   * Every table the rebuilt database has is in the backup. A backed-up table
   * no migration creates (left by older code, a test marker, a plugin's own
   * scratch table) is not the school's data and is left out.
   */
  ensureTables(manifest: BackupManifest, tables: BackupTable[]) {
    if (tables.some(({ name }) => !excluded.has(name) && !Object.hasOwn(manifest.tables, name))) Err(400, t('backup.errors.damaged'));
  }

  ensureRows(rows: string[] | null, expected: number) {
    if (!rows || rows.length !== expected) Err(400, t('backup.errors.damaged'));
  }
}
