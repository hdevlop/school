/**
 * Streaming chat benchmark for POST /api/chat (CHATBOT-LATENCY-PLAN section 4.2).
 * Sends paid provider requests: every live run needs an explicit --max-requests
 * budget, and nothing is sent unless the assistant is enabled with a saved key.
 */
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createUiStreamParser, percentile } from './chatbot-stream.mjs';

const KINDS = new Set(['small-talk', 'single-read', 'multi-read', 'blocked-write']);
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const entry = args.find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
};
const integer = (name, fallback, min, max) => {
  const value = Number(option(name, fallback));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Use --${name}=${min}..${max}`);
  }
  return value;
};

const casesPath = resolve(option('cases', 'datasets/chatbot-latency/questions.json'));
const corpusText = await Bun.file(casesPath).text();
const corpus = JSON.parse(corpusText);
const isNameList = (list) => Array.isArray(list) && list.length > 0
  && list.every((name) => typeof name === 'string' && name.trim());
const ids = new Set();
for (const item of corpus.cases) {
  if (!item.id || ids.has(item.id) || !item.language || !item.query?.trim() || !KINDS.has(item.kind)
    || (item.expectedToolGroups !== undefined
      && (!Array.isArray(item.expectedToolGroups) || !item.expectedToolGroups.every(isNameList)))
    || (item.forbiddenSuccessfulTools !== undefined && !isNameList(item.forbiddenSuccessfulTools))
    || (item.kind === 'blocked-write' && !item.forbiddenSuccessfulTools)
    || (item.answerFacts !== undefined && !isNameList(item.answerFacts))) {
    throw new Error(`Invalid benchmark fixture: ${item.id ?? '(no id)'}`);
  }
  ids.add(item.id);
}
if (corpus.role !== 'admin' || typeof corpus.academicYear !== 'string') {
  throw new Error('Fixture needs role "admin" (the only role this runner signs in as) and academicYear');
}
if (args.includes('--validate')) {
  console.log(JSON.stringify({ valid: true, cases: ids.size }));
  process.exit(0);
}

const base = new URL(option('base-url', process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3102'));
if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
  || !['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('This runner accepts local app URLs only');
}
const timeoutMs = integer('timeout-ms', '120000', 1000, 300000);
const limit = integer('limit', String(corpus.cases.length), 1, 100);
const repeat = integer('repeat', '1', 1, 20);
const maxRequests = integer('max-requests', '0', 0, 500);
const year = option('year', corpus.academicYear);
const keepText = args.includes('--keep-text');
// One request that may run without a saved key: proves body, year and stream
// framing (the provider then refuses inside the stream). Not a latency sample.
const transportProbe = args.includes('--transport-probe');
const selected = corpus.cases.slice(0, transportProbe ? 1 : limit);
const planned = transportProbe ? 1 : selected.length * repeat;
const outputPath = resolve(option('output', 'docs/evidence/chatbot-latency/stream-baseline.json'));

const runId = randomUUID().slice(0, 8);
const report = {
  capturedAt: new Date().toISOString(),
  runId,
  target: base.origin,
  mode: transportProbe ? 'transport-probe' : 'api-client-streaming',
  corpusSha256: createHash('sha256').update(corpusText).digest('hex'),
  role: corpus.role,
  academicYear: year,
  plannedRequests: planned,
  maxRequests,
  concurrency: 1,
  timeoutMs,
  textStored: keepText,
  packagePins: {},
  outcome: 'blocked',
  limitations: [
    'API-client timings including local transport; not browser submit-to-render.',
    'First byte is not first answer text; firstTextMs is the first non-empty text-delta.',
    'Small samples are smoke coverage, not p95 estimates; cache and Ollama state are not controlled.',
    'Admin account only; teacher, parent and student behavior is not measured.',
    'No internal stage timings until Phase 1 instrumentation; usage is whatever the stream reports.',
  ],
  requests: [],
  samples: [],
};
const rootPackage = await Bun.file('package.json').json();
for (const name of ['najm-rag', 'najm-chatbot', 'najm-mcp']) {
  report.packagePins[name] = rootPackage.dependencies[name];
}
report.packagePins.ai = (await Bun.file('node_modules/ai/package.json').json()).version;
const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD']);
report.gitHead = revision.exitCode === 0 ? revision.stdout.toString().trim() : null;
report.workingTreeDirty = Bun.spawnSync(['git', 'status', '--porcelain']).stdout.length > 0;

// Fixed allowlist: no fixture or argument can reach another route.
const routes = new Map([
  ['/api/health/status', 'GET'],
  ['/api/auth/login', 'POST'],
  ['/api/ai-settings', 'GET'],
]);
let token;
async function request(path, body) {
  const method = routes.get(path);
  if (!method) throw new Error('Route is not allowed');
  const start = performance.now();
  const entry = { path, method };
  report.requests.push(entry);
  try {
    const response = await fetch(new URL(path, base.origin), {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
    entry.httpStatus = response.status;
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const json = await response.json();
    return json.data ?? json;
  } catch (error) {
    // Do not persist response bodies, credentials, tokens or arbitrary server errors.
    entry.error = /^HTTP_\d+$/.test(error.message) ? error.message
      : error.name === 'TimeoutError' ? 'timeout' : 'request_failed';
    throw new Error(`${path}: ${entry.error}`);
  } finally {
    entry.elapsedMs = Math.round(performance.now() - start);
  }
}

async function chat(item, repetition) {
  const sessionId = `bench-${runId}-${item.id}-${repetition}`;
  const url = new URL('/api/chat', base.origin);
  url.searchParams.set('academicYear', year);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const parser = createUiStreamParser();
  const sample = { id: item.id, language: item.language, kind: item.kind, repetition, sessionId };
  const start = performance.now();
  const since = () => Math.round(performance.now() - start);
  let streamEnd = null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: sessionId,
        trigger: 'submit-message',
        messages: [{ id: `${sessionId}-u`, role: 'user', parts: [{ type: 'text', text: item.query }] }],
      }),
      redirect: 'error',
      signal: controller.signal,
    });
    sample.httpStatus = response.status;
    sample.headersMs = since();
    sample.streamProtocol = response.headers.get('x-vercel-ai-ui-message-stream');
    if (!response.ok || !response.body) {
      sample.outcome = 'http_error';
      await response.body?.cancel();
      return sample;
    }
    for await (const bytes of response.body) parser.push(bytes, since());
    streamEnd = since();
  } catch (error) {
    sample.outcome = controller.signal.aborted ? 'timeout' : 'request_failed';
    sample.errorName = error.name;
  } finally {
    clearTimeout(timer);
  }

  const parsed = parser.end(streamEnd ?? since());
  Object.assign(sample, {
    firstByteMs: parsed.firstByteMs,
    firstTextMs: parsed.firstTextMs,
    finishChunkMs: parsed.finishMs,
    bodyEndMs: streamEnd,
    finishReason: parsed.finishReason,
    sawDone: parsed.done,
    chunkCounts: parsed.chunkCounts,
    malformedEvents: parsed.malformed,
    tools: parsed.tools,
    streamErrors: parsed.errors,
    metadata: parsed.metadata,
    textLength: parsed.text.length,
    ...(keepText ? { text: parsed.text } : {}),
  });
  sample.outcome ??= parsed.aborted ? 'aborted'
    : parsed.errors.length > 0 ? 'stream_error'
    : parsed.finishMs === null ? 'incomplete'
    : parsed.text.trim() === '' ? 'empty_answer'
    : 'completed';
  sample.checks = score(item, parsed);
  return sample;
}

/** Automatic checks only; answer quality still needs human review per language. */
function score(item, parsed) {
  const called = new Set(parsed.tools.map((tool) => tool.name).filter(Boolean));
  const missingGroups = (item.expectedToolGroups ?? [])
    .filter((group) => !group.some((name) => called.has(name)));
  const forbiddenOutputs = parsed.tools
    .filter((tool) => item.forbiddenSuccessfulTools?.includes(tool.name) && tool.outcome === 'output')
    .map((tool) => tool.name);
  const lowerText = parsed.text.toLowerCase();
  const missingFacts = (item.answerFacts ?? []).filter((fact) => !lowerText.includes(fact.toLowerCase()));
  return {
    missingToolGroups: missingGroups,
    // An output event may still carry the adapter's "blocked" result: review, do not assume a write.
    forbiddenToolOutputs: forbiddenOutputs,
    missingFacts,
    passed: missingGroups.length === 0 && forbiddenOutputs.length === 0 && missingFacts.length === 0,
  };
}

function summarize(samples) {
  const completed = samples.filter((sample) => sample.outcome === 'completed');
  const byOutcome = {};
  for (const sample of samples) byOutcome[sample.outcome] = (byOutcome[sample.outcome] ?? 0) + 1;
  const stats = (rows) => ({
    n: rows.length,
    firstTextP50: percentile(rows.map((row) => row.firstTextMs), 50),
    firstTextP95: percentile(rows.map((row) => row.firstTextMs), 95),
    completeP50: percentile(rows.map((row) => row.bodyEndMs), 50),
    completeP95: percentile(rows.map((row) => row.bodyEndMs), 95),
  });
  const groups = (key) => Object.fromEntries([...new Set(completed.map((row) => row[key]))]
    .map((value) => [value, stats(completed.filter((row) => row[key] === value))]));
  // najm-chatbot >= 2.0.4 reports usage on the finish event; older streams leave it unknown.
  const withUsage = samples.filter((sample) => Number.isFinite(sample.metadata?.totalTokens));
  const sum = (key) => withUsage.reduce((total, sample) => total + sample.metadata[key], 0);
  return {
    requests: samples.length,
    byOutcome,
    usage: {
      requestsWithUsage: withUsage.length,
      promptTokens: sum('promptTokens'),
      completionTokens: sum('completionTokens'),
      estimatedCostUsd: sum('totalCost'),
      pricingFoundForAll: withUsage.every((sample) => sample.metadata.pricingFound === true),
      note: 'Estimate from najm-chatbot model pricing; provider billing is authoritative.',
    },
    completedAndChecksPassed: completed.filter((sample) => sample.checks.passed).length,
    completed: stats(completed),
    completedByKind: groups('kind'),
    completedByLanguage: groups('language'),
    note: 'Failures and timeouts are counted in byOutcome and excluded only from the completed timing rows.',
  };
}

try {
  if (planned > maxRequests) {
    throw new Error(`Planned ${planned} chat requests exceed --max-requests=${maxRequests}; set an explicit budget`);
  }
  report.health = await request('/api/health/status');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required from the existing local environment');
  }
  const login = await request('/api/auth/login', {
    email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  token = login.accessToken ?? login.tokens?.accessToken;
  if (!token) throw new Error('Login did not return an access token');
  const settings = await request('/api/ai-settings');
  // Identifiers only; never the key.
  report.provider = { provider: settings?.provider ?? null, model: settings?.model ?? null,
    baseUrl: settings?.baseUrl ?? null, enabled: settings?.isEnabled ?? null, hasKey: settings?.hasKey ?? null };
  if (!settings?.isEnabled || (!settings?.hasKey && !transportProbe)) {
    throw new Error('Assistant is disabled or has no saved provider key; no chat requests were sent');
  }

  for (let repetition = 1; repetition <= (transportProbe ? 1 : repeat); repetition++) {
    for (const item of selected) {
      const sample = await chat(item, repetition);
      report.samples.push(sample);
      console.error(`${sample.id}#${repetition} ${sample.outcome} firstText=${sample.firstTextMs ?? '-'}ms complete=${sample.bodyEndMs ?? '-'}ms`);
    }
  }
  report.summary = summarize(report.samples);
  report.outcome = transportProbe
    ? (report.samples[0].httpStatus === 200 && report.samples[0].streamProtocol ? 'transport_ok' : 'transport_failed')
    : report.samples.every((sample) => sample.outcome === 'completed' && sample.checks.passed)
    ? 'passed' : 'failures';
} catch (error) {
  report.blocker = error.message;
  if (report.samples.length > 0) {
    report.summary = summarize(report.samples);
    report.outcome = 'interrupted';
  }
}

await Bun.write(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  outcome: report.outcome,
  report: outputPath,
  provider: report.provider ?? null,
  blocker: report.blocker,
  summary: report.summary,
}, null, 2));
process.exit(['passed', 'transport_ok'].includes(report.outcome) ? 0 : 1);
