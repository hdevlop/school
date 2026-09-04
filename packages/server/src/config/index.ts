import { cors } from 'najm-cors';
import { i18n } from 'najm-i18n';
import { events } from 'najm-event';
import { validation } from 'najm-validation';
import { rateLimit } from 'najm-rate';
import { cache, type CachePluginConfig } from 'najm-cache';
import { database } from 'najm-database';
import { storage } from 'najm-storage';
import { FileCategory } from 'najm-storage';
import { mcp } from 'najm-mcp';
import { email, type EmailPluginConfig, type ProviderConfig } from 'najm-email';
import { chatbot } from 'najm-chatbot';
import { studioAssistant } from 'najm-chatbot/studio-assistant';
import { rag, ragStudio } from 'najm-rag';
import type { NajmPlugin } from 'najm-core';
export { themeConfig } from './themeConfig';

import translations from '@server/locales';
import { db } from '@server/database/db';
import { auth, isAuth } from '@server/auth';

const defaultChatbotSystemPrompt = `You are a helpful AI assistant for a School Management System dashboard.
You have access to tools to manage students, classes, sections, subjects, teachers, parents, fees, fee types, payments, allocations, attendance, grades, assessments, exams, and more.
Today's date is ${new Date().toISOString().slice(0, 10)}.

# CRITICAL RULE: NEVER INVENT IDS
IDs are random short strings (nanoid). You cannot guess them. Before calling any *_create or *_update tool that references another entity, you MUST first call the matching *_list or *_get_* tool and pick a real ID from the response. Never reuse an ID from earlier in the conversation without re-verifying it still exists. If the user gives a name instead of an ID, resolve the name to an ID via a list tool first.

# REQUIRED LOOKUPS BEFORE EACH CREATE
- students_create: classes_get_classes to pick classId, then classes_get_class_sections with that classId to pick sectionId. If linking parents, call parents_get_parents first.
- teachers_create: classes_get_classes for classId, classes_get_class_sections for sectionIds, and subjects_get_subjects for subjectIds.
- parents_create: parents do not require other entities to exist. To link a student after creation, call students_get_students first, then the parent-link tool with the real studentId.
- sections_create: classes_get_classes for classId.
- attendance, grades, assessments, and exams: resolve studentId, classId, sectionId, subjectId, and teacherId via matching list tools first.
- allocations_create and payments_create: students_get_students plus fee_types_get_fee_types or fees_get_fees first.
- fees_create: fee_types_get_fee_types first.

# GENERAL RULES
- If a list tool returns an empty array, tell the user the prerequisite is missing instead of guessing.
- If a create tool returns a not-found error, do not retry with a different guess. Re-list that entity, show the user what is available, and ask which one to use.
- Summarize results in plain language. Show names, not raw IDs, unless the user asks for IDs.
- Ask the user for any required field you cannot resolve, such as emails, names, codes, amounts, or dates. Do not fabricate them.`;

const DEFAULT_EMAIL_FROM = 'noreply@sms.local';
const MAX_TRUSTED_PROXY_HOPS = 8;
const NEXT_PRODUCTION_BUILD_PHASE = 'phase-production-build';

function resolveRedisUrl(value: string | undefined, required: boolean) {
  if (!value) {
    if (required) throw new Error('Production rate limiting requires a Redis URL.');
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (
      !['redis:', 'rediss:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      (required && !parsed.password)
    ) {
      throw new Error('invalid Redis URL');
    }
  } catch {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }

  return value;
}

export function resolveCacheConfig(): CachePluginConfig {
  // Next evaluates server modules while producing an image. That build phase
  // is not an application runtime and must not contact production services.
  if (process.env.NEXT_PHASE === NEXT_PRODUCTION_BUILD_PHASE) {
    return { driver: 'memory', required: false };
  }

  const required = process.env.NODE_ENV === 'production';
  const url = resolveRedisUrl(process.env.REDIS_URL, required);
  return {
    driver: required || url ? 'redis' : 'memory',
    required,
    ...(url ? { redis: { keyPrefix: 'school:', url } } : {}),
  };
}

export function resolveTrustedProxyHops() {
  const value = process.env.SCHOOL_TRUSTED_PROXY_HOPS;
  if (value === undefined || value === '') return process.env.NODE_ENV === 'production' ? 1 : 0;
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `SCHOOL_TRUSTED_PROXY_HOPS must be an integer from 0 to ${MAX_TRUSTED_PROXY_HOPS}.`,
    );
  }

  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops > MAX_TRUSTED_PROXY_HOPS) {
    throw new Error(
      `SCHOOL_TRUSTED_PROXY_HOPS must be an integer from 0 to ${MAX_TRUSTED_PROXY_HOPS}.`,
    );
  }
  return hops;
}

function requiredEmailEnv(name: string, rawValue: string | undefined) {
  const value = rawValue?.trim();
  if (!value) throw new Error(`${name} is required for the configured email provider.`);
  return value;
}

function emailFlagEnabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

