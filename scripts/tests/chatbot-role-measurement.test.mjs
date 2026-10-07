import { describe, expect, it } from 'bun:test';
import { createEstimatedBudget, validateDeclaredPrices } from '../chatbot-budget.mjs';
import { measureRoleRequest, readRoleDiagnostics } from '../chatbot-role-measurement.mjs';
import { parseUiStream } from '../chatbot-roles.mjs';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const model = 'openai/gpt-oss-120b';
const prices = validateDeclaredPrices({ provider: 'openrouter', capturedAt: '2026-10-06T00:00:00Z',
  source: 'unit-test mock rates; not provider prices', models: { [model]: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 } } });
const metadata = { provider: 'openrouter', model, promptTokens: 100, completionTokens: 50, totalTokens: 150,
  pricingFound: true, totalCost: 99, secret: 'never-save' };
const record = () => ({ correlationId: 'turn-1', model, provider: 'openrouter', outcome: 'completed',
  tools: [],
  spans: { prepareMs: 5, prompt: 'never-save' }, embeddings: [{ correlationId: 'turn-1', operation: 'query',
    cache: 'miss', outcome: 'success', durationMs: 4, input: 'never-save', attempts: [{ outcome: 'success', durationMs: 4, key: 'never-save' }] }] });
const reply = () => ({ httpStatus: 200, text: 'OK', tools: [], errors: [], metadata, complete: true });
const measure = (budget, overrides = {}) => measureRoleRequest({ requestId: 'turn-1', sessionId: 'session', role: 'parent',
  model, prices, budget, send: async () => reply(), diagnostics: async () => ({ diagnostics: record() }), ...overrides });

describe('role request accounting', () => {
  it('reserves before dispatch, reprices usage and preserves raw SDK metadata separately', async () => {
    const budget = createEstimatedBudget(0.01, 0.005);
    const result = await measure(budget, { send: async () => {
      expect(budget.snapshot()).toMatchObject({ reservedUsd: 0.005, inFlight: 1 }); return reply();
    } });
    expect(result.sample.declaredCost.totalCost).toBe(0.0002);
    expect(result.sample.metadata.totalCost).toBe(99);
    expect(result.measurementFailures).toEqual([]);
    expect(budget.snapshot()).toMatchObject({ observedEstimatedUsd: 0.0002, reservedUsd: 0, inFlight: 0 });
    expect(JSON.stringify(result.sample)).not.toContain('never-save');
  });
  it('retains unknown costs and refuses the next send', async () => {
    const budget = createEstimatedBudget(0.01, 0.005);
    await measure(budget, { send: async () => ({ ...reply(), metadata: null }) });
    expect(budget.snapshot()).toMatchObject({ reservedUsd: 0.005, requestsWithUnknownCost: 1, stoppedReason: 'unknown_request_cost' });
    let sends = 0;
    await expect(measure(budget, { requestId: 'turn-2', send: async () => { sends++; return reply(); } })).rejects.toThrow('Estimated budget stopped');
    expect(sends).toBe(0);
  });
  it('retains a failed transport attempt without leaking the thrown message', async () => {
    const budget = createEstimatedBudget(0.01, 0.005);
    const result = await measure(budget, { send: async () => { throw new Error('secret-key'); }, diagnostics: async () => ({ error: 'not_recorded' }) });
    expect(result.sample.measurementFailures).toEqual(['chat_http_failure', 'incomplete_stream', 'not_recorded']);
    expect(JSON.stringify(result)).not.toContain('secret-key');
    expect(budget.snapshot().reservedUsd).toBe(0.005);
  });
  it('rejects other request/embedding IDs, missing capture and provider/model drift', async () => {
    for (const edit of [
      value => { value.correlationId = 'other'; },
      value => { value.embeddings[0].correlationId = 'other'; },
      value => { value.embeddings = null; },
      value => { value.embeddings = [null]; },
      value => { value.model = 'other'; },
      value => { value.provider = 'other'; },
      value => { delete value.tools; },
      value => { value.tools = [{ toolCallId: 'a', name: 'read', outcome: 'unknown' }]; },
    ]) {
      const budget = createEstimatedBudget(0.01, 0.005);
      const value = record(); edit(value);
      const result = await measure(budget, { diagnostics: async () => ({ diagnostics: value }) });
      expect(result.measurementFailures.length).toBeGreaterThan(0);
      expect(result.sample.declaredCost).toBeNull();
      expect(budget.snapshot().stoppedReason).toBe('unknown_request_cost');
    }
  });
  it('counts known usage on HTTP/incomplete failures rather than refunding them', async () => {
    const budget = createEstimatedBudget(0.01, 0.005);
    const result = await measure(budget, { send: async () => ({ ...reply(), httpStatus: 500, complete: false }) });
    expect(result.measurementFailures).toEqual(['chat_http_failure', 'incomplete_stream']);
    expect(budget.snapshot().observedEstimatedUsd).toBe(0.0002);
  });
  it('flags partial embedding capture while retaining known token cost', async () => {
    const budget = createEstimatedBudget(0.01, 0.005);
    const result = await measure(budget, { diagnostics: async () => ({ diagnostics: { ...record(), embeddingsIncomplete: true } }) });
    expect(result.measurementFailures).toEqual(['embedding_capture_incomplete']);
    expect(budget.snapshot().observedEstimatedUsd).toBe(0.0002);
  });
  it('polls 204 with admin auth and handles terminal/missing diagnostics', async () => {
    let calls = 0;
    const pauses = [];
    const result = await readRoleDiagnostics(new URL('http://localhost:1'), 'admin-token', 'turn-1', {
      fetchImpl: async (url, options) => {
        expect(url.pathname).toBe('/api/chat-diagnostics/turn-1');
        expect(options.headers.authorization).toBe('Bearer admin-token');
        return ++calls === 1 ? new Response(null, { status: 204 }) : Response.json({ data: record() });
      }, pause: async ms => { pauses.push(ms); },
    });
    expect(result.diagnostics.correlationId).toBe('turn-1');
    expect(pauses).toEqual([200]);
    expect(await readRoleDiagnostics(new URL('http://localhost:1'), 'admin', 'id', {
      fetchImpl: async () => new Response(null, { status: 403 }),
    })).toEqual({ error: 'HTTP_403' });
  });
  it('requires finish and DONE, preserving metadata and abort/malformed failures', () => {
    const event = value => `data: ${JSON.stringify(value)}\r\n\r\n`;
    expect(parseUiStream(event({ type: 'finish', messageMetadata: metadata }) + 'data: [DONE]\r\n').complete).toBe(true);
    expect(parseUiStream('data: [DONE]\n').complete).toBe(false);
    expect(parseUiStream(event({ type: 'finish' })).complete).toBe(false);
    expect(parseUiStream(event({ type: 'abort' }) + event({ type: 'finish' }) + 'data: [DONE]\n').complete).toBe(false);
  });
});

