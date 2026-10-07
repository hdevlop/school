import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createJevFixture } from './jevFixture';
import { setBenchmarkJevMode } from '../../src/modules/chat/JevControls';
import { jevSyntheticCases } from '../../src/modules/chat/jevSyntheticCases';

const vars = ['DB_URL', 'NODE_ENV', 'CHATBOT_BENCHMARK_CONTROLS', 'CHATBOT_JEV_MAX_REQUESTS', 'CHATBOT_JEV_MAX_COST_USD'];
const original = Object.fromEntries(vars.map(key => [key, process.env[key]]));
let fixture: Awaited<ReturnType<typeof createJevFixture>> | undefined;
beforeEach(() => {
  process.env.DB_URL = 'postgres://localhost/school_history_test';
  process.env.NODE_ENV = 'test'; process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
  process.env.CHATBOT_JEV_MAX_REQUESTS = '100'; process.env.CHATBOT_JEV_MAX_COST_USD = '0.01';
  setBenchmarkJevMode('on');
});
afterEach(async () => {
  await fixture?.server.stop(); fixture = undefined;
  for (const key of vars) if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
  setBenchmarkJevMode('off');
});
const messages = (query: string) => [{ role: 'user', parts: [{ type: 'text', text: query }] }];

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
