import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createJevFixture } from './jevFixture';
import { setBenchmarkJevMode } from '../../src/modules/chat/JevControls';
import { jevSyntheticCases } from '../../src/modules/chat/jevSyntheticCases';

const vars = ['DB_URL', 'NODE_ENV', 'CHATBOT_BENCHMARK_CONTROLS', 'CHATBOT_JEV_MAX_REQUESTS', 'CHATBOT_JEV_MAX_COST_USD',
  'CHATBOT_JEV_BILLING_MODE', 'CHATBOT_JEV_BILLING_TIMEOUT_MS', 'CHATBOT_JEV_EXPERIMENT'];
const original = Object.fromEntries(vars.map(key => [key, process.env[key]]));
let fixture: Awaited<ReturnType<typeof createJevFixture>> | undefined;
beforeEach(() => {
  process.env.DB_URL = 'postgres://localhost/school_history_test';
  process.env.NODE_ENV = 'test'; process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
  process.env.CHATBOT_JEV_MAX_REQUESTS = '100'; process.env.CHATBOT_JEV_MAX_COST_USD = '0.01';
  process.env.CHATBOT_JEV_BILLING_MODE = 'abort';
  delete process.env.CHATBOT_JEV_EXPERIMENT;
  setBenchmarkJevMode('on');
});
afterEach(async () => {
  await fixture?.server.stop(); fixture = undefined;
  for (const key of vars) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
  setBenchmarkJevMode('off');
});
const messages = (query: string) => [{ role: 'user', parts: [{ type: 'text', text: query }] }];

test('Darija upcoming-exam candidate uses real HTTP guards, MCP executor and the selected year without generation', async () => {
  process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
  fixture = await createJevFixture();
  for (const year of ['2025-2026', '2026-2027']) {
    const response = await fixture.call('/chat-benchmark/jev/session', {
      caseId: 'jev-operator-q78', experimentArm: '20b-coreweave-first',
    }, 'admin', year);
    expect(response.status).toBe(200);
    const grant = await response.json();
    const reply = await fixture.call('/chat', { sessionKey: grant.sessionKey, messages: messages(grant.query) }, 'admin', year);
    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain(`Exam ${year}`);
    expect(fixture.events.at(-1)?.reply?.label).toBe('jev:upcoming_exams');
    expect(fixture.events.at(-1)?.tools.map(tool => tool.name)).toEqual(['exams_get_upcoming_exams']);
  }
  expect(fixture.counts()).toEqual({ decisions: 2, generations: 0 });
  const denied = await fixture.call('/mcp', { jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'exams_get_upcoming_exams', arguments: { academicYear: '2026-2027' } } }, 'student');
  const body = await denied.text();
  expect(body).not.toContain('Exam 2026-2027');
});

test('real HTTP guards deny anonymous/family control requests and production controls', async () => {
  fixture = await createJevFixture();
  expect((await fixture.call('/chat-benchmark/jev/status', undefined, null)).status).toBe(401);
  for (const role of ['teacher', 'parent', 'student', 'accounting'])
    expect((await fixture.call('/chat-benchmark/jev/session', { caseId: 'fr-student' }, role)).status).toBe(403);
  process.env.NODE_ENV = 'production';
  expect((await fixture.call('/chat-benchmark/jev/status')).status).toBe(404);
  expect(fixture.counts().decisions).toBe(0);
});
test('HTTP grant/read preserves historical year and blocks replay/altered text', async () => {
  fixture = await createJevFixture();
  const minted = await fixture.call('/chat-benchmark/jev/session', { caseId: 'fr-student' }, 'admin', '2025-2026');
  expect(minted.status).toBe(200); const { sessionKey, query } = await minted.json();
  const reply = await fixture.call('/chat', { sessionKey, messages: messages(query) }, 'admin', '2025-2026');
  expect(reply.status).toBe(200); expect(await reply.text()).toContain('7 élèves');
  expect(fixture.counts().decisions).toBe(1);
  const replay = await fixture.call('/chat', { sessionKey, messages: messages(query) }, 'admin', '2025-2026');
  expect(await replay.text()).toContain('Fixture model fallback');
  expect(fixture.counts().decisions).toBe(1);
  const fresh = await (await fixture.call('/chat-benchmark/jev/session', { caseId: 'fr-student' })).json();
  const altered = await fixture.call('/chat', { sessionKey: fresh.sessionKey, messages: messages('Real private question') });
  expect(altered.status).toBe(200); await altered.text();
  expect(fixture.counts().decisions).toBe(1);
});

