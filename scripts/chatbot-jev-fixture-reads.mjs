/** Unpaid marked-fixture check. Models are pointed at a loopback server that denies every generation. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createUiStreamParser } from './chatbot-stream.mjs';

const base = 'http://127.0.0.1:3103/api';
const out = process.argv.slice(2).find(arg => arg.startsWith('--output='))?.slice(9)
  ?? 'docs/evidence/chatbot-latency/jev-unpaid-scoped-replies-release-20261007.json';
if (!out || existsSync(out)) throw new Error('Supply a new evidence output; refusing overwrite');
const embeddingUrl = new URL(process.env.RAG_EMBEDDING_BASE_URL
  ?? (process.env.RAG_EMBEDDING_PROVIDER === 'openai-compatible' ? 'http://127.0.0.1:18080/v1' : 'http://127.0.0.1:11434'));
if (!['localhost', '127.0.0.1', '[::1]'].includes(embeddingUrl.hostname)) throw new Error('Unpaid fixture checks require local embeddings');
const password = process.env.SCHOOL_HISTORY_ADMIN_PASSWORD;
if (!password) throw new Error('Missing existing fixture password');
const login = await fetch(`${base}/auth/login`, { method: 'POST', redirect: 'error',
  headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'admin@history.example.test', password }) });
if (!login.ok) throw new Error(`Fixture login HTTP ${login.status}`);
const token = (await login.json()).data.accessToken;
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'X-Academic-Year': '2026-2027' };
const json = async (path, body, method = body === undefined ? 'GET' : 'POST') => {
  const response = await fetch(`${base}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(10000), headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
};
const initial = await json('/chat-benchmark/jev/status');
if (!initial.markedLocalFixture || initial.mode !== 'off' || initial.budget.maxRequests !== 0 || initial.budget.requests !== 0)
  throw new Error('Require the marked fixture, mode off and zero classification allowance');
const old = await json('/ai-settings');
if (old.isEnabled || old.hasKey || Object.values(old.providerKeys ?? {}).some(Boolean)) throw new Error('Require the existing disabled, keyless fixture settings');
let modelNetworkCalls = 0;
const deniedModel = Bun.serve({ hostname: '127.0.0.1', port: 3909, fetch: () => {
  modelNetworkCalls++; return Response.json({ error: 'Model generation is forbidden for this unpaid check' }, { status: 503 });
} });
const report = { stage: 'unpaid-live-scoped-template-replies', capturedAtUtc: new Date().toISOString(), modelNetworkCalls: 0,
  paidProviderCalls: 0, classifierCalls: 0, rows: [], settingsRestored: false, status: 'running' };
try {
  await json('/ai-settings', { provider: 'custom', model: 'fixture-never-generate', baseUrl: 'http://127.0.0.1:3909/v1',
    apiKey: null, isEnabled: true, useMemory: false }, 'PUT');
  report.cacheReset = await json('/chat-benchmark/reset-caches', {});
  const cases = JSON.parse(readFileSync('datasets/chatbot-latency/morocco.json', 'utf8')).cases
    .filter(item => item.id.startsWith('student-count-') && ['fr', 'ar', 'ary'].includes(item.language));
  for (const year of ['2025-2026', '2026-2027']) for (const item of cases) {
    headers['X-Academic-Year'] = year;
    const countRead = await json('/students/count');
    const expected = (countRead.data ?? countRead).count;
    if (!Number.isSafeInteger(expected) || expected < 0) throw new Error('Invalid fixture count read');
    const correlationId = randomUUID(), start = performance.now();
    const response = await fetch(`${base}/chat`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { ...headers, 'x-request-id': correlationId }, body: JSON.stringify({ sessionKey: `unpaid-fixture:${randomUUID()}`,
        messages: [{ id: randomUUID(), role: 'user', parts: [{ type: 'text', text: item.query }] }] }) });
    if (!response.ok || !response.body) throw new Error(`Chat HTTP ${response.status}`);
    const parser = createUiStreamParser({ captureToolInputs: true, captureToolResultSummaries: true }); const reader = response.body.getReader();
    while (true) { const chunk = await reader.read(); if (chunk.done) break; parser.push(chunk.value, performance.now() - start); }
    const parsed = parser.end(performance.now() - start);
    const completionMs = performance.now() - start;
    const diagnostic = await json(`/chat-diagnostics/${correlationId}`);
    const row = { caseId: item.id, year, expectedStudentCount: expected, firstTextMs: parsed.firstTextMs,
      completionMs, diagnosticLookupMs: performance.now() - start - completionMs,
      text: parsed.text, done: parsed.done, errors: parsed.errors, streamTools: parsed.tools, diagnostic };
    report.rows.push(row);
    if (!parsed.done || parsed.errors.length || parsed.aborted || modelNetworkCalls !== 0
      || diagnostic.reply?.source !== 'template' || diagnostic.reply?.error
      || diagnostic.tools.length !== 1 || diagnostic.tools[0].outcome !== 'executed'
      || !parsed.text.includes(String(expected))
      || !parsed.tools.some(tool => tool.name === 'students_get_student_count' && tool.arguments?.academicYear === year)) throw new Error('Scoped template reply failed');
  }
  report.status = 'completed';
} catch (error) { report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
} finally {
  report.modelNetworkCalls = modelNetworkCalls;
  try {
    await json('/ai-settings', { provider: old.provider, model: old.model, baseUrl: old.baseUrl,
      isEnabled: false, useMemory: old.useMemory, apiKey: null }, 'PUT');
    const restored = await json('/ai-settings'); report.settingsRestored = !restored.isEnabled && !restored.hasKey
      && restored.provider === old.provider && restored.model === old.model && restored.baseUrl === old.baseUrl;
  } catch { process.exitCode = 1; }
  report.finalJevStatus = await json('/chat-benchmark/jev/status');
  await deniedModel.stop();
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: report.status, replies: report.rows.length, modelNetworkCalls,
    classifierCalls: report.finalJevStatus.budget.requests, settingsRestored: report.settingsRestored }));
}
