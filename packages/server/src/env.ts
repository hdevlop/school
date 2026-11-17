import { envChoice, envInt, envString, isProduction } from 'najm-core/env';
import { MAX_TRUSTED_PROXY_HOPS } from 'najm-rate';

/**
 * Every environment variable School's server reads, and the only module that
 * reads `process.env` (ESLint enforces it; `src/scripts` are standalone CLIs).
 *
 * Each variable is read literally once in SOURCE, so it stays a greppable read
 * Next's bundler can see; `tests/security/ServerEnv.test.ts` checks every
 * entry reads its own name. Everything else asks `env` by group: the getter
 * documents the variable, parses it and applies its default. Values are read
 * on every access, never cached, so a test that sets `process.env` is seen.
 *
 * Unset and blank mean "use the default". A malformed value throws with the
 * variable's name; `assertServerEnv()` reads them all when the server is
 * built, so startup lists every problem at once.
 *
 * Variables Najm reads itself (NODE_ENV, NEXT_PHASE, OPENROUTER_API_KEY, ...)
 * are not here. All are set in `apps/dashboard/.env.local`. The dashboard's
 * server components and route handlers read the same `env` through
 * `@sms/server/env`; browser code reads only NODE_ENV and NEXT_PUBLIC_*.
 */

const SOURCE = {
  DB_URL: () => process.env.DB_URL,
  DATABASE_URL: () => process.env.DATABASE_URL,

  FRONTEND_URL: () => process.env.FRONTEND_URL,
  CORS_ORIGIN: () => process.env.CORS_ORIGIN,
  SCHOOL_TRUSTED_PROXY_HOPS: () => process.env.SCHOOL_TRUSTED_PROXY_HOPS,
  SCHOOL_STORAGE_PATH: () => process.env.SCHOOL_STORAGE_PATH,
  APP_BUSINESS_DATE: () => process.env.APP_BUSINESS_DATE,
  REDIS_URL: () => process.env.REDIS_URL,

  NAJM_ENCRYPTION_KEY: () => process.env.NAJM_ENCRYPTION_KEY,
  GOOGLE_CLIENT_ID: () => process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: () => process.env.GOOGLE_CLIENT_SECRET,

  EMAIL_PROVIDER: () => process.env.EMAIL_PROVIDER,
  EMAIL_LOG_LEVEL: () => process.env.EMAIL_LOG_LEVEL,
  RESEND_API_KEY: () => process.env.RESEND_API_KEY,
  SENDGRID_API_KEY: () => process.env.SENDGRID_API_KEY,
  SENDGRID_SANDBOX_MODE: () => process.env.SENDGRID_SANDBOX_MODE,
  SMTP_HOST: () => process.env.SMTP_HOST,
  SMTP_PORT: () => process.env.SMTP_PORT,
  SMTP_USER: () => process.env.SMTP_USER,
  SMTP_PASS: () => process.env.SMTP_PASS,
  SMTP_SECURE: () => process.env.SMTP_SECURE,
  EMAIL_DEFAULT_FROM: () => process.env.EMAIL_DEFAULT_FROM,
  EMAIL_DEFAULT_REPLY_TO: () => process.env.EMAIL_DEFAULT_REPLY_TO,
  EMAIL_DEBUG: () => process.env.EMAIL_DEBUG,
  EMAIL_RETRY_ATTEMPTS: () => process.env.EMAIL_RETRY_ATTEMPTS,
  EMAIL_RETRY_DELAY: () => process.env.EMAIL_RETRY_DELAY,

  RAG_EMBEDDING_PROVIDER: () => process.env.RAG_EMBEDDING_PROVIDER,
  RAG_EMBEDDING_MODEL: () => process.env.RAG_EMBEDDING_MODEL,
  RAG_EMBEDDING_BASE_URL: () => process.env.RAG_EMBEDDING_BASE_URL,
  RAG_EMBEDDING_API_KEY: () => process.env.RAG_EMBEDDING_API_KEY,
  RAG_EMBEDDING_DIMENSIONS: () => process.env.RAG_EMBEDDING_DIMENSIONS,
  RAG_EMBEDDING_TRUNCATE_DIMENSIONS: () => process.env.RAG_EMBEDDING_TRUNCATE_DIMENSIONS,
  RAG_EMBEDDING_BATCH_SIZE: () => process.env.RAG_EMBEDDING_BATCH_SIZE,
  RAG_EMBEDDING_TIMEOUT_MS: () => process.env.RAG_EMBEDDING_TIMEOUT_MS,
  RAG_EMBEDDING_QUERY_TIMEOUT_MS: () => process.env.RAG_EMBEDDING_QUERY_TIMEOUT_MS,
  RAG_EMBEDDING_QUERY_COOLDOWN_MS: () => process.env.RAG_EMBEDDING_QUERY_COOLDOWN_MS,
  RAG_EMBEDDING_QUERY_PREFIX: () => process.env.RAG_EMBEDDING_QUERY_PREFIX,
  RAG_EMBEDDING_DOCUMENT_PREFIX: () => process.env.RAG_EMBEDDING_DOCUMENT_PREFIX,

  CHATBOT_FLOW: () => process.env.CHATBOT_FLOW,
  CHATBOT_JEV_MODE: () => process.env.CHATBOT_JEV_MODE,
  CHATBOT_JEV_THRESHOLD: () => process.env.CHATBOT_JEV_THRESHOLD,
  CHATBOT_JEV_OPERATING_TIMEOUT_MS: () => process.env.CHATBOT_JEV_OPERATING_TIMEOUT_MS,
  CHATBOT_JEV_RERANK: () => process.env.CHATBOT_JEV_RERANK,

  NOTIFICATIONS_DISPATCH_ENABLED: () => process.env.NOTIFICATIONS_DISPATCH_ENABLED,
  NOTIFICATIONS_PUSH_ENABLED: () => process.env.NOTIFICATIONS_PUSH_ENABLED,
  VAPID_PUBLIC_KEY: () => process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: () => process.env.VAPID_PRIVATE_KEY,
  VAPID_CONTACT_EMAIL: () => process.env.VAPID_CONTACT_EMAIL,
  FINANCIAL_CRON_SECRET: () => process.env.FINANCIAL_CRON_SECRET,

  SEED_MODE: () => process.env.SEED_MODE,
  SCHOOL_SEED_LANDING: () => process.env.SCHOOL_SEED_LANDING,
  DEFAULT_USER_PASSWORD: () => process.env.DEFAULT_USER_PASSWORD,

  ANDROID_APP_PACKAGE: () => process.env.ANDROID_APP_PACKAGE,
  ANDROID_APP_SHA256: () => process.env.ANDROID_APP_SHA256,
} as const satisfies Record<string, () => string | undefined>;

