import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';

/** Isolated fixture certificate only: no trust-store or application policy changes. */
export async function createFixtureCertificate(cacheRoot) {
  const directory = await mkdtemp(resolve(cacheRoot, 'offline-tls-'));
  const key = resolve(directory, 'key.pem');
  const certificate = resolve(directory, 'certificate.pem');
  const config = resolve(directory, 'openssl.cnf');
  await writeFile(config, '[req]\ndistinguished_name=dn\n[dn]\n');
  const gitOpenSSL = 'C:/Program Files/Git/usr/bin/openssl.exe';
  const executable = process.env.OFFLINE_TEST_OPENSSL
    || (process.platform === 'win32' && existsSync(gitOpenSSL) ? gitOpenSSL : 'openssl');
  const result = spawnSync(executable, ['req', '-config', config, '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', certificate, '-days', '2', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost'], { windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, 'OpenSSL is required for the HTTPS fixture; set OFFLINE_TEST_OPENSSL to its executable. ' + (result.error?.message ?? result.stderr?.slice(-300) ?? ''));
  return { key, certificate, ca: await readFile(certificate) };
}

/** Verify this fixture's certificate explicitly; never disable Node TLS verification. */
export function probeFixture(origin, ca) {
  const url = new URL('api/health/status', origin);
  assert(['localhost', '127.0.0.1'].includes(url.hostname));
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsGet : httpGet)(url, { ...(ca ? { ca } : {}), timeout: 1000 }, response => {
      response.resume(); resolve(response.statusCode);
    });
    request.on('timeout', () => request.destroy(new Error('Fixture health timeout')));
    request.on('error', reject);
  });
}