test('experiment grant is fixed, opt-in, marker-bound and one-use', async () => {
  fixture = await createJevFixture();
  const body = { caseId: 'fr-student', experimentArm: '20b-coreweave-first' };
  expect((await fixture.call('/chat-benchmark/jev/session', body)).status).toBe(404);
  process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
  fixture.setMarkedFixture(false);
  expect((await fixture.call('/chat-benchmark/jev/session', body)).status).toBe(404);
  fixture.setMarkedFixture(true);
  const response = await fixture.call('/chat-benchmark/jev/session', body);
  expect(response.status).toBe(200);
  const grant = await response.json(); expect(grant.experimentArm).toBe(body.experimentArm);
  const reply = await fixture.call('/chat', { sessionKey: grant.sessionKey, messages: messages(grant.query) });
  expect(await reply.text()).toContain('9 élèves');
  expect(fixture.counts()).toEqual({ decisions: 1, generations: 0 });
  const replay = await fixture.call('/chat', { sessionKey: grant.sessionKey, messages: messages(grant.query) });
  expect(await replay.text()).toContain('Fixture model fallback');
  expect(fixture.counts()).toEqual({ decisions: 1, generations: 1 });
});

test('fixture read setup is fixed, admin-only, off-only, marker-bound and idempotent', async () => {
  fixture = await createJevFixture();
  const path = '/chat-benchmark/jev/fixture-reads';
  const setup = (body: unknown = { action: 'prepare' }, role: string | null = 'admin', actorId = 'history-admin') =>
    fixture!.call(path, body, role, '2026-2027', crypto.randomUUID(), actorId);
  setBenchmarkJevMode('off');
  expect((await setup({}, null)).status).toBe(401);
  for (const role of ['principal', 'teacher', 'parent', 'student', 'accounting'])
    expect((await setup({}, role)).status).toBe(403);
  expect((await setup({ action: 'prepare', roleId: 'another-role', permissions: ['*:*'] })).status).toBe(400);
  expect((await setup({})).status).toBe(400);
  expect((await setup({ action: 'prepare' }, 'admin', 'another-admin')).status).toBe(404);
  process.env.NODE_ENV = 'production';
  expect((await setup()).status).toBe(404);
  process.env.NODE_ENV = 'test';
  process.env.DB_URL = 'postgres://localhost/school';
  expect((await setup()).status).toBe(404);
  process.env.DB_URL = 'postgres://localhost/school_history_test';
  fixture.setMarkedFixture(false);
  expect((await setup()).status).toBe(404);
  fixture.setMarkedFixture(true);
  setBenchmarkJevMode('on');
  expect((await setup()).status).toBe(404);
  expect(fixture.readGrants()).toHaveLength(0);
  setBenchmarkJevMode('off');
  const response = await setup();
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result).toMatchObject({ fixtureOnly: true, roleId: 'history-role-admin',
    added: ['read:students', 'read:teachers', 'read:classes', 'read:sections', 'read:attendance', 'read:exams', 'read:subjects', 'read:grades'], requiresFreshLogin: true, jevMode: 'off' });
  const again = await setup();
  expect(again.status).toBe(200);
  expect(await again.json()).toMatchObject({ added: [], requiresFreshLogin: false });
  expect(fixture.readGrants().map(item => item.name)).toEqual(result.requiredPermissions);
  expect(fixture.readGrants().every(item => item.action === 'read' && item.resource !== '*')).toBe(true);
  expect(fixture.counts()).toEqual({ decisions: 0, generations: 0 });
});
test('all 24 synthetic cases stream through off/on/shadow without classifier/tool escape', async () => {
  fixture = await createJevFixture();
  for (const item of jevSyntheticCases) for (const mode of ['off', 'on', 'shadow']) {
    expect((await fixture.call('/chat-benchmark/jev/mode', { mode })).status).toBe(200);
    const grant = await (await fixture.call('/chat-benchmark/jev/session', { caseId: item.id })).json();
    const before = fixture.counts().decisions;
    const reply = await fixture.call('/chat', { sessionKey: grant.sessionKey, messages: messages(grant.query) });
    expect(reply.status, `${item.id}:${mode}`).toBe(200);
    const body = await reply.text(); expect(body, `${item.id}:${mode}`).toContain('[DONE]');
    if (mode === 'off') expect(fixture.counts().decisions).toBe(before);
    if (mode === 'shadow') expect(fixture.events.at(-1)?.reply?.label?.startsWith('jev:') ?? false).toBe(false);
    const readNames = fixture.events.at(-1)?.tools.map(tool => tool.name) ?? [];
    expect(readNames.some(name => /create|delete|update|record|mark/u.test(name))).toBe(false);
  }
});
