import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, open } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { createFixtureCertificate, probeFixture } from './offline-fixture-tls.mjs';

export const appRoot = fileURLToPath(new URL('..', import.meta.url));
export const root = resolve(appRoot, '../..');

// The loopback fixture uses the normal trusted-proxy policy. Give each runner its own
// client bucket so it neither consumes the owner's bucket nor weakens the limiter.
export function fixtureClientHeaders() {
  return { 'X-Forwarded-For': '10.' + [...crypto.getRandomValues(new Uint8Array(3))].join('.') };
}

/** These temporary admissions belong to this runner, including their test-created history. */
export async function removeFixtureStudents(sql, ids) {
  assert(ids.every(id => /^offline-lifecycle-(student|delete)-[a-f0-9-]{36}$/.test(id)));
  await sql.begin(async tx => {
    await tx`delete from student_enrollment_placements where enrollment_id in (select id from student_enrollments where student_id in ${tx(ids)})`;
    await tx`delete from student_enrollments where student_id in ${tx(ids)}`;
    await tx`delete from students where id in ${tx(ids)}`;
  });
}

/** Starts only an isolated production server against the explicitly marked local fixture. */
export async function startOfflineReadFixture(label, { secure = false } = {}) {
  process.loadEnvFile(resolve(appRoot, '.env.local'));
  const target = new URL(process.env.SCHOOL_HISTORY_TEST_DB_URL ?? 'http://invalid');
  assert(['localhost', '127.0.0.1'].includes(target.hostname) && target.pathname === '/school_history_test');
  assert(process.env.SCHOOL_HISTORY_ADMIN_PASSWORD, 'Existing fixture admin password is required');
  const sql = postgres(target.href, { max: 1 });
  let server;
  let log;
  try {
    const [marker] = await sql`select id from school_history_fixture_marker`;
    assert.equal(marker.id, 'academic-history-alerts-v1');
    const [schema] = await sql`select to_regclass('offline_read_snapshots')::text as name`;
    assert(schema.name, 'Run test:offline:transport to install migration 0077 in this fixture');
    const socket = createServer();
    await new Promise(done => socket.listen(0, '127.0.0.1', done));
    const port = socket.address().port;
    await new Promise(done => socket.close(done));
    const origin = `${secure ? 'https' : 'http'}://127.0.0.1:${port}/`;
    await mkdir(resolve(root, '.cache'), { recursive: true });
    const tls = secure ? await createFixtureCertificate(resolve(root, '.cache')) : null;
    log = await open(resolve(root, `.cache/offline-${label}-next.log`), 'w');
    const args = secure ? [resolve(appRoot, 'scripts/offline-https-server.mjs')]
      : [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)];
    server = spawn(process.execPath, args, {
      cwd: appRoot, env: { ...process.env, NODE_ENV: 'production', DB_URL: target.href,
        NAJM_NEXT_DIST_DIR: process.env.NAJM_NEXT_DIST_DIR || '.next', FRONTEND_URL: origin.slice(0, -1),
        ...(tls ? { OFFLINE_FIXTURE_PORT: String(port), OFFLINE_FIXTURE_KEY: tls.key,
          OFFLINE_FIXTURE_CERTIFICATE: tls.certificate, NODE_EXTRA_CA_CERTS: tls.certificate } : {}),
        NAJM_AUTH_INTERNAL_URL: origin + 'api/auth/session/recover' },
      stdio: ['ignore', log.fd, log.fd], windowsHide: true,
    });
    const probe = () => probeFixture(origin, tls?.ca);
    for (let attempt = 0; attempt < 120; attempt++) {
      try { if (await probe() === 200) break; } catch {}
      if (attempt === 119 || server.exitCode !== null) throw new Error('Production fixture did not start');
      await new Promise(done => setTimeout(done, 250));
    }
    const stop = async () => {
      if (server.exitCode !== null || server.signalCode !== null) return;
      const stopped = once(server, 'exit'); server.kill(); await stopped;
    };
    return { origin, sql, stop, probe, browserOptions: secure ? { ignoreHTTPSErrors: true } : {}, async close() {
      await stop();
      await log.close(); await sql.end();
    } };
  } catch (error) {
    if (server?.exitCode === null) server.kill();
    await log?.close(); await sql.end(); throw error;
  }
}

/** Serializable diagnostic. Never creates a database, store, grant or coverage. */
export async function inspectReadReplica() {
  const identity = JSON.parse(localStorage.getItem('school.offline-account.v1') ?? 'null');
  if (!identity?.accountId) return null;
  const name = `school-read-v1:${identity.installationId}:${identity.accountId}`;
  if (!(await indexedDB.databases()).some(db => db.name === name)) return null;
  return new Promise(resolve => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('metadata')) { db.close(); resolve(null); return; }
      const tx = db.transaction(['metadata', 'records']);
      const metadata = tx.objectStore('metadata');
      const access = metadata.get('access');
      const presentation = metadata.get('presentation');
      const records = tx.objectStore('records').getAll();
      const all = metadata.getAll();
      tx.oncomplete = () => { db.close(); resolve({ identity, access: access.result, presentation: presentation.result, records: records.result,
        runtimes: all.result.filter(value => value?.ready === true) }); };
      tx.onerror = () => { db.close(); resolve(null); };
    };
  });
}