export type EnvName = keyof typeof SOURCE;
export const ENV_NAMES = Object.keys(SOURCE) as EnvName[];

/** The value exactly as set, '' included. */
export const rawEnv = (name: EnvName): string | undefined => SOURCE[name]();

const text = (name: EnvName) => envString(rawEnv(name));
const int = (name: EnvName, options: { fallback: number; min?: number; max?: number }) =>
  envInt(name, rawEnv(name), options);
const choice = <const T extends string>(name: EnvName, choices: readonly T[], fallback: T) =>
  envChoice(name, rawEnv(name), choices, fallback);

const ON = new Set(['1', 'true', 'on', 'yes']);
const OFF = new Set(['0', 'false', 'off', 'no']);

/** One spelling rule for every switch: on/off, true/false, 1/0 or yes/no, any case. */
function flag(name: EnvName, fallback = false): boolean {
  const value = text(name)?.toLowerCase();
  if (value === undefined) return fallback;
  if (ON.has(value)) return true;
  if (OFF.has(value)) return false;
  throw new Error(`${name} must be on or off (true/false, 1/0 and yes/no also work). Got '${value}'.`);
}

function fraction(name: EnvName, fallback: number): number {
  const value = text(name);
  if (value === undefined) return fallback;
  const parsed = /^\d+(?:\.\d+)?$/u.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) throw new Error(`${name} must be between 0 and 1`);
  return parsed;
}

