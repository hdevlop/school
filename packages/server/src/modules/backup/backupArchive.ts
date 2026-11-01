import { strFromU8, strToU8, unzipSync, Zip, ZipDeflate, ZipPassThrough } from 'fflate';

import { BACKUP_FILES_PREFIX, BACKUP_MANIFEST_NAME, backupTableEntry } from '@sms/contracts/backup';
import type { BackupReference, BackupTable } from './BackupRepository';

/** Formats that are already compressed are stored as they are. */
const STORED = /\.(?:jpe?g|png|gif|webp|avif|pdf|zip|gz|mp4|mp3|woff2?)$/i;

/** Builds the archive in memory, one entry after another. */
export class BackupArchiveWriter {
  private readonly chunks: Uint8Array[] = [];
  private failure: Error | null = null;
  private readonly zip = new Zip((error, chunk) => {
    if (error) this.failure = error;
    else this.chunks.push(chunk);
  });

  /** An entry written in parts, for tables read a page at a time. */
  lines(name: string) {
    const entry = new ZipDeflate(name, { level: 6 });
    this.zip.add(entry);
    return {
      push: (lines: string[]) => { if (lines.length) entry.push(strToU8(`${lines.join('\n')}\n`)); },
      end: () => entry.push(new Uint8Array(0), true),
    };
  }

  text(name: string, content: string) {
    const entry = new ZipDeflate(name, { level: 6 });
    this.zip.add(entry);
    entry.push(strToU8(content), true);
  }

  file(name: string, data: Uint8Array) {
    const entry = STORED.test(name) ? new ZipPassThrough(name) : new ZipDeflate(name, { level: 6 });
    this.zip.add(entry);
    entry.push(data, true);
  }

  finish(): Blob {
    this.zip.end();
    if (this.failure) throw this.failure;
    return new Blob(this.chunks as BlobPart[], { type: 'application/zip' });
  }
}

/** Reads entries from an archive held in memory; throws on a damaged one. */
export class BackupArchiveReader {
  readonly names: string[] = [];

  constructor(private readonly data: Uint8Array) {
    unzipSync(data, { filter: ({ name }) => { this.names.push(name); return false; } });
  }

  read(names: string[]): Record<string, Uint8Array> {
    const wanted = new Set(names);
    return unzipSync(this.data, { filter: ({ name }) => wanted.has(name) });
  }

  manifest(): unknown {
    const entry = this.read([BACKUP_MANIFEST_NAME])[BACKUP_MANIFEST_NAME];
    return entry ? JSON.parse(strFromU8(entry)) : null;
  }

  /** A table's rows, one JSON object per line. */
  rows(table: string): string[] | null {
    const entry = this.read([backupTableEntry(table)])[backupTableEntry(table)];
    return entry ? strFromU8(entry).split('\n').filter(Boolean) : null;
  }

  get fileNames() {
    return this.names.filter(name => name.startsWith(BACKUP_FILES_PREFIX) && !name.endsWith('/'));
  }
}

/** Rows grouped for one INSERT each, as JSON arrays below a size that keeps each statement small. */
export function rowBatches(rows: string[], maxRows = 1000, maxBytes = 8 * 1024 * 1024): string[] {
  const batches: string[] = [];
  let batch: string[] = [];
  let bytes = 0;
  for (const row of rows) {
    if (batch.length && (batch.length >= maxRows || bytes + row.length > maxBytes)) {
      batches.push(`[${batch.join(',')}]`);
      batch = [];
      bytes = 0;
    }
    batch.push(row);
    bytes += row.length;
  }
  if (batch.length) batches.push(`[${batch.join(',')}]`);
  return batches;
}

/** Tables ordered so every table comes after the tables it references. */
export function insertionOrder(tables: BackupTable[], references: BackupReference[]): BackupTable[] {
  const byName = new Map(tables.map(table => [table.name, table]));
  const parents = new Map(tables.map(({ name }) => [name, new Set<string>()]));
  for (const { table, references: parent } of references) {
    if (table !== parent && byName.has(parent)) parents.get(table)?.add(parent);
  }
  const ordered: BackupTable[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (name: string, path: string[]) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting') throw new Error(`Tables reference each other in a loop: ${[...path, name].join(' → ')}`);
    state.set(name, 'visiting');
    for (const parent of [...parents.get(name)!].sort()) visit(parent, [...path, name]);
    state.set(name, 'done');
    ordered.push(byName.get(name)!);
  };
  for (const { name } of [...tables].sort((a, b) => a.name.localeCompare(b.name))) visit(name, []);
  return ordered;
}

/** `school-backup-2026-11-01-1530.zip`, from the backup's UTC time. */
export function backupFileName(createdAt: string) {
  const stamp = createdAt.slice(0, 16).replace('T', '-').replace(':', '');
  return `school-backup-${stamp}.zip`;
}
