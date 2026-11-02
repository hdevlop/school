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
import type { BackupTable } from './BackupRepository';

const excluded = new Set<string>(BACKUP_EXCLUDED_TABLES);

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

  /** Same database version: the same newest migration and the same tables. */
  ensureSameVersion(manifest: BackupManifest, migration: { hash: string } | null, tables: BackupTable[]) {
    const current = tables.map(({ name }) => name).filter(name => !excluded.has(name)).sort();
    const backedUp = Object.keys(manifest.tables).sort();
    if (!migration || manifest.migration.hash !== migration.hash || current.join() !== backedUp.join()) {
      Err(409, t('backup.errors.otherVersion'));
    }
  }

  ensureRows(rows: string[] | null, expected: number) {
    if (!rows || rows.length !== expected) Err(400, t('backup.errors.damaged'));
  }
}
