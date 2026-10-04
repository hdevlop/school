import { FileCategory, storage } from 'najm-storage';

import { isAdmin, isAuth } from '../auth';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const storageConfig = () =>
  storage({
    provider: 'local',
    basePath: 'storage',
    servePrefix: '/api',
    maxFileSize: MAX_FILE_SIZE,
    allowedCategories: [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT],
    enableCascadeDelete: true,
    // School uploads files through REST and its own services, so MCP file tools
    // stay disabled. Signed-in users may serve files; only admins may manage them.
    mcp: false,
    guards: [isAuth()],
    manageGuards: [isAdmin()],
  });
