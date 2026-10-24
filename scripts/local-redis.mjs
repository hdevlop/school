// Probe the local Redis service. Windows Services owns Memurai's lifecycle.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import Redis from 'ioredis';

const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = join(root, 'apps/dashboard/.env.local');
const action = process.argv[2] ?? 'status';

function localUrl(value) {
  if (!value?.trim()) throw new Error('Set REDIS_URL in apps/dashboard/.env.local to match your configured local Redis service.');
  let url;
  try { url = new URL(value); } catch { throw new Error('REDIS_URL must be a valid Redis URL.'); }
  if (url.protocol !== 'redis:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Local Redis tooling only accepts an unencrypted loopback redis:// URL.');
  }
  if (!url.password || (url.username && decodeURIComponent(url.username) !== 'default')) {
    throw new Error('Local Redis requires a password and the default Redis user.');
  }
  return url;
}

async function configuredUrl() {
  const env = await readFile(envPath, 'utf8');
  const value = env.match(/^\s*REDIS_URL\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
  return localUrl(process.env.REDIS_URL?.trim() || value);
}

async function connect(url) {
  // Supplying a password to a password-free server can still return PONG.
  // Verify anonymous PING is refused before reporting authenticated readiness.
  const options = { lazyConnect: true, enableReadyCheck: false, connectTimeout: 1000, maxRetriesPerRequest: 0, retryStrategy: () => null };
  const anonymousUrl = new URL(url); anonymousUrl.username = ''; anonymousUrl.password = '';
  const anonymous = new Redis(anonymousUrl.href, options);
  anonymous.on('error', () => undefined);
  let requiresPassword = false;
  try { await anonymous.connect(); await anonymous.ping(); }
  catch (error) { requiresPassword = /^NOAUTH\b/.test(error.message); }
  finally { anonymous.disconnect(); }
  if (!requiresPassword) throw new Error('Local Redis is unavailable or does not require authentication.');
  const client = new Redis(url.href, options);
  client.on('error', () => undefined);
  try { await client.connect(); await client.ping(); return client; }
  catch { client.disconnect(); throw new Error('Local Redis authentication failed. Check REDIS_URL matches the Memurai service password.'); }
}

async function main() {
  if (action !== 'status') throw new Error('Use bun run redis:check. Windows Services manages Memurai startup and shutdown.');
  const url = await configuredUrl();
  const client = await connect(url);
  try { console.log('Local Redis: authenticated PONG.'); await client.quit(); }
  finally { client.disconnect(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
