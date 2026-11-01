import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { SessionInvalidationService } from 'najm-auth';
import { nanoid } from 'nanoid';

import {
  BACKUP_EXCLUDED_TABLES,
  BACKUP_FILES_PREFIX,
  BACKUP_FORMAT,
  BACKUP_MANIFEST_NAME,
  BACKUP_VERSION,
  backupFilePath,
  backupTableEntry,
  type BackupManifest,
} from '@sms/contracts/backup';
import { storageBasePath } from '../../config/storageConfig';
import { Inject, Service, Transaction, TransactionService } from '../../najm';
import { BackupArchiveReader, BackupArchiveWriter, backupFileName, insertionOrder, rowBatches } from './backupArchive';
import { BackupRepository, type BackupTable } from './BackupRepository';
import { BackupValidator } from './BackupValidator';

const excluded = new Set<string>(BACKUP_EXCLUDED_TABLES);
const PAGE_ROWS = 2000;
const SESSION_BATCH = 50;

export type BackupRestoreResult = { tables: number; rows: number; files: number; createdAt: string };

@Service()
export class BackupService {
  @Inject(TransactionService) private transactions!: TransactionService;
  /** The uploads folder; tests point it elsewhere. */
  storagePath = storageBasePath();

  constructor(
    private backupRepository: BackupRepository,
    private backupValidator: BackupValidator,
    private sessions: SessionInvalidationService,
  ) {}

