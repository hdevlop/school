import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Build an isolated Next app with School's actual server and Najm preset.
// Its loopback-only probe sends to the memory provider; no School route or
// external email transport is added. Generated files stay in ignored caches.
const root = fileURLToPath(new URL("../", import.meta.url));
const dashboard = join(root, "apps/dashboard");
const require = createRequire(join(dashboard, "package.json"));
const nextCli = join(dirname(require.resolve("next/package.json")), "dist/bin/next");
const serverRequire = createRequire(join(root, "packages/server/package.json"));
const postgresModule = serverRequire("postgres");
const postgres = postgresModule.default ?? postgresModule;

const fixtureUrl = process.env.SCHOOL_HISTORY_TEST_DB_URL;
assert(fixtureUrl, "Set SCHOOL_HISTORY_TEST_DB_URL for the existing history fixture");
const target = new URL(fixtureUrl);
assert(["postgres:", "postgresql:"].includes(target.protocol));
assert(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname));
assert.equal(target.pathname, "/school_history_test");
const redisUrl = new URL(process.env.REDIS_URL ?? "");
assert(["localhost", "127.0.0.1", "[::1]"].includes(redisUrl.hostname), "Use local Redis for this check");

const database = postgres(fixtureUrl, { max: 1, prepare: false, onnotice: () => {} });
try {
  const markers = await database`select id from school_history_fixture_marker`;
  assert.deepEqual(markers.map(({ id }) => id), ["academic-history-alerts-v1"]);
} finally {
  await database.end();
}

const output = join(root, ".cache/najm-config-verification");
const fixtures = join(dashboard, ".cache/config-production");
await Promise.all([mkdir(output, { recursive: true }), mkdir(fixtures, { recursive: true })]);
const fixture = await mkdtemp(join(fixtures, "run-"));
const route = join(fixture, "app/api/probe");
await mkdir(route, { recursive: true });
await Promise.all([
  writeFile(join(fixture, "package.json"), JSON.stringify({ name: "school-config-production-check", private: true, type: "module" })),
  writeFile(join(fixture, "next.config.mjs"), 'export { default } from "najm-next/config";\n'),
  writeFile(join(fixture, "tsconfig.json"), JSON.stringify({
    extends: resolve(root, "tsconfig.json"),
    compilerOptions: { jsx: "react-jsx", incremental: false },
    include: ["app/**/*.ts", "app/**/*.jsx", "next-env.d.ts", ".next/types/**/*.ts"],
  })),
  writeFile(join(fixture, "app/layout.jsx"), 'export default function Layout({ children }) { return <html lang="en"><body>{children}</body></html>; }\n'),
  writeFile(join(fixture, "app/page.jsx"), "export default function Page() { return <main>Configuration verification</main>; }\n"),
  writeFile(join(route, "route.ts"), `
import { server } from '@sms/server';
import { CacheService } from 'najm-cache';
import { EMAIL_PROVIDER, EmailService, MemoryProvider } from 'najm-email';

export const dynamic = 'force-dynamic';

export async function POST() {
  await server.init();
  const emails = server.container.get(EmailService);
  const provider = server.container.get<MemoryProvider>(EMAIL_PROVIDER);
  if (emails.getProviderName() !== 'memory') {
    return Response.json({ error: 'Memory provider required' }, { status: 500 });
  }
  const result = await emails.send({
    to: 'config-probe@example.invalid', subject: 'Configuration probe', text: 'Memory only',
  });
  return Response.json({
    success: result.success, sender: provider.getLastEmail()?.message.from,
    provider: emails.getProviderName(), cache: server.container.get(CacheService).type,
  });
}
`),
]);

const baseEnv = { ...process.env, DB_URL: fixtureUrl, NODE_ENV: "production", EMAIL_PROVIDER: "memory", NAJM_NEXT_DIST_DIR: ".next" };
delete baseEnv.NEXT_PHASE;
const buildSender = "build-config-check@example.invalid";
console.log("Building the production Next configuration fixture...");
const build = Bun.spawn(["node", nextCli, "build", "--webpack"], {
  cwd: fixture, env: { ...baseEnv, EMAIL_DEFAULT_FROM: buildSender }, stdout: "pipe", stderr: "pipe",
});
const [buildOut, buildErr, buildCode] = await Promise.all([
  new Response(build.stdout).text(), new Response(build.stderr).text(), build.exited,
]);
await writeFile(join(output, "production-build.log"), buildOut + buildErr);
assert.equal(buildCode, 0, "Next build failed; see .cache/najm-config-verification/production-build.log");

async function freePort() {
  const socket = createServer();
  await new Promise((done, fail) => { socket.once("error", fail); socket.listen(0, "127.0.0.1", done); });
  const port = socket.address().port;
  await new Promise((done, fail) => socket.close((error) => error ? fail(error) : done()));
  return port;
}

const results = [];
for (const scenario of [
  { name: "configured", sender: "runtime-config-check@example.invalid", expected: "runtime-config-check@example.invalid" },
  { name: "blank", sender: " ", expected: "noreply@sms.local" },
  { name: "unset", sender: undefined, expected: "noreply@sms.local" },
]) {
  const env = { ...baseEnv };
  if (scenario.sender === undefined) delete env.EMAIL_DEFAULT_FROM;
  else env.EMAIL_DEFAULT_FROM = scenario.sender;
  const port = await freePort();
  const child = Bun.spawn(["node", nextCli, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: fixture, env, stdout: "pipe", stderr: "pipe",
  });
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();
  try {
    const deadline = Date.now() + 30_000;
    let ready = false;
    while (Date.now() < deadline && child.exitCode === null) {
      try {
        ready = (await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(2000) })).ok;
        if (ready) break;
      } catch { /* Next has not bound its port yet. */ }
      await Bun.sleep(200);
    }
    assert(ready, "Next did not start; inspect the production startup log");
    const response = await fetch(`http://127.0.0.1:${port}/api/probe`, {
      method: "POST", signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, "Configuration probe failed; inspect the production startup log");
    const actual = await response.json();
    assert.deepEqual(actual, { success: true, sender: scenario.expected, provider: "memory", cache: "redis" });
    assert.notEqual(actual.sender, buildSender);
    results.push({ scenario: scenario.name, ...actual });
    console.log(`${scenario.name}: production sender and Redis verified`);
  } finally {
    if (child.exitCode === null) child.kill();
    await Promise.race([child.exited, Bun.sleep(5000)]);
    if (child.exitCode === null) child.kill(9);
    await child.exited;
    await writeFile(join(output, `production-${scenario.name}.log`), await stdout + await stderr);
  }
}
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
await writeFile(join(output, "production-summary.json"), JSON.stringify({
  fixture, buildSender, emailVersion: manifest.dependencies["najm-email"], results,
}, null, 2) + "\n");
console.log("Production configuration checks passed; evidence: .cache/najm-config-verification");