describe('role CLI with no network access', () => {
  it('preserves all twelve turns or a stopped attempt and refuses unsafe inputs/output overwrite', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'role-measurement-'));
    const fixturePath = join(directory, 'fixtures.json');
    const pricesPath = join(directory, 'prices.json');
    const mockPath = join(directory, 'mock.mjs');
    const pupil = id => ({ id, name: `Demo pupil ${id}`, parentPhones: ['private-phone'] });
    await Bun.write(fixturePath, JSON.stringify({ version: 1, source: 'internal-school-mcp-rest', capturedAt: '2026-10-05T12:00:00Z', people: {
      year: '2026-2027', parent: { email: 'parent@example.invalid', children: [pupil('one'), pupil('two')], other: pupil('three') },
      teacher: { email: 'teacher@example.invalid', assignments: 1, studentCount: 2, ownStudentIds: ['one', 'two'], other: pupil('three') },
      student: { email: 'student@example.invalid', self: pupil('one'), other: pupil('three') }, followUp: pupil('two'),
    } }));
    await Bun.write(pricesPath, JSON.stringify(prices));
    // Every fetch is replaced; an unexpected route throws rather than reaching an app/provider.
    await Bun.write(mockPath, `const calls = []; const captures = new Map(); let settingsReads = 0;
globalThis.fetch = async (url, options = {}) => {
  const path = new URL(url).pathname; calls.push({path, token:options.headers?.authorization});
  await Bun.write(process.env.MOCK_LOG, JSON.stringify(calls));
  const scenario = process.env.MOCK_SCENARIO;
  if (path === '/api/auth/login') return Response.json({data:{accessToken:JSON.parse(options.body).email.startsWith('admin')?'admin-token':'role-token'}});
  if (path === '/api/ai-settings') return Response.json({data:{provider:'openrouter',model:scenario==='drift' && ++settingsReads>1?'other':${JSON.stringify(model)},isEnabled:true,hasKey:true}});
  if (path === '/api/chat-benchmark/status') return Response.json({data:{enabled:true}});
  if (path === '/api/chat') {
    const id = options.headers['x-request-id']; captures.set(id, true);
    const events=[{type:'tool-input-available',toolCallId:'t',toolName:'mock-read',input:{studentId:'two'}},
      {type:'tool-output-available',toolCallId:'t',output:[]},{type:'text-delta',delta:'Demo 2'},
      {type:'finish',messageMetadata:scenario==='unknown'?null:${JSON.stringify(metadata)}}];
    return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\\n\\n').join('')+'data: [DONE]\\n', {status:scenario==='http'?500:200});
  }
  if (path.startsWith('/api/chat-diagnostics/')) {
    if(options.headers.authorization!=='Bearer admin-token') throw new Error('wrong diagnostic token');
    const id=decodeURIComponent(path.split('/').at(-1)); if(!captures.has(id)) throw new Error('unknown turn');
    return Response.json({data:{correlationId:scenario==='mismatch'?'other':id,model:${JSON.stringify(model)},provider:'openrouter',outcome:'completed',spans:{prepareMs:5},embeddings:[],tools:[{toolCallId:'t',name:'mock-read',outcome:'executed',durationMs:2}]}});
  }
  throw new Error('Blocked unexpected network route');
};`);
    try {
      for (const scenario of ['complete', 'focus', 'unknown', 'mismatch', 'http', 'drift', 'missing-budget', 'existing', 'bad-option', 'bad-case', 'short-cap']) {
        const output = join(directory, `${scenario}.json`);
        const log = join(directory, `${scenario}-fetches.json`);
        if (scenario === 'existing') await Bun.write(output, 'preserved');
        const args = [Bun.which('bun'), '--preload', mockPath, resolve('scripts/chatbot-roles.mjs'),
          '--base-url=http://127.0.0.1:1', `--fixtures-file=${fixturePath}`, '--max-requests=12', `--output=${output}`,
          `--pricing-file=${pricesPath}`, ...(scenario === 'missing-budget' ? [] : ['--max-estimated-usd=0.01', '--request-reserve-usd=0.005']),
          ...(scenario === 'bad-option' ? ['--max-estimated-usd=100'] : [])];
        if (['focus', 'short-cap'].includes(scenario)) {
          args[args.indexOf('--max-requests=12')] = scenario === 'focus' ? '--max-requests=6' : '--max-requests=5';
          args.push('--case-ids=parent-children-en,parent-other-absences-ary', '--repeat=3');
        }
        if (scenario === 'bad-case') args.push('--case-ids=unknown');
        const child = Bun.spawn(args, { env: { ...process.env, ADMIN_EMAIL: 'admin@example.invalid', ADMIN_PASSWORD: 'private-secret',
          MOCK_LOG: log, MOCK_SCENARIO: scenario }, stdout: 'pipe', stderr: 'pipe' });
        const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(code).toBe(['complete', 'focus'].includes(scenario) ? 0 : 1);
        expect(stdout + stderr).not.toContain('private-secret');
        if (['existing', 'missing-budget', 'bad-option', 'bad-case', 'short-cap'].includes(scenario)) {
          expect(await Bun.file(log).exists()).toBe(false);
          if (scenario === 'existing') expect(await Bun.file(output).text()).toBe('preserved');
          continue;
        }
        const report = await Bun.file(output).json();
        expect(report.chatRequests).toBe(scenario === 'complete' ? 12 : scenario === 'focus' ? 6 : scenario === 'drift' ? 0 : 1);
        expect(report.samples.length).toBe(report.chatRequests);
        expect(new Set(report.samples.map(sample => sample.requestId)).size).toBe(report.chatRequests);
        expect(JSON.stringify(report)).not.toContain('private-phone');
        expect(JSON.stringify(report)).not.toContain('example.invalid');
        if (scenario === 'complete') {
          expect(report).toMatchObject({ status: 'completed', passed: 10, cases: 10 });
          expect(report.embeddingDiagnostics).toMatchObject({ requestsWithCapture: 12, requestsWithNoCalls: 12 });
          expect(report.estimatedBudget.observedEstimatedUsd).toBe(0.0024);
          const requests = await Bun.file(log).json();
          expect(requests.filter(row => row.path === '/api/chat' && row.token === 'Bearer role-token').length).toBe(8);
          expect(report.samples.filter(sample => sample.role === 'admin').length).toBe(4);
        } else if (scenario === 'focus') {
          expect(report).toMatchObject({ status: 'completed', passed: 6, cases: 6, plannedChatRequests: 6, repeat: 3 });
          expect(report.samples.every(sample => sample.role === 'parent')).toBe(true);
          const requests = await Bun.file(log).json();
          expect(requests.filter(row => row.path === '/api/auth/login')).toHaveLength(2);
        } else {
          expect(report.status).toBe('stopped');
          if (['unknown', 'mismatch'].includes(scenario)) expect(report.estimatedBudget).toMatchObject({ reservedUsd: 0.005, stoppedReason: 'unknown_request_cost' });
          if (scenario === 'http') expect(report.estimatedBudget.observedEstimatedUsd).toBe(0.0002);
        }
      }
    } finally {
      for (const entry of await readdir(directory)) await unlink(join(directory, entry));
      await rmdir(directory);
    }
  });
});
