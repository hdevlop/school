import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readMigrationFiles, type MigrationMeta } from 'drizzle-orm/migrator';

export type BackupMigration = MigrationMeta;

/**
 * The folder `drizzle-kit migrate` applies, resolved from this module like the
 * theme's files, so dev, builds and the production image do not depend on cwd.
 */
export const backupMigrationsPath = () => join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'database', 'migrations');

/** Every migration in journal order. Each is named by `folderMillis`, the `created_at` drizzle records. */
export const readBackupMigrations = (folder: string): BackupMigration[] => readMigrationFiles({ migrationsFolder: folder });
