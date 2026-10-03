/**
 * Streaming chat benchmark for POST /api/chat (CHATBOT-LATENCY-PLAN section 4.2).
 * Sends paid provider requests: every live run needs an explicit --max-requests
 * budget, and nothing is sent unless the assistant is enabled with a saved key.
 */
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createUiStreamParser, percentile } from './chatbot-stream.mjs';
import { detectReplyLanguage } from './chatbot-language.mjs';

const REPLY_LANGUAGES = { en: 'en', fr: 'fr', es: 'es', ar: 'ar', ary: 'ar' };

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
// Interleaves a baseline (the saved model unless --baseline-model is given) with
// a candidate, request by request, on the same provider and key, then restores
// the saved model.
const compareModel = option('compare-model', '');
const baselineOverride = option('baseline-model', '');
const modelId = /^[\w.:/-]{1,120}$/;
if (compareModel && (transportProbe || !modelId.test(compareModel))) {
  throw new Error('Use --compare-model=<provider model id> without --transport-probe');
}
if (baselineOverride && (!compareModel || !modelId.test(baselineOverride))) {
  throw new Error('Use --baseline-model=<provider model id> together with --compare-model');
}
const selected = corpus.cases.slice(0, transportProbe ? 1 : limit);
const planned = transportProbe ? 1 : selected.length * repeat * (compareModel ? 2 : 1);
const outputPath = resolve(option('output', 'docs/evidence/chatbot-latency/stream-baseline.json'));

const runId = randomUUID().slice(0, 8);
const report = {
  capturedAt: new Date().toISOString(),
  runId,
  target: base.origin,
  mode: transportProbe ? 'transport-probe' : compareModel ? 'api-client-streaming-comparison' : 'api-client-streaming',
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
    'Server timings come from najm-chatbot diagnostics (>= 2.0.5) matched by x-request-id; modelAndStreamMs is derived, not measured.',
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

// Fixed allowlist: no fixture or argument can reach another route. The PUT only
// ever sends { model } (see setModel).
const routes = new Set([
  'GET /api/health/status',
  'POST /api/auth/login',
  'GET /api/ai-settings',
  'PUT /api/ai-settings',
]);
let token;
async function request(path, body, method = body === undefined ? 'GET' : 'POST') {
  if (!routes.has(`${method} ${path}`)) throw new Error('Route is not allowed');
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

// Server-side diagnostics for one chat request, matched by the x-request-id it
// was sent with. 204 means not recorded yet: the record lands after the save.
async function serverDiagnostics(requestId) {
  const url = new URL(`/api/chat-diagnostics/${encodeURIComponent(requestId)}`, base.origin);
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 200) {
        const json = await response.json();
        return { diagnostics: json.data ?? json };
      }
      if (response.status !== 204) return { error: `HTTP_${response.status}` };
    } catch (error) {
      return { error: error.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
    }
    await Bun.sleep(200);
  }
  return { error: 'not_recorded' };
}

let activeModel = null;
async function setModel(model) {
  if (model === activeModel) return;
  const saved = await request('/api/ai-settings', { model }, 'PUT');
  if (saved?.model !== model) throw new Error('AI settings did not take the requested model');
  activeModel = model;
}

async function runAll(baselineModel) {
  for (let repetition = 1; repetition <= (transportProbe ? 1 : repeat); repetition++) {
    for (const [index, item] of selected.entries()) {
      const variants = !compareModel ? [[null, baselineModel]]
        : (index + repetition) % 2 === 0
          ? [['baseline', baselineModel], ['candidate', compareModel]]
          : [['candidate', compareModel], ['baseline', baselineModel]];
      for (const [variant, model] of variants) {
        if (variant) await setModel(model);
        const sample = await chat(item, repetition, variant);
        if (variant) {
          Object.assign(sample, { variant, model });
          if (sample.server && sample.server.model !== model) sample.modelMismatch = true;
        }
        report.samples.push(sample);
        console.error((variant ? `[${variant}] ` : '')
          + `${sample.id}#${repetition} ${sample.outcome} firstText=${sample.firstTextMs ?? '-'}ms complete=${sample.bodyEndMs ?? '-'}ms`
          + ` server=${sample.server ? `${sample.server.outcome} prepare=${sample.server.spans.prepareMs}ms` : sample.serverDiagnosticsError ?? '-'}`);
      }
    }
  }
}