  async download() {
    const { manifest, archive } = await this.createBackup();
    return new Response(archive, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupFileName(manifest.createdAt)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  /** Every table read from one snapshot, so the backup never holds half of a change. */
  @Transaction({ isolation: 'repeatable read' })
  async createBackup(): Promise<{ manifest: BackupManifest; archive: Blob }> {
    // One query at a time: a transaction holds a single connection.
    const tables = await this.backupRepository.tables();
    const migration = await this.backupRepository.latestMigration();
    const schoolName = await this.backupRepository.schoolName();
    if (!migration) throw new Error('The database has no applied migrations');
    const writer = new BackupArchiveWriter();
    const counts: Record<string, number> = {};
    for (const { name } of tables) {
      if (excluded.has(name)) continue;
      const entry = writer.lines(backupTableEntry(name));
      counts[name] = 0;
      for (let after: string | null = null, more = true; more;) {
        const page = await this.backupRepository.readRows(name, after, PAGE_ROWS);
        entry.push(page.rows);
        counts[name] += page.rows.length;
        after = page.last;
        more = page.rows.length === PAGE_ROWS;
      }
      entry.end();
    }
    const files = await this.addStoredFiles(writer);
    const manifest: BackupManifest = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      schoolName,
      migration,
      tables: counts,
      files,
    };
    writer.text(BACKUP_MANIFEST_NAME, JSON.stringify(manifest, null, 2));
    return { manifest, archive: writer.finish() };
  }

  /**
   * Replaces the whole school with the backup: files are unpacked beside the
   * current ones first, then every table is emptied and refilled in one
   * transaction that also swaps the files in. Anything refused leaves both as
   * they were. Everyone is signed out afterwards.
   */
  async restore(data: Uint8Array): Promise<BackupRestoreResult> {
    const { archive, manifest } = this.backupValidator.readArchive(data);
    this.backupValidator.ensureComplete(archive, manifest);
    const tables = await this.backupRepository.tables();
    const migration = await this.backupRepository.latestMigration();
    this.backupValidator.ensureSameVersion(manifest, migration, tables);

    const staged = await this.stageFiles(archive);
    let signedIn: { userIds: string[]; families: string[] };
    try {
      signedIn = await this.replaceDatabase(archive, manifest, tables, staged);
    } finally {
      await rm(staged, { recursive: true, force: true });
    }
    await this.endSessions(signedIn);
    return {
      tables: Object.keys(manifest.tables).length,
      rows: Object.values(manifest.tables).reduce((sum, rows) => sum + rows, 0),
      files: manifest.files.count,
      createdAt: manifest.createdAt,
    };
  }

  @Transaction()
  async replaceDatabase(archive: BackupArchiveReader, manifest: BackupManifest, tables: BackupTable[], staged: string) {
    await this.backupRepository.lockRestore();
    const before = await this.backupRepository.signedInState();
    await this.backupRepository.truncate(tables.map(({ name }) => name));
    for (const table of insertionOrder(tables, await this.backupRepository.references())) {
      if (excluded.has(table.name)) continue;
      const rows = archive.rows(table.name);
      this.backupValidator.ensureRows(rows, manifest.tables[table.name]);
      for (const batch of rowBatches(rows!)) await this.backupRepository.insertRows(table, batch);
    }
    await this.backupRepository.resetSequences();
    const restoredUsers = await this.backupRepository.userIds();
    await this.swapFiles(staged);
    return { userIds: [...new Set([...before.userIds, ...restoredUsers])], families: before.families };
  }

  private get storageRoot() {
    return resolve(this.storagePath);
  }

  private async addStoredFiles(writer: BackupArchiveWriter) {
    let count = 0;
    let bytes = 0;
    const root = this.storageRoot;
    const entries = await readdir(root, { recursive: true, withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const path = join(entry.parentPath, entry.name);
      const name = `${BACKUP_FILES_PREFIX}${relative(root, path).split(sep).join('/')}`;
      if (!backupFilePath(name)) continue;
      const data = await readFile(path);
      writer.file(name, data);
      count += 1;
      bytes += data.byteLength;
    }
    return { count, bytes };
  }

  /** The backup's files, unpacked into a working folder inside the storage folder. */
  private async stageFiles(archive: BackupArchiveReader) {
    const staged = join(this.storageRoot, `.restore-${nanoid(8)}`);
    await mkdir(staged, { recursive: true });
    try {
      const names = archive.fileNames;
      for (let start = 0; start < names.length; start += 200) {
        const files = archive.read(names.slice(start, start + 200));
        for (const [name, data] of Object.entries(files)) {
          const target = join(staged, ...backupFilePath(name)!.split('/'));
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, data);
        }
      }
    } catch (error) {
      await rm(staged, { recursive: true, force: true });
      throw error;
    }
    return staged;
  }

  /**
   * Moves the current files aside and the backup's in, inside the
   * transaction: a rollback moves them back, a commit deletes the old ones.
   */
  private async swapFiles(staged: string) {
    const root = this.storageRoot;
    const previous = join(root, `.previous-${nanoid(8)}`);
    await mkdir(previous, { recursive: true });
    const moveAll = async (from: string, to: string) => {
      for (const name of await readdir(from)) {
        if (name.startsWith('.')) continue;
        await rename(join(from, name), join(to, name));
      }
    };
    const putBack = async () => {
      const discarded = join(root, `.discarded-${nanoid(8)}`);
      await mkdir(discarded, { recursive: true });
      await moveAll(root, discarded);
      await moveAll(previous, root);
      await rm(discarded, { recursive: true, force: true });
      await rm(previous, { recursive: true, force: true });
    };
    try {
      await moveAll(root, previous);
      await moveAll(staged, root);
    } catch (error) {
      await putBack();
      throw error;
    }
    if (this.transactions?.isActive()) {
      await this.transactions.afterRollback(putBack);
      await this.transactions.afterCommit(() => rm(previous, { recursive: true, force: true }));
    }
  }

  /** Ends every session that existed before the restore and any the restored accounts held. */
  private async endSessions({ userIds, families }: { userIds: string[]; families: string[] }) {
    for (let start = 0; start < families.length; start += SESSION_BATCH) {
      await Promise.all(families.slice(start, start + SESSION_BATCH).map(family => this.sessions.markFamilyRevoked(family)));
    }
    for (let start = 0; start < userIds.length; start += SESSION_BATCH) {
      await Promise.all(userIds.slice(start, start + SESSION_BATCH).map(userId => this.sessions.invalidateAccessTokens(userId)));
    }
  }
}
