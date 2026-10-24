// Test-only HTTPS host for the actual Next production application.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import next from 'next';

const port = Number(process.env.OFFLINE_FIXTURE_PORT);
assert(Number.isInteger(port) && port > 0 && port < 65536);
assert(process.env.OFFLINE_FIXTURE_KEY && process.env.OFFLINE_FIXTURE_CERTIFICATE);
const app = next({ dev: false, dir: process.cwd(), hostname: '127.0.0.1', port });
await app.prepare();
const server = createServer({ key: await readFile(process.env.OFFLINE_FIXTURE_KEY),
  cert: await readFile(process.env.OFFLINE_FIXTURE_CERTIFICATE) }, app.getRequestHandler());
server.listen(port, '127.0.0.1', () => console.log('Production HTTPS fixture ready on loopback port ' + port));
