
import { Server } from '@sms/server/najm';
import * as seedModules from '@sms/server/modules/seed';
import { auth, isAuth } from '@sms/server/auth';
import { db } from '@sms/server/database';
import translations from '@sms/contracts/locales';
import { cors } from 'najm-cors';
import { database } from 'najm-database';
import { email } from 'najm-email';
import { events } from 'najm-event';
import { i18n } from 'najm-i18n';
import { mcp } from 'najm-mcp';
import { rateLimit } from 'najm-rate';
import { FileCategory, storage } from 'najm-storage';
import { validation } from 'najm-validation';

// Seed scripts never send real emails — always use console provider
const seedEmailConfig = () => email({ provider: { provider: 'console' } });
const seedDatabaseConfig = () => database({ default: db });
const seedI18nConfig = () =>
  i18n({
    translations,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'fr', 'ar', 'es'],
  });
const seedValidationConfig = () => validation();
const seedRateLimitConfig = () => rateLimit();
const seedEventsConfig = () => events();
const seedCorsConfig = () =>
  cors({
    origin: process.env.CORS_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true,
  });
const seedAuthConfig = () =>
  auth({
    dialect: 'pg',
    encryptionKey: process.env.NAJM_ENCRYPTION_KEY,
  });
const seedMcpConfig = () =>
  mcp({
    name: 'sms-seed-mcp',
    version: '1.0.0',
    path: '/mcp',
    cors: true,
  });
const seedStorageConfig = () =>
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

type SeedClass = new (...args: any[]) => { onInit(): Promise<void> };
type SeedTask = (server: Server) => Promise<void>;

function seedHeartbeat(label: string) {
  const startedAt = performance.now();
  const interval = setInterval(() => {
    const elapsedSeconds = Math.floor((performance.now() - startedAt) / 1000);
    console.log(`  ${label}: still running (${elapsedSeconds}s elapsed)`);
  }, 30_000);
  return () => clearInterval(interval);
}

function createSeedServer(modulesToLoad: Record<string, unknown>) {
  return new Server()
    .use(seedCorsConfig())
    .use(seedDatabaseConfig())
    .use(seedI18nConfig())
    .use(seedValidationConfig())
    .use(seedRateLimitConfig())
    .use(seedEventsConfig())
    .use(seedEmailConfig())
    .use(seedAuthConfig())
    .use(seedMcpConfig())
    .use(seedStorageConfig())
    .load(modulesToLoad);
}

export async function runSeed(label: string, SeedCls: SeedClass) {
  console.log(`🚀 Starting ${label}...\n`);

  process.env.SEED_MODE = 'true';

  let exitCode = 0;
  const stopHeartbeat = seedHeartbeat(label);

  try {
    const appModules = await import('@sms/server/modules');
    await createSeedServer(appModules)
      .load(SeedCls)
      .init();
  } catch (error) {
    exitCode = 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Seed failed:', message);
  } finally {
    stopHeartbeat();
  }

  process.exit(exitCode);
}

export async function runSeedTask(label: string, task: SeedTask) {
  console.log(`🚀 Starting ${label}...\n`);

  process.env.SEED_MODE = 'true';

  let exitCode = 0;
  const stopHeartbeat = seedHeartbeat(label);

  try {
    const server = createSeedServer(seedModules);
    await server.init();
    seedModules.configureSeedContainer(server.container);
    await task(server);
  } catch (error) {
    exitCode = 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Seed failed:', message);
  } finally {
    stopHeartbeat();
  }

  process.exit(exitCode);
}