async function chat(item, repetition, variant = null) {
  // Each request is a fresh session, so neither model sees the other's answer.
  const sessionId = `bench-${runId}-${item.id}-${repetition}${variant ? `-${variant}` : ''}`;
  const url = new URL('/api/chat', base.origin);
  url.searchParams.set('academicYear', year);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const parser = createUiStreamParser();
  const sample = { id: item.id, language: item.language, kind: item.kind, repetition, sessionId, requestId: sessionId };
  const start = performance.now();
  const since = () => Math.round(performance.now() - start);
  let streamEnd = null;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-request-id': sessionId,
      },
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
  const server = await serverDiagnostics(sessionId);
  sample.server = server.diagnostics ?? null;
  if (server.error) sample.serverDiagnosticsError = server.error;
  sample.checks = score(item, parsed, sample.server);
  return sample;
}

/** Automatic checks only; answer quality still needs human review per language. */
function score(item, parsed, server) {
  const called = new Set(parsed.tools.map((tool) => tool.name).filter(Boolean));
  const missingGroups = (item.expectedToolGroups ?? [])
    .filter((group) => !group.some((name) => called.has(name)));
  const forbidden = (name) => item.forbiddenSuccessfulTools?.includes(name) ?? false;
  // The server knows whether a tool ran or was blocked by the read-only adapter;
  // the stream shows both as an output event.
  const forbiddenOutputs = server
    ? server.tools.filter((tool) => forbidden(tool.name) && tool.outcome === 'executed').map((tool) => tool.name)
    : parsed.tools.filter((tool) => forbidden(tool.name) && tool.outcome === 'output').map((tool) => tool.name);
  const lowerText = parsed.text.toLowerCase();
  const missingFacts = (item.answerFacts ?? []).filter((fact) => !lowerText.includes(fact.toLowerCase()));
  // Darija questions expect an Arabic-script reply; a mixed-language question
  // sets replyLanguage or is not checked.
  const expectedLanguage = REPLY_LANGUAGES[item.replyLanguage ?? item.language] ?? null;
  const replyLanguage = detectReplyLanguage(parsed.text);
  const wrongLanguage = expectedLanguage !== null && replyLanguage !== null && replyLanguage !== expectedLanguage;
  return {
    missingToolGroups: missingGroups,
    // Without server diagnostics an output event may still be the adapter's
    // "blocked" result: review, do not assume a write.
    forbiddenToolOutputs: forbiddenOutputs,
    blockedTools: server ? server.tools.filter((tool) => tool.outcome === 'blocked').map((tool) => tool.name) : null,
    forbiddenCheckSource: server ? 'server' : 'stream',
    missingFacts,
    // null when the reply was too short or mixed to call.
    replyLanguage,
    wrongLanguage,
    passed: missingGroups.length === 0 && forbiddenOutputs.length === 0 && missingFacts.length === 0 && !wrongLanguage,
  };
}