function resolveEmailProvider(): ProviderConfig {
  // School falls back to the console transport when EMAIL_PROVIDER is unset,
  // so local development keeps working without any mail credentials.
  const provider = (process.env.EMAIL_PROVIDER?.trim() || 'console').toLowerCase();
  switch (provider) {
    case 'console':
      return {
        provider: 'console',
        logLevel: process.env.EMAIL_LOG_LEVEL === 'debug' ? 'debug' : 'info',
      };
    case 'memory':
      return { provider: 'memory' };
    case 'resend':
      return {
        provider: 'resend',
        apiKey: requiredEmailEnv('RESEND_API_KEY', process.env.RESEND_API_KEY),
      };
    case 'sendgrid':
      return {
        provider: 'sendgrid',
        apiKey: requiredEmailEnv('SENDGRID_API_KEY', process.env.SENDGRID_API_KEY),
        sandboxMode: emailFlagEnabled(process.env.SENDGRID_SANDBOX_MODE),
      };
    case 'smtp': {
      const user = process.env.SMTP_USER?.trim();
      const pass = process.env.SMTP_PASS?.trim();
      const port = Number(process.env.SMTP_PORT ?? 587);
      if (Boolean(user) !== Boolean(pass)) {
        throw new Error('SMTP_USER and SMTP_PASS must be configured together.');
      }
      if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
        throw new Error('SMTP_PORT must be a whole number between 1 and 65535.');
      }
      return {
        provider: 'smtp',
        host: requiredEmailEnv('SMTP_HOST', process.env.SMTP_HOST),
        port,
        secure: emailFlagEnabled(process.env.SMTP_SECURE),
        auth: user && pass ? { user, pass } : undefined,
      };
    }
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER '${provider}'.`);
  }
}

/**
 * Resolve the provider in application code so Next's production bundler does
 * not have to preserve dynamic environment reads inside najm-email.
 */
export function resolveEmailConfig(): EmailPluginConfig {
  const attempts = Number(process.env.EMAIL_RETRY_ATTEMPTS ?? 1);
  const delay = Number(process.env.EMAIL_RETRY_DELAY ?? 1_000);
  return {
    provider: resolveEmailProvider(),
    defaultFrom: process.env.EMAIL_DEFAULT_FROM?.trim() || DEFAULT_EMAIL_FROM,
    defaultReplyTo: process.env.EMAIL_DEFAULT_REPLY_TO,
    debug: emailFlagEnabled(process.env.EMAIL_DEBUG),
    retry: {
      attempts: Number.isSafeInteger(attempts) && attempts > 0 ? attempts : 1,
      delay: Number.isFinite(delay) && delay >= 0 ? delay : 1_000,
    },
  };
}

export const emailConfig = () => email(resolveEmailConfig());

export const databaseConfig = () =>
  database({
    default: db,
  });

export const authInfrastructureConfig = () => ({
  cache: resolveCacheConfig(),
  rateLimit: { trustedProxyHops: resolveTrustedProxyHops() },
});

export const cacheConfig = () => cache(resolveCacheConfig());

export const authConfig = () => {
  const infrastructure = authInfrastructureConfig();
  return auth({
    cache: infrastructure.cache,
    dialect: 'pg',
    encryptionKey: process.env.NAJM_ENCRYPTION_KEY,
    // najm-auth declares its own email plugin dependency. Forward the same
    // resolved transport config so builds and runtime startup do not rely on a
    // global EMAIL_PROVIDER merely to resolve that dependency.
    email: resolveEmailConfig(),
    rateLimit: infrastructure.rateLimit,
  });
};

export const validationConfig = () => validation();
export const rateLimitConfig = () =>
  rateLimit({ trustedProxyHops: resolveTrustedProxyHops() });
export const eventsConfig = () => events();

export const corsConfig = () =>
  cors({
    origin: [
      process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'http://localhost:4100',
      'app://-',
    ],
    credentials: true,
  });

export const i18nConfig = () =>
  i18n({
    translations,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr', 'ar', 'es'],
  });

export const mcpConfig = () =>
  mcp({
    name: 'sms-mcp',
    version: '1.0.0',
    path: '/mcp',
    auth: { type: 'najm-auth' },
    cors: false,
    exposeErrorDetails: false,
  });

export const ragConfig = (): NajmPlugin =>
  rag({
    dialect: 'pg',
    embedding: {
      provider: 'ollama',
      baseUrl: process.env.RAG_EMBEDDING_BASE_URL || 'http://127.0.0.1:11434',
      model: process.env.RAG_EMBEDDING_MODEL || 'embeddinggemma',
      dimensions: Number(process.env.RAG_EMBEDDING_DIMENSIONS || 768),
      timeoutMs: Number(process.env.RAG_EMBEDDING_TIMEOUT_MS || 60_000),
    },
    toolRouting: { enabled: true },
    knowledge: true,
    allowedLangs: ['en', 'fr', 'ar', 'es'],
  }) as unknown as NajmPlugin;

export const chatbotConfig = () =>
  chatbot({
    dialect: 'pg',
    defaultSystemPrompt: defaultChatbotSystemPrompt,
    maxSteps: 10,
    conversationStore: 'db',
  });

export const studioAssistantConfig = () => studioAssistant();

export const ragStudioConfig = () => ragStudio({ auth: 'standalone' });

export const storageConfig = () =>
  storage({
    provider: 'local',
    basePath: 'storage',
    servePrefix: '/api',
    maxFileSize: 10 * 1024 * 1024,
    allowedCategories: [FileCategory.IMAGE, FileCategory.PDF, FileCategory.DOCUMENT],
    enableCascadeDelete: true,
    mcp: true,
    guards: [isAuth()],
  });
