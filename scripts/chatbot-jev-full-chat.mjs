/** Plan/fixture mode is unpaid. Execute requires explicit frozen limits and marked local fixture controls. */
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fullChatProtocol, modelComparisonProtocol, firstComparisonProtocol, fingerprint, checkSource, checkBase, checkReady, checkScopedRead, summarizeFullChat } from './chatbot-jev-full-chat-lib.mjs';
import { createUiStreamParser } from './chatbot-stream.mjs';
import { createEstimatedBudget } from './chatbot-budget.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const fixtureMode = args.includes('--fixture');
const execute = args.includes('--execute');
const preflight = args.includes('--preflight');
if ([fixtureMode, execute, preflight].filter(Boolean).length > 1) throw new Error('Choose one of --fixture, --preflight or --execute');
const defaultPlan = 'docs/evidence/chatbot-latency/jev-billing-observer-plan-20261007.json';
const planPath = option('plan', defaultPlan);
if (!fixtureMode && !execute && !preflight) {
  const plan = args.includes('--first-comparison') ? firstComparisonProtocol(option('continue-from'), option('generation-usage'), args.includes('--retain-rejected-reservation'))
    : args.includes('--model-comparison') ? modelComparisonProtocol(option('continue-from'), option('generation-usage'))
    : fullChatProtocol(option('continue-from'));
  plan.sourceFingerprint = fingerprint(plan.sourceHashes);
  writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ plan: planPath, sourceFingerprint: plan.sourceFingerprint, chats: plan.maxChats,
    classifications: plan.maxClassifications, maxCombinedEstimatedUsd: plan.maxCombinedEstimatedUsd }));
  process.exit(0);
}
const protocol = fixtureMode ? fullChatProtocol() : JSON.parse(readFileSync(planPath, 'utf8'));
checkSource(protocol);
const base = fixtureMode ? null : checkBase(option('base-url', 'http://127.0.0.1:3103'));
if (execute && (Number(option('max-requests', '0')) !== protocol.maxChats
  || Number(option('max-classifications', '0')) !== protocol.maxClassifications
  || Number(option('max-estimated-usd', '0')) !== protocol.maxCombinedEstimatedUsd
  || Number(option('request-reserve-usd', '0')) !== protocol.generationReserveUsd
  || option('source-fingerprint', '') !== fingerprint(protocol.sourceHashes))) throw new Error('Supply the exact frozen count/cost limits and source fingerprint');
const out = option('output', fixtureMode ? 'docs/evidence/chatbot-latency/jev-billing-observer-fixture-20261007.json'
  : preflight ? 'docs/evidence/chatbot-latency/jev-billing-observer-preflight-20261007.json' : 'docs/evidence/chatbot-latency/jev-billing-observer-run-20261007.json');
if (existsSync(out)) throw new Error('Refusing to overwrite benchmark evidence');
const report = { stage: fixtureMode ? 'mock-full-chat-fixture' : preflight ? 'unpaid-preflight' : 'paid-full-chat-comparison',
  status: 'preparing', protocol, actualProviderCalls: fixtureMode ? 0 : null,
  generationPricesAreEstimates: true, modelAndClassifierMocked: fixtureMode, chatsDispatched: 0, rows: [], attempts: [], qualification: false };
writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
const save = () => writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
let fixture, token;
const comparison = ['two-model-jev-parallel-comparison', 'coreweave-jev-first-comparison'].includes(protocol.purpose);
let selectedModel;
async function request(path, body, correlation = randomUUID(), method) {
  if (fixture) return fixture.call(path, body, 'admin', option('year', '2026-2027'), correlation);
  return fetch(new URL(`/api${path}`, base), { method: method ?? (body === undefined ? 'GET' : 'POST'), redirect: 'error',
    signal: AbortSignal.timeout(body && path === '/chat' ? 120_000 : 10_000),
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}`, 'x-request-id': correlation,
      'X-Academic-Year': option('year', '2026-2027') }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function json(path, body, correlation, method) {
  const response = await request(path, body, correlation, method);
  if (!response.ok) throw new Error(`Benchmark control ${path}: HTTP ${response.status}`);
  return response.json();
}
const generationBudget = createEstimatedBudget(protocol.maxCombinedEstimatedUsd - protocol.classificationMaxUsd, protocol.generationReserveUsd);
let restored = false, started = false;
try {
  if (fixtureMode) {
    process.env.DB_URL = 'postgres://localhost/school_history_test'; process.env.NODE_ENV = 'test';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true'; process.env.CHATBOT_JEV_MAX_REQUESTS = String(protocol.maxClassifications);
    process.env.CHATBOT_JEV_MAX_COST_USD = String(protocol.classificationMaxUsd);
    process.env.CHATBOT_JEV_TIMEOUT_MS = String(protocol.timeoutMs); process.env.CHATBOT_JEV_THRESHOLD = String(protocol.threshold);
    process.env.CHATBOT_JEV_BILLING_MODE = protocol.billingMode;
    process.env.CHATBOT_JEV_BILLING_TIMEOUT_MS = String(protocol.billingTimeoutMs);
    const { createJevFixture } = await import('@sms/server/testing/jev');
    fixture = await createJevFixture();
    await json('/chat-benchmark/jev/mode', { mode: 'off' });
  } else {
    const email = option('email', process.env.SCHOOL_HISTORY_ADMIN_EMAIL ?? 'admin@history.example.test');
    const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
    if (!password) throw new Error('Set SCHOOL_HISTORY_ADMIN_PASSWORD for the existing fixture administrator');
    const login = await fetch(new URL('/api/auth/login', base), { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(10_000), headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!login.ok) throw new Error(`Fixture sign-in: HTTP ${login.status}`);
    token = (await login.json()).data?.accessToken;
    if (!token) throw new Error('Missing fixture access token');
  }
  const initial = await json('/chat-benchmark/jev/status'); checkReady(initial, protocol);
  report.initial = initial;
  if (!fixtureMode) {
    report.scopedReadChecks = [];
    for (const tool of ['students_get_student_count', 'teachers_get_teacher_count', 'classes_get_classes', 'sections_get_sections', 'attendance_get_today_students']) {
      const result = await json('/mcp', { jsonrpc: '2.0', id: randomUUID(), method: 'tools/call',
        params: { name: tool, arguments: { academicYear: option('year', '2026-2027') } } });
      checkScopedRead(tool, result);
      report.scopedReadChecks.push({ tool, passed: true });
    }
    report.keyBefore = await json('/chat-benchmark/provider-usage');
    const settings = await json('/ai-settings');
    if (settings?.data?.provider !== 'openrouter' && settings?.provider !== 'openrouter') throw new Error('Require the selected OpenRouter settings');
    report.settings = { provider: settings.data?.provider ?? settings.provider, model: settings.data?.model ?? settings.model };
    selectedModel = report.settings.model;
    if (report.settings.model !== 'openai/gpt-oss-120b') throw new Error('Keep the declared GPT-OSS model for this comparison');
    if ((settings.data ?? settings).isEnabled !== true) throw new Error('Require enabled model settings');
  }
  if (preflight) {
    restored = true; // Read-only preflight required mode off and did not change it.
    report.status = 'ready'; save(); console.log(JSON.stringify({ output: out, ready: true, paidCalls: 0 }));
    process.exitCode = 0;
  } else {
    started = true;
    let previousStart = -Infinity;
    for (const job of protocol.jobs) {
      checkSource(protocol);
      const status = await json('/chat-benchmark/jev/status');
      if (status.instanceId !== initial.instanceId || status.budget.unknownCosts || status.budget.pendingRequests
        || status.budget.requests > protocol.maxClassifications)
        throw new Error('Process changed or classifier cost remains unknown');
      if (!fixtureMode) {
        const key = await json('/chat-benchmark/provider-usage');
        if (key.usage - report.keyBefore.usage >= protocol.maxCombinedEstimatedUsd) throw new Error('Observed key delta reached the spending stop');
        await Bun.sleep(Math.max(0, protocol.startSpacingMs - (performance.now() - previousStart)));
        if (comparison && selectedModel !== job.model) {
          const changed = await json('/ai-settings', { model: job.model }, undefined, 'PUT');
          if ((changed.data ?? changed).model !== job.model) throw new Error('Fixture model did not switch');
          selectedModel = job.model;
        }
      }
      const mode = await json('/chat-benchmark/jev/mode', { mode: job.mode });
      if (mode.mode !== job.mode || mode.frameworkPreparationEnabled !== (job.mode !== 'off')) throw new Error('Framework mode did not switch');
      const grant = await json('/chat-benchmark/jev/session', { caseId: job.caseId,
        ...(job.experimentArm ? { experimentArm: job.experimentArm } : {}) });
      if (grant.instanceId !== initial.instanceId) throw new Error('Session came from another process');
      if (job.experimentArm && grant.experimentArm !== job.experimentArm) throw new Error('Server grant differs from frozen experiment arm');
      const item = protocol.cases.find(item => item.id === job.caseId);
      if (grant.query !== item.query) throw new Error('Server synthetic catalog differs from the frozen corpus');
      const correlationId = randomUUID(); generationBudget.reserve(correlationId);
      const start = performance.now(); previousStart = start;
      report.chatsDispatched++;
      const row = { ...job, correlationId, startedAt: new Date().toISOString(), language: item.language, expectedIntent: item.intent,
        firstTextMs: null, completionMs: null, done: false, errors: [], aborted: false, text: '',
        tools: [], generationEstimate: null, diagnostics: null };
      report.rows.push(row); save();
      const response = await request('/chat', { sessionKey: grant.sessionKey,
        messages: [{ id: randomUUID(), role: 'user', parts: [{ type: 'text', text: grant.query }] }] }, correlationId);
      if (!response.ok || !response.body) throw new Error(`Chat failed: HTTP ${response.status}`);
      const parser = createUiStreamParser({ captureToolInputs: true, captureToolResultSummaries: true });
      const reader = response.body.getReader();
      while (true) { const part = await reader.read(); if (part.done) break; parser.push(part.value, performance.now() - start); }
      const parsed = parser.end(performance.now() - start);
      Object.assign(row, {
        firstTextMs: parsed.firstTextMs, completionMs: performance.now() - start, completedAt: new Date().toISOString(),
        done: parsed.done, errors: parsed.errors, aborted: parsed.aborted, text: parsed.text,
        tools: parsed.tools, generationEstimate: parsed.metadata, diagnostics: null });
      for (let i = 0; i < 12; i++) {
        row.diagnostics = fixture ? fixture.events.find(event => event.correlationId === correlationId) ?? null
          : await json(`/chat-diagnostics/${correlationId}`).catch(() => null);
        if (row.diagnostics) break;
        await Bun.sleep(100);
      }
      generationBudget.settle(correlationId, parsed.metadata);
      if (comparison && row.diagnostics?.model !== job.model) throw new Error('Reply used a different model than the frozen arm');
      const billingStart = performance.now();
      while (true) {
        report.attempts = await json('/chat-benchmark/jev/attempts');
        if (!report.attempts.some(attempt => attempt.outcome === 'pending')) break;
        if (performance.now() - billingStart > protocol.billingTimeoutMs + 250) throw new Error('Classifier billing did not settle within its bounded lifetime');
        await Bun.sleep(50);
      }
      row.billingWaitMs = performance.now() - billingStart;
      report.generationBudget = generationBudget.snapshot();
      save();
      if (report.attempts.some(attempt => attempt.costUsd === null)) throw new Error('Classifier terminal cost remains unknown');
      if (report.attempts.some(attempt => attempt.outcome === 'error' || attempt.httpStatus >= 400
        || attempt.transportCompleted === true && !attempt.choice)) throw new Error('Classifier request or decision validation failed');
      if (!row.done || row.errors.length || row.aborted || !row.diagnostics) throw new Error('Missing/failed reply diagnostics');
      if (row.diagnostics.tools?.some(tool => tool.outcome === 'error' || tool.outcome === 'blocked')) {
        row.qualityErrors = ['Scoped chat tool failed']; save();
        if (!comparison || protocol.retainModelToolErrors !== true) throw new Error('Scoped chat tool failed');
      }
      const attempt = report.attempts.find(attempt => attempt.correlationId === correlationId);
      if (attempt?.selected === 'template' && attempt.choice !== item.intent) throw new Error('Accepted wrong assistant-provisional label');
      if (!fixtureMode && generationBudget.stopped) throw new Error('Generation cost is unknown or the estimate stop was reached');
    }
    report.status = 'completed';
  }
} catch (error) {
  report.status = 'stopped'; report.stoppedReason = error instanceof Error ? error.message : 'Benchmark failed'; process.exitCode = 1;
} finally {
  if (started || fixture) {
    try { restored = (await json('/chat-benchmark/jev/mode', { mode: 'off' })).mode === 'off'; } catch { /* explicit failed restoration below */ }
    try { report.attempts = await json('/chat-benchmark/jev/attempts'); } catch { /* preserve prior attempts */ }
    if (!fixture) try { report.keyAfter = await json('/chat-benchmark/provider-usage'); } catch { /* absent is unknown */ }
    if (!fixture && comparison) {
      try {
        const settings = await json('/ai-settings', { model: protocol.restoresModel }, undefined, 'PUT');
        report.modelRestored = (settings.data ?? settings).model === protocol.restoresModel;
      } catch { report.modelRestored = false; }
    }
  }
  report.modeRestoredOff = restored;
  report.summary = summarizeFullChat(report.rows); report.generationBudget = generationBudget.snapshot();
  if (comparison) report.modelSummaries = Object.fromEntries(protocol.models.map(model =>
    [model, summarizeFullChat(report.rows.filter(row => row.model === model))]));
  if (fixture) report.mockCalls = fixture.counts();
  if (report.keyBefore && report.keyAfter) report.aggregateKeyDeltaUsd = report.keyAfter.usage - report.keyBefore.usage;
  save(); await fixture?.server.stop();
}
console.log(JSON.stringify({ output: out, status: report.status, replies: report.rows.length,
  modeRestoredOff: restored, qualification: false, stoppedReason: report.stoppedReason }));
