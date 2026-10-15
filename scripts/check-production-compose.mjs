import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Docker Compose's real parser; no daemon, pull, deployment, or database needed.
// A standalone Compose binary can be supplied on hosts without the Docker CLI.
const command = process.env.SCHOOL_COMPOSE_BINARY ? [process.env.SCHOOL_COMPOSE_BINARY] : ['docker', 'compose'];
const scratch = mkdtempSync(join(tmpdir(), 'school-compose-check-'));
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !/^(SCHOOL_|POSTGRES_|REDIS_|COMPOSE_)/.test(key)));
copyFileSync(fileURLToPath(new URL('../compose.production.yml', import.meta.url)), join(scratch, 'compose.yml'));

function configuration(name, overrides = {}, missing) {
  const variables = {
    SCHOOL_IMAGE: name === 'demo' ? 'ghcr.io/hdevlop/school:demo' : `ghcr.io/hdevlop/school@sha256:${'a'.repeat(64)}`,
    SCHOOL_STORAGE_HOST_PATH: `/srv/school/check-${name}`,
    SCHOOL_LOOPBACK_PORT: name === 'demo' ? '3400' : '3401',
    POSTGRES_PASSWORD: `fixture-${name}-database`,
    REDIS_PASSWORD: `fixture-${name}-redis`,
    FRONTEND_URL: `https://${name}.example.test`,
    ...overrides,
  };
  if (missing) delete variables[missing];
  writeFileSync(join(scratch, '.env'), Object.entries(variables).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
  const result = spawnSync(command[0], [...command.slice(1), '-p', `check-${name}`, '-f', join(scratch, 'compose.yml'), 'config', '--format', 'json'], {
    cwd: scratch, env: inherited, encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (missing) {
    assert.notEqual(result.status, 0, `Missing ${missing} must fail before deployment`);
    assert.match(result.stderr, new RegExp(missing));
    return;
  }
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

try {
  const demo = configuration('demo');
  const customer = configuration('customer');
  for (const [name, config] of [['demo', demo], ['customer', customer]]) {
    const { app, migrate, 'notifications-worker': worker, postgres, redis } = config.services;
    assert.equal(app.image, migrate.image);
    assert.equal(app.image, worker.image);
    for (const service of [app, worker, migrate]) {
      assert.equal(service.environment.SCHOOL_STORAGE_PATH, service.volumes[0].target);
      assert.equal(service.environment.SCHOOL_SEED_LANDING, 'true');
    }
    assert.equal(app.pull_policy, 'always');
    assert.equal(app.environment.FRONTEND_URL, `https://${name}.example.test`);
    assert.equal(migrate.environment.SCHOOL_SEED_LANDING, 'true');
    assert.equal(migrate.healthcheck.disable, true);
    assert.equal(app.depends_on.migrate.condition, 'service_completed_successfully');
    assert.equal(worker.depends_on.migrate.condition, 'service_completed_successfully');
    // Compose v2 omits false Boolean fields from its normalized JSON.
    assert.equal(app.volumes[0].bind.create_host_path ?? false, false);
    assert.equal(app.ports[0].host_ip, '127.0.0.1');
    assert.equal(app.environment.POSTGRES_PASSWORD, `fixture-${name}-database`);
    assert.equal(postgres.environment.POSTGRES_PASSWORD, `fixture-${name}-database`);
    assert.equal(redis.environment.REDIS_PASSWORD, `fixture-${name}-redis`);
    assert.match(redis.command.join(' '), /--maxmemory-policy noeviction/);
    assert.equal(postgres.ports, undefined);
    assert.equal(redis.ports, undefined);
    assert.equal(config.networks.backend.internal, true);
    assert.equal(config.networks.default.internal, true);
    for (const service of Object.values(config.services)) {
      assert.ok(Number(service.mem_limit) > 0);
      assert.ok(Number(service.cpus) > 0);
    }
  }
  assert.notEqual(demo.volumes.postgres_data.name, customer.volumes.postgres_data.name);
  assert.notEqual(demo.volumes.redis_data.name, customer.volumes.redis_data.name);
  assert.notEqual(demo.services.app.volumes[0].source, customer.services.app.volumes[0].source);
  assert.notEqual(demo.services.app.ports[0].published, customer.services.app.ports[0].published);
  assert.notEqual(demo.services.app.environment.POSTGRES_PASSWORD, customer.services.app.environment.POSTGRES_PASSWORD);
  const optedOut = configuration('customer', { SCHOOL_SEED_LANDING: 'false' });
  for (const name of ['app', 'migrate', 'notifications-worker']) {
    assert.equal(optedOut.services[name].environment.SCHOOL_SEED_LANDING, 'false');
  }
  for (const required of ['SCHOOL_IMAGE', 'SCHOOL_STORAGE_HOST_PATH', 'SCHOOL_LOOPBACK_PORT', 'POSTGRES_PASSWORD', 'REDIS_PASSWORD']) {
    configuration('customer', {}, required);
  }
  console.log('Compose verified: independent projects, matching release services, isolated storage/ports/secrets, required inputs, and internal databases.');
} finally {
  assert.equal(dirname(resolve(scratch)), resolve(tmpdir()));
  assert.ok(basename(scratch).startsWith('school-compose-check-'));
  rmSync(scratch, { recursive: true, force: true });
}
