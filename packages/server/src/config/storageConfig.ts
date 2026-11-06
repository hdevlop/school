import { FileCategory, storage, StorageValidator } from 'najm-storage';

import { isAdmin, isAuth } from '../auth';
import type { NajmPlugin } from 'najm-core';
import { privateStorage } from './PrivateStorageGuard';
import { SchoolStorageValidator } from './SchoolStorageValidator';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** The folder uploads are stored in, relative to the working directory unless absolute. */
export const storageBasePath = () => process.env.SCHOOL_STORAGE_PATH?.trim() || 'storage';

export const storageConfig = (): NajmPlugin => {
  const configured = storage({
    provider: 'local',
    basePath: storageBasePath(),
    servePrefix: '/api',
    maxFileSize: MAX_FILE_SIZE,
    // Union for the shared provider; SchoolStorageValidator restricts each
    // write to its namespace's categories before StorageService saves it.
    allowedCategories: [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT, FileCategory.SPREADSHEET, FileCategory.TEXT],
    enableCascadeDelete: true,
    // School uploads files through REST and its own services, so MCP file tools
    // stay disabled. Signed-in users may serve files; only admins may manage them.
    mcp: false,
    guards: [isAuth(), privateStorage()],
    manageGuards: [isAdmin()],
  });
  return {
    ...configured,
    services: [...(configured.services ?? []).filter(service => service !== StorageValidator), SchoolStorageValidator],
    aliases: [...(configured.aliases ?? []), [StorageValidator, SchoolStorageValidator]],
  };
};
