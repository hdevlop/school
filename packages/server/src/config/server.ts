import Redis from 'ioredis';
import { createNajmServer, type NajmServerOptions } from 'najm-api';
import { isNextBuildPhase } from 'najm-next/env';
import { FileCategory } from 'najm-storage';

import { LANGUAGE_HEADER, schoolI18n } from '@sms/contracts/locales';
import { isAdmin, isAuth } from '../auth';
import { db } from '../database/db';
import { env } from '../env';
import { schoolMcpYearHooks } from '../modules/academicYears/requestYear';
import { authConfig } from './authConfig';
import { chatbotConfig, chatRequestConfig, studioAssistantConfig } from './chatbotConfig';
import { emailConfig } from './emailConfig';
import { privateStorage } from './PrivateStorageGuard';
import { ragConfig, ragStudioConfig } from './ragConfig';
import { SchoolStorageValidator } from './SchoolStorageValidator';
import { themeConfig } from './themeConfig';
import { createValidationErrorFormatter } from './validationMessages';
import { yearScopedModules } from './yearScope';

/**
 * School's choices for najm-api's server preset. Najm registers the plugins in
 * dependency order and holds the shared policy: Redis required in production
 * and memory during `next build`, one trusted proxy in production and rate
 * limiting skipped under `next dev`, guards before auth. Variables come from
 * `env`; nothing here reads the environment itself.
 */
export const schoolServerOptions = () => ({
  base: '/api',
  // `next build` evaluates server modules and must not contact production services.
  buildPhase: isNextBuildPhase(),
  cors: { origin: [env.app.corsOrigin, 'http://localhost:4100', 'app://-'], credentials: true },
  database: { default: db },
  // ioredis is imported here, not left to najm-cache's dynamic require, so the
  // Next server bundle includes it.
  cache: { url: env.cache.redisUrl, Redis, keyPrefix: 'school:' },
  // The dashboard names its interface language in LANGUAGE_HEADER, read first:
  // header, then cookie, then `?lang=`, with no cookie written back.
  // najm-i18n's default order read its own `language` cookie first and cached
  // the first language it guessed, so a French page got English refusals.
  i18n: { ...schoolI18n.options, server: { languageHeader: LANGUAGE_HEADER } },
  // A refused request answers in the request's language; see validationMessages.ts.
  validation: { errorFormatter: createValidationErrorFormatter() },
  rateLimit: { trustedProxyHops: env.app.trustedProxyHops },
  // School's wrapper adds the account email presentation services.
  email: () => emailConfig(),
  // A route that declares no guard asks for sign-in instead of being public. A
  // safety net, not a policy: give each route the guard its data needs, and
  // mark a deliberately public one `@Public()`. (The preset's default with
  // auth, stated because every School route relies on it.)
  guards: { default: [isAuth()] },
  auth: () => authConfig(),
  // Every year-scoped tool group takes the selected academic year; see yearScope.ts.
  mcp: {
    name: 'sms-mcp',
    version: '1.0.0',
    auth: { type: 'najm-auth' },
    cors: false,
    ...schoolMcpYearHooks(Object.keys(yearScopedModules)),
  },
  storage: {
    provider: 'local',
    basePath: env.app.storagePath,
    servePrefix: '/api',
    maxFileSize: 10 * 1024 * 1024,
    // Union for the shared provider; SchoolStorageValidator restricts each
    // write to its namespace's categories before StorageService saves it.
    allowedCategories: [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT, FileCategory.SPREADSHEET, FileCategory.TEXT],
    validator: SchoolStorageValidator,
    enableCascadeDelete: true,
    // School uploads files through REST and its own services, so MCP file tools
    // stay disabled. Signed-in users may serve files; only admins may manage them.
    mcp: false,
    guards: [isAuth(), privateStorage()],
    manageGuards: [isAdmin()],
  },
}) satisfies NajmServerOptions;

/** School's server before its modules load: the preset, then School's own plugins. */
export const schoolServer = () =>
  createNajmServer({
    ...schoolServerOptions(),
    plugins: [
      themeConfig(),
      ragConfig(),
      chatbotConfig(),
      chatRequestConfig(),
      studioAssistantConfig(),
      ragStudioConfig(),
    ],
  });