function summarize(samples, single = false) {
  if (!single && compareModel && samples.some((sample) => sample.variant)) {
    return {
      requests: samples.length,
      comparison: Object.fromEntries(['baseline', 'candidate'].map((variant) => [variant, {
        model: samples.find((sample) => sample.variant === variant)?.model ?? null,
        // A request that ran on another model (settings cache, a parallel edit) is excluded.
        mismatchedModel: samples.filter((sample) => sample.variant === variant && sample.modelMismatch).length,
        ...summarize(samples.filter((sample) => sample.variant === variant && !sample.modelMismatch), true),
      }])),
      note: 'Requests alternate between models; the first model of each pair alternates too.',
    };
  }
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
    server: serverSummary(completed),
    usage: {
      requestsWithUsage: withUsage.length,
      promptTokens: sum('promptTokens'),
      completionTokens: sum('completionTokens'),
      estimatedCostUsd: sum('totalCost'),
      pricingFoundForAll: withUsage.every((sample) => sample.metadata.pricingFound === true),
      note: 'Estimate from najm-chatbot model pricing; provider billing is authoritative.',
    },
    completedAndChecksPassed: completed.filter((sample) => sample.checks.passed).length,
    wrongLanguage: completed.filter((sample) => sample.checks.wrongLanguage).length,
    completed: stats(completed),
    completedByKind: groups('kind'),
    completedByLanguage: groups('language'),
    note: 'Failures and timeouts are counted in byOutcome and excluded only from the completed timing rows.',
  };
}

/** Where completed answers spent their time, from the server's own clock. */
function serverSummary(completed) {
  const rows = completed.filter((sample) => sample.server);
  const toolMs = (server) => server.tools.reduce((total, tool) => total + tool.durationMs, 0);
  const derived = rows.map((sample) => {
    const { spans, marks } = sample.server;
    const beforeModel = (spans.settingsMs ?? 0) + (spans.historyMs ?? 0) + (spans.prepareMs ?? 0);
    return {
      ...spans,
      serverFirstTextMs: marks.firstTextMs,
      serverFinishMs: marks.finishMs,
      toolMs: toolMs(sample.server),
      // Provider time plus SDK streaming: whatever the finish mark holds beyond
      // preparation and tool execution.
      modelAndStreamMs: marks.finishMs === null ? null : marks.finishMs - beforeModel - toolMs(sample.server),
      steps: sample.server.steps.length,
      // Local transport, Next.js and stream parsing between server and client.
      clientOverheadFirstTextMs: sample.firstTextMs === null || marks.firstTextMs === null
        ? null : sample.firstTextMs - marks.firstTextMs,
    };
  });
  const keys = ['settingsMs', 'historyMs', 'routingMs', 'contextMs', 'prepareMs', 'persistenceMs',
    'toolMs', 'modelAndStreamMs', 'serverFirstTextMs', 'serverFinishMs', 'clientOverheadFirstTextMs', 'steps'];
  const toolOutcomes = {};
  for (const sample of rows) {
    for (const tool of sample.server.tools) toolOutcomes[tool.outcome] = (toolOutcomes[tool.outcome] ?? 0) + 1;
  }
  return {
    n: rows.length,
    missing: completed.length - rows.length,
    p50: Object.fromEntries(keys.map((key) => [key, percentile(derived.map((row) => row[key]), 50)])),
    p95: Object.fromEntries(keys.map((key) => [key, percentile(derived.map((row) => row[key]), 95)])),
    toolOutcomes,
    note: 'prepareMs contains routingMs and contextMs; do not add them.',
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

  const savedModel = settings.model;
  const baselineModel = baselineOverride || savedModel;
  report.comparison = compareModel ? { saved: savedModel, baseline: baselineModel, candidate: compareModel } : null;
  activeModel = savedModel;
  try {
    await runAll(baselineModel);
  } finally {
    // Always put the saved model back, even after a failure.
    if (compareModel && activeModel !== savedModel) {
      await setModel(savedModel).catch(() => {
        report.restoreFailed = `AI settings model left at ${activeModel}; set it back to ${savedModel}`;
      });
    }
  }
  report.summary = summarize(report.samples);
  report.outcome = transportProbe
    ? (report.samples[0].httpStatus === 200 && report.samples[0].streamProtocol ? 'transport_ok' : 'transport_failed')
    : report.samples.every((sample) => sample.outcome === 'completed' && sample.checks.passed && !sample.modelMismatch)
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
  restoreFailed: report.restoreFailed,
  summary: report.summary,
}, null, 2));
process.exit(['passed', 'transport_ok'].includes(report.outcome) ? 0 : 1);
