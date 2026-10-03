/** Routing-only diagnostics. Never calls /api/chat or executes a school tool. */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const entry = args.find((value) => value.startsWith(`--${name}=`));
  return entry ? entry.slice(name.length + 3) : fallback;
};
const casesPath = resolve(option('cases', 'datasets/chatbot-latency/routing-cases.json'));
const corpusText = await Bun.file(casesPath).text();
const corpus = JSON.parse(corpusText);
const ids = new Set();
for (const item of corpus.cases) {
  if (!item.id || ids.has(item.id) || !item.language || !item.query?.trim()
    || !Array.isArray(item.requiredToolGroups) || item.requiredToolGroups.length === 0
    || item.requiredToolGroups.some((group) => !Array.isArray(group) || group.length === 0
      || group.some((name) => typeof name !== 'string' || !name.trim()))) {
    throw new Error('Invalid routing fixture');
  }
  ids.add(item.id);
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
const timeoutMs = Number(option('timeout-ms', '15000'));
const limit = Number(option('limit', String(corpus.cases.length)));
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000
  || !Number.isInteger(limit) || limit < 1 || limit > 50) {
  throw new Error('Use timeout-ms=1000..60000 and limit=1..50');
}
const outputPath = resolve(option('output', 'docs/evidence/chatbot-latency/routing-preflight.json'));
const report = {
  capturedAt: new Date().toISOString(),
  target: base.origin,
  mode: 'admin-routing-preview-only',
  corpusSha256: createHash('sha256').update(corpusText).digest('hex'),
  packagePins: {},
  outcome: 'blocked',
  limitations: [
    'Admin diagnostic selection, not teacher-authenticated execution or authorization acceptance.',
    'Preview has separate implementation; its error fallback and transitive dependencies differ from the chat router.',
    'Durations include local HTTP and preview work; they are not chat, first-text, or pure routing latency.',
    'One observation per query is diagnostic smoke coverage, not an accuracy or p95 estimate.',
    'No chat-provider calls, record changes, tool indexing, semantic imports, or settings updates.',
  ],
  requests: [],
  fixtures: [],
  samples: [],
};
const rootPackage = await Bun.file('package.json').json();
for (const name of ['najm-rag', 'najm-chatbot', 'najm-mcp']) {
  report.packagePins[name] = rootPackage.dependencies[name];
}
const revision = Bun.spawnSync(['git', 'rev-parse', 'HEAD']);
report.gitHead = revision.exitCode === 0 ? revision.stdout.toString().trim() : null;
report.workingTreeDirty = Bun.spawnSync(['git', 'status', '--porcelain']).stdout.length > 0;

// Fixed allowlist prevents a fixture or CLI argument from selecting a write route.
const routes = new Map([
  ['/api/health/status', 'GET'],
  ['/api/auth/login', 'POST'],
  ['/api/chatbot-rag/status', 'GET'],
  ['/api/chatbot-rag/settings', 'GET'],
  ['/api/chatbot-rag/tools', 'GET'],
  ['/api/chatbot-rag/routing/preview', 'POST'],
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
      signal: AbortSignal.timeout(timeoutMs),
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

function safePreview(result, elapsedMs) {
  return {
    status: result.status,
    elapsedMs,
    finalTools: result.finalTools ?? [],
    matches: (result.matches ?? []).map(({ toolName, similarity, source }) => ({ toolName, similarity, source })),
    dependencies: result.dependencies ?? [],
    confirmationTools: (result.confirmations ?? []).map((item) => item.toolName),
    error: result.error ? /ECONNREFUSED|could not reach/i.test(result.error)
      ? 'embedding_unreachable' : 'router_error_details_omitted' : undefined,
  };
}

try {
  report.health = await request('/api/health/status');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required from the existing local environment');
  }
  const login = await request('/api/auth/login', {
    email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  token = login.accessToken ?? login.tokens?.accessToken;
  if (!token) throw new Error('Login did not return an access token');
  const status = await request('/api/chatbot-rag/status');
  report.index = {
    routingEnabled: status.routingEnabled,
    embeddingModel: status.embeddingModel,
    embeddingDimensions: status.embeddingDimensions,
    registeredToolCount: Number(status.registeredToolCount),
    indexedToolCount: Number(status.indexedToolCount),
    semanticPhraseCount: Number(status.semanticPhraseCount),
    indexingRunning: status.indexingRunning,
  };
  const settings = await request('/api/chatbot-rag/settings');
  report.settings = Object.fromEntries([
    'enableKnowledge', 'maxTools', 'topSemanticHits', 'similarityThreshold',
    'fallbackOnRouterError', 'fallbackOnNoMatch', 'allowedLangs', 'dependencies',
    'toolsOverride', 'contextOverride', 'source',
  ].map((key) => [key, settings[key]]));
  const tools = await request('/api/chatbot-rag/tools');
  if (!Array.isArray(tools)) throw new Error('Unexpected tool inventory response');
  report.inventory = tools.map(({ name, group, indexed, dependencies }) => ({ name, group, indexed, dependencies }));
  const names = new Set(tools.map((tool) => tool.name));
  report.fixtures = corpus.cases.map((item) => ({
    id: item.id,
    missingAlternativeNames: item.requiredToolGroups.flat().filter((name) => !names.has(name)),
    unavailableGroups: item.requiredToolGroups.filter((group) => !group.some((name) => names.has(name))),
  }));
  const diagnostic = await request('/api/chatbot-rag/routing/preview', { query: corpus.cases[0].query });
  report.diagnostic = safePreview(diagnostic, report.requests.at(-1).elapsedMs);
  const blockers = [];
  if (!status.routingEnabled || settings.toolsOverride === 'all' || settings.toolsOverride === 'none') {
    blockers.push('semantic_routing_not_active');
  }
  if (Number(status.indexedToolCount) === 0 && Number(status.semanticPhraseCount) === 0) blockers.push('empty_tool_index');
  if (diagnostic.status === 'router_error') blockers.push(report.diagnostic.error ?? 'router_error');
  if (report.fixtures.some((item) => item.unavailableGroups.length)) blockers.push('unavailable_fixture_tools');
  report.blockers = blockers;
  if (blockers.length === 0) {
    for (const item of corpus.cases.slice(0, limit)) {
      const result = await request('/api/chatbot-rag/routing/preview', { query: item.query });
      const sample = safePreview(result, report.requests.at(-1).elapsedMs);
      const selected = new Set(sample.finalTools);
      const missingGroups = item.requiredToolGroups.filter((group) => !group.some((name) => selected.has(name)));
      report.samples.push({
        id: item.id, language: item.language, query: item.query,
        ...sample, missingGroups,
        passed: result.status === 'routed' && missingGroups.length === 0,
      });
      if (result.status === 'router_error') {
        report.blockers.push('routing_failed_during_matrix');
        break;
      }
    }
    report.outcome = report.blockers.length ? 'blocked'
      : report.samples.every((item) => item.passed) ? 'smoke_pass' : 'routing_misses';
  }
} catch (error) {
  report.failure = error.message;
} finally {
  token = undefined;
  await Bun.write(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    outcome: report.outcome, report: outputPath,
    index: report.index, blockers: report.blockers, failure: report.failure,
    evaluated: report.samples.length,
    passed: report.samples.filter((item) => item.passed).length,
  }, null, 2));
}
process.exitCode = report.outcome === 'smoke_pass' ? 0 : report.outcome === 'blocked' ? 2 : 1;