export const EMBEDDING_PROVIDERS = ['ollama', 'openai-compatible'] as const;
export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number];

export const CHAT_FLOWS = ['legacy', 'jev-router-20b'] as const;

/** The variables najm-email's `emailConfigFromEnv` reads, passed through unparsed. */
const EMAIL_TRANSPORT = [
  'EMAIL_PROVIDER', 'EMAIL_LOG_LEVEL', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'SENDGRID_SANDBOX_MODE',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'EMAIL_DEFAULT_FROM',
  'EMAIL_DEFAULT_REPLY_TO', 'EMAIL_DEBUG', 'EMAIL_RETRY_ATTEMPTS', 'EMAIL_RETRY_DELAY',
] as const satisfies readonly EnvName[];

export const env = {
  database: {
    /** DB_URL, then DATABASE_URL, then a local PostgreSQL. */
    get url() { return text('DB_URL') ?? text('DATABASE_URL') ?? 'postgres://localhost:5432/postgres'; },
  },

  app: {
    /**
     * FRONTEND_URL: the installation's origin. Origin of the set-password link
     * in invitation and reset mails and of the page Google sign-in returns to
     * (najm-auth defaults to http://localhost:3000).
     */
    get frontendUrl() { return text('FRONTEND_URL'); },
    /** CORS_ORIGIN: the dashboard's origin; falls back to FRONTEND_URL, then http://localhost:3000. */
    get corsOrigin() { return text('CORS_ORIGIN') ?? text('FRONTEND_URL') ?? 'http://localhost:3000'; },
    /**
     * SCHOOL_TRUSTED_PROXY_HOPS, 0-8: proxies trusted for X-Forwarded-For when
     * rate limits key on the client address. Too few and every client shares
     * the proxy's address; too many and a client can forge its own. Default 1
     * in production, 0 elsewhere.
     */
    get trustedProxyHops() {
      return int('SCHOOL_TRUSTED_PROXY_HOPS', { fallback: isProduction() ? 1 : 0, max: MAX_TRUSTED_PROXY_HOPS });
    },
    /** SCHOOL_STORAGE_PATH: the uploads folder, relative to the working directory unless absolute. Default `storage`. */
    get storagePath() { return text('SCHOOL_STORAGE_PATH') ?? 'storage'; },
    /** APP_BUSINESS_DATE, YYYY-MM-DD: "today" for tests and demos; `shared/businessDate.ts` validates it. */
    get businessDate() { return text('APP_BUSINESS_DATE'); },
  },

  cache: {
    /** REDIS_URL: redis:// or rediss://. Required, with a password, in production; memory elsewhere when unset. */
    get redisUrl() { return text('REDIS_URL'); },
  },

  auth: {
    /** NAJM_ENCRYPTION_KEY: najm-auth's encryption key, as set. */
    get encryptionKey() { return rawEnv('NAJM_ENCRYPTION_KEY'); },
    /**
     * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET: Google sign-in, on when both
     * are set. Google returns to FRONTEND_URL/api/auth/oauth/google/callback,
     * which must be an authorized redirect URI.
     */
    get googleSignIn() { return !!text('GOOGLE_CLIENT_ID') && !!text('GOOGLE_CLIENT_SECRET'); },
  },

  email: {
    /**
     * Outgoing mail, validated by najm-email. Without EMAIL_PROVIDER, mail
     * goes to the console, so local development needs no credentials.
     *
     *   EMAIL_PROVIDER           console | memory | resend | sendgrid | smtp (default console)
     *   EMAIL_LOG_LEVEL          console: debug | info (default info)
     *   RESEND_API_KEY           resend
     *   SENDGRID_API_KEY         sendgrid
     *   SENDGRID_SANDBOX_MODE    sendgrid: 1 | true to accept mail without sending it
     *   SMTP_HOST, SMTP_PORT     smtp (port default 587)
     *   SMTP_USER, SMTP_PASS     smtp, both or neither
     *   SMTP_SECURE              smtp: 1 | true for implicit TLS
     *   EMAIL_DEFAULT_FROM       default noreply@sms.local
     *   EMAIL_DEFAULT_REPLY_TO
     *   EMAIL_DEBUG              1 | true
     *   EMAIL_RETRY_ATTEMPTS     default 1
     *   EMAIL_RETRY_DELAY        milliseconds, default 1000
     */
    get transport() {
      return Object.fromEntries(EMAIL_TRANSPORT.map(name => [name, rawEnv(name)])) as
        Record<(typeof EMAIL_TRANSPORT)[number], string | undefined>;
    },
    /** EMAIL_PROVIDER, lower-cased, default console. Never throws: najm-email owns validation. */
    get provider() { return text('EMAIL_PROVIDER')?.toLowerCase() ?? 'console'; },
  },

  rag: {
    embedding: {
      /** RAG_EMBEDDING_PROVIDER: ollama | openai-compatible (default ollama). */
      get provider(): EmbeddingProvider { return choice('RAG_EMBEDDING_PROVIDER', EMBEDDING_PROVIDERS, 'ollama'); },
      /** RAG_EMBEDDING_MODEL, default embeddinggemma. */
      get model() { return text('RAG_EMBEDDING_MODEL') ?? 'embeddinggemma'; },
      /** RAG_EMBEDDING_BASE_URL; unset uses the provider's local default (modules/chat/routing/embedding.ts). */
      get baseUrl() { return text('RAG_EMBEDDING_BASE_URL'); },
      /** RAG_EMBEDDING_API_KEY, as set. */
      get apiKey() { return rawEnv('RAG_EMBEDDING_API_KEY'); },
      /** RAG_EMBEDDING_DIMENSIONS, default 768. */
      get dimensions() { return int('RAG_EMBEDDING_DIMENSIONS', { fallback: 768, min: 1 }); },
      /** RAG_EMBEDDING_TRUNCATE_DIMENSIONS: on to cut longer vectors to the dimensions. */
      get truncateDimensions() { return flag('RAG_EMBEDDING_TRUNCATE_DIMENSIONS'); },
      /** RAG_EMBEDDING_BATCH_SIZE, default 4. */
      get batchSize() { return int('RAG_EMBEDDING_BATCH_SIZE', { fallback: 4, min: 1 }); },
      /** RAG_EMBEDDING_TIMEOUT_MS: one indexing batch (up to ~15 s on a CPU model). Default 60000. */
      get timeoutMs() { return int('RAG_EMBEDDING_TIMEOUT_MS', { fallback: 60_000, min: 1 }); },
      /** RAG_EMBEDDING_QUERY_TIMEOUT_MS: one chat question (0.1-2 s normally). Default 5000. */
      get queryTimeoutMs() { return int('RAG_EMBEDDING_QUERY_TIMEOUT_MS', { fallback: 5_000, min: 1 }); },
      /** RAG_EMBEDDING_QUERY_COOLDOWN_MS: after a timeout or refused connection, skip the provider this long. Default 30000. */
      get queryFailureCooldownMs() { return int('RAG_EMBEDDING_QUERY_COOLDOWN_MS', { fallback: 30_000 }); },
      /** RAG_EMBEDDING_QUERY_PREFIX, as set: '' is a deliberate "no prefix"; unset uses the model's preset. */
      get queryPrefix() { return rawEnv('RAG_EMBEDDING_QUERY_PREFIX'); },
      /** RAG_EMBEDDING_DOCUMENT_PREFIX, as set: '' is a deliberate "no prefix"; unset uses the model's preset. */
      get documentPrefix() { return rawEnv('RAG_EMBEDDING_DOCUMENT_PREFIX'); },
    },
  },

  chat: {
    /** CHATBOT_FLOW: legacy | jev-router-20b, the release switch (default legacy). */
    get flow() { return choice('CHATBOT_FLOW', CHAT_FLOWS, 'legacy'); },
    /** CHATBOT_JEV_MODE: Jev's four direct replies, on under the jev-router-20b flow only. Default off. */
    get jevMode(): 'off' | 'on' { return flag('CHATBOT_JEV_MODE') ? 'on' : 'off'; },
    /** CHATBOT_JEV_THRESHOLD, 0-1, default 0.8. */
    get jevThreshold() { return fraction('CHATBOT_JEV_THRESHOLD', 0.8); },
    /** CHATBOT_JEV_OPERATING_TIMEOUT_MS, 1-10000, default 3000. */
    get jevOperatingTimeoutMs() { return int('CHATBOT_JEV_OPERATING_TIMEOUT_MS', { fallback: 3000, min: 1, max: 10_000 }); },
    /** CHATBOT_JEV_RERANK: Jev as a second judge after tool routing, independent of the flow and mode. Read at boot. Default off. */
    get jevRerank() { return flag('CHATBOT_JEV_RERANK'); },
  },

  notifications: {
    /** NOTIFICATIONS_DISPATCH_ENABLED, default off. */
    get dispatchEnabled() { return flag('NOTIFICATIONS_DISPATCH_ENABLED'); },
    /** NOTIFICATIONS_PUSH_ENABLED, default off. */
    get pushEnabled() { return flag('NOTIFICATIONS_PUSH_ENABLED'); },
    /** VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL: web push; checked in notificationConfig.ts. */
    get vapidPublicKey() { return text('VAPID_PUBLIC_KEY'); },
    get vapidPrivateKey() { return text('VAPID_PRIVATE_KEY'); },
    get vapidContact() { return text('VAPID_CONTACT_EMAIL'); },
    /** FINANCIAL_CRON_SECRET, as set: the financial reminder cron's shared secret. Unset refuses every call. */
    get financialCronSecret() { return rawEnv('FINANCIAL_CRON_SECRET') || undefined; },
  },

  seed: {
    /** SEED_MODE: on while a seed script runs (the seed runner sets it). */
    get running() { return flag('SEED_MODE'); },
    /** SCHOOL_SEED_LANDING, as set: false keeps a blank landing draft; `LandingDefaults.ts` validates it. */
    get landing() { return rawEnv('SCHOOL_SEED_LANDING'); },
    /** DEFAULT_USER_PASSWORD: the password of accounts created without one. */
    get defaultUserPassword() { return text('DEFAULT_USER_PASSWORD'); },
  },

  android: {
    /** ANDROID_APP_PACKAGE, as set: the Android app's package; `lib/androidAssetLinks.ts` validates it. */
    get packageName() { return rawEnv('ANDROID_APP_PACKAGE'); },
    /** ANDROID_APP_SHA256, as set: comma-separated signing certificate fingerprints. */
    get sha256() { return rawEnv('ANDROID_APP_SHA256'); },
  },
};

/** Reads every value in `env` and returns each problem found, by variable name. */
export function checkServerEnv(): string[] {
  const problems = new Set<string>();
  const visit = (group: object) => {
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(group))) {
      if (!descriptor.get) {
        if (descriptor.value && typeof descriptor.value === 'object') visit(descriptor.value);
        continue;
      }
      try { descriptor.get.call(group); } catch (error) {
        problems.add(error instanceof Error ? error.message : String(error));
      }
    }
  };
  visit(env);
  return [...problems];
}

/** Stops startup on any malformed value, listing them all. */
export function assertServerEnv() {
  const problems = checkServerEnv();
  if (problems.length) throw new Error(`Invalid server environment:\n  - ${problems.join('\n  - ')}`);
}
