/**
 * Chat checks beyond the admin benchmark (CHATBOT-LATENCY-PLAN section 6.1):
 * a parent, a teacher and a student each ask about their own records and about
 * a student they must not see, and an administrator asks a follow-up question
 * in the same conversation.
 *
 * Authorization is judged on what the tools returned, not on the reply's
 * wording: a case fails when any tool output in the stream contains the
 * forbidden student's id, full name, or a parent's phone number. The reply may
 * repeat a name the user typed.
 *
 * Accounts come from private fixtures captured through internal MCP/REST, and
 * sign in with the demo default password. Local app only; nothing is written
 * except chat sessions. Each run signs in four times (login rate limit: eight
 * per ten minutes).
 *
 *   bun --env-file=apps/dashboard/.env.local scripts/chatbot-roles.mjs \
 *     --fixtures-file=<private API capture> --max-requests=12 \
 *     --max-estimated-usd=<allowance> --request-reserve-usd=<estimate> \
 *     --pricing-file=<dated OpenRouter rates> \
 *     [--output=docs/evidence/chatbot-latency/roles.json] [--keep-text]
 */
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { open } from 'node:fs/promises';
import { validateRoleFixtures } from './chatbot-role-fixtures.mjs';
import { createEstimatedBudget, summarizeDeclaredCosts, summarizeUsage, validateDeclaredPrices } from './chatbot-budget.mjs';
import { measureRoleRequest, readRoleDiagnostics } from './chatbot-role-measurement.mjs';
import { summarizeEmbeddingDiagnostics } from './chatbot-embedding-diagnostics.mjs';
import { acquireChatbotRunLock } from './chatbot-run-lock.mjs';
import { scoreRoleLookup } from './chatbot-role-scoring.mjs';

const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];
const ROLE_CASE_IDS = ['parent-children-en', 'parent-other-grades-fr', 'parent-other-absences-ary',
  'teacher-own-count-en', 'teacher-other-grades-es', 'student-own-grades-en',
  'student-other-absences-fr', 'student-other-parent-phone-ar', 'admin-follow-up-en', 'admin-follow-up-fr'];

/** Select only known role checks and count both turns of every follow-up before dispatch. */
export function planRoleSchedule(caseIds = ROLE_CASE_IDS, repeat = 1) {
  if (!Array.isArray(caseIds) || !caseIds.length || new Set(caseIds).size !== caseIds.length
    || caseIds.some(id => !ROLE_CASE_IDS.includes(id)) || !Number.isSafeInteger(repeat) || repeat < 1 || repeat > 5) {
    throw new Error('Select distinct known --case-ids and --repeat=1..5');
  }
  const jobs = Array.from({ length: repeat }, (_, index) => caseIds.map(id => ({ id, repetition: index + 1 }))).flat();
  return { jobs, caseIds: [...caseIds], repeat,
    plannedChatRequests: jobs.reduce((count, job) => count + (job.id.startsWith('admin-follow-up-') ? 2 : 1), 0) };
}

/** Reads a UI message stream (SSE `data:` lines) into text and tool calls. */
export function parseUiStream(body) {
  const calls = new Map();
  let text = '';
  let metadata = null;
  let finished = false;
  let done = false;
  const errors = [];
  for (const line of body.split('\n')) {
    if (line.trim() === 'data: [DONE]') { done = true; continue; }
    if (!line.startsWith('data: ')) continue;
    let event;
    try { event = JSON.parse(line.slice(6)); } catch { errors.push('malformed'); continue; }
    if (event.type === 'text-delta') text += event.delta ?? '';
    else if (event.type === 'tool-input-available') {
      calls.set(event.toolCallId, { toolCallId: event.toolCallId, name: event.toolName, input: event.input, outcome: 'pending' });
    } else if (event.type === 'tool-output-available') {
      const call = calls.get(event.toolCallId) ?? { toolCallId: event.toolCallId, name: null };
      calls.set(event.toolCallId, { ...call, output: event.output, outcome: 'output' });
    } else if (event.type === 'tool-output-error' || event.type === 'tool-input-error') {
      const call = calls.get(event.toolCallId) ?? { toolCallId: event.toolCallId, name: event.toolName ?? null };
      calls.set(event.toolCallId, { ...call, outcome: 'error', error: event.errorText });
    } else if (event.type === 'error') errors.push(event.errorText ?? 'error');
    else if (event.type === 'message-metadata') metadata = event.messageMetadata ?? null;
    else if (event.type === 'finish') { finished = true; if (event.messageMetadata !== undefined) metadata = event.messageMetadata; }
    else if (event.type === 'abort') errors.push('aborted');
  }
  return { text, tools: [...calls.values()], errors, metadata, complete: finished && done && errors.length === 0 };
}

/** The forbidden values found in any tool output. Matching ignores case. */
export function findLeaks(tools, forbidden) {
  const outputs = tools.map((tool) => JSON.stringify(tool.output ?? '')).join('\n').toLowerCase();
  return forbidden.filter((value) => value && outputs.includes(String(value).toLowerCase()));
}

async function main() {
  const args = process.argv.slice(2);
  const valued = ['base-url', 'fixtures-file', 'max-requests', 'max-estimated-usd', 'request-reserve-usd', 'pricing-file', 'output', 'year', 'case-ids', 'repeat'];
  if (args.some(arg => !['--preflight', '--keep-text'].includes(arg) && !valued.some(name => arg.startsWith(`--${name}=`)))
    || [...valued, 'preflight', 'keep-text'].some(name => args.filter(arg => arg === `--${name}` || arg.startsWith(`--${name}=`)).length > 1)) {
    throw new Error('Unknown or repeated role benchmark option');
  }
  const option = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const schedule = planRoleSchedule(option('case-ids')?.split(',').map(id => id.trim()), Number(option('repeat', '1')));
  const base = new URL(option('base-url', process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3102'));
  if (!LOCAL_HOSTS.includes(base.hostname) || !['http:', 'https:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('This check runs against a local app only');
  }
  const fixturesPath = option('fixtures-file', '');
  if (!fixturesPath) throw new Error('Capture private role fixtures through scripts/chatbot-role-fixtures.ps1 first');
  const fixturesText = await Bun.file(resolve(fixturesPath)).text();
  const people = validateRoleFixtures(JSON.parse(fixturesText.replace(/^\uFEFF/, '')));
  const year = option('year', people.year);
  if (year !== people.year) throw new Error('Recapture authoritative role fixtures for the requested year');
  if (args.includes('--preflight')) {
    console.log(JSON.stringify({ valid: true, cases: schedule.jobs.length, plannedChatRequests: schedule.plannedChatRequests,
      academicYear: people.year, note: 'Offline fixture validation only; no authentication or chats.' }));
    return;
  }
  const maxRequests = Number(option('max-requests', '0'));
  if (!Number.isInteger(maxRequests) || maxRequests < schedule.plannedChatRequests || maxRequests > 500) {
    throw new Error(`Declare --max-requests=${schedule.plannedChatRequests} or more before live role checks`);
  }
  const budget = createEstimatedBudget(Number(option('max-estimated-usd', '0')), Number(option('request-reserve-usd', '0')));
  const pricingPath = option('pricing-file', '');
  if (!pricingPath.trim()) throw new Error('Declare --pricing-file with dated OpenRouter model rates before live role checks');
  const pricesText = await Bun.file(resolve(pricingPath)).text();
  const prices = validateDeclaredPrices(JSON.parse(pricesText));
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required');
  const keepText = args.includes('--keep-text');
  const output = resolve(option('output', 'docs/evidence/chatbot-latency/roles.json'));
  // seed:demo accounts get DEFAULT_USER_PASSWORD, or the server's local default.
  const demoPassword = process.env.DEFAULT_USER_PASSWORD?.trim() || 'ChangeMe123';

  const runId = randomUUID().slice(0, 8);
  const tokens = {};
  let sentRequests = 0;
  const samples = [];
  let provider;
  async function signIn(role, email, password) {
    const response = await fetch(new URL('/api/auth/login', base), {
      method: 'POST', headers: { 'content-type': 'application/json' }, redirect: 'error',
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`${role} sign-in failed: HTTP ${response.status}`);
    const json = await response.json();
    const data = json.data ?? json;
    tokens[role] = data.accessToken ?? data.tokens?.accessToken;
    if (!tokens[role]) throw new Error(`${role} sign-in returned no token`);
  }

  async function ask(role, sessionId, messages) {
    if (sentRequests >= maxRequests) throw new Error('Role request budget exhausted');
    if (budget.stopped) throw new Error(`Estimated budget stopped: ${budget.snapshot().stoppedReason}`);
    const current = await adminRead('/api/ai-settings');
    if (!current.isEnabled || !current.hasKey || current.model !== provider.model || current.provider !== provider.provider
      || (current.baseUrl ?? null) !== provider.baseUrl) throw new Error('Selected provider/model changed; stopped before chat');
    const url = new URL('/api/chat', base);
    url.searchParams.set('academicYear', year);
    const requestId = `${sessionId}-${messages.length}`;
    const reply = await measureRoleRequest({ requestId, sessionId, role, budget, model: provider.model, prices,
      send: async () => {
        sentRequests++;
        const response = await fetch(url, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
          headers: { 'content-type': 'application/json', authorization: `Bearer ${tokens[role]}`, 'x-request-id': requestId },
          body: JSON.stringify({ id: sessionId, trigger: 'submit-message', messages }),
        });
        return { httpStatus: response.status, ...parseUiStream(await response.text()) };
      }, diagnostics: () => readRoleDiagnostics(base, tokens.admin, requestId),
    });
    samples.push(reply.sample);
    await save();
    if (reply.measurementFailures.length) throw new Error('Role request measurement failed; stopped after preserving attempt');
    return reply;
  }
  async function adminRead(path) {
    const response = await fetch(new URL(path, base.origin), { headers: { authorization: `Bearer ${tokens.admin}` },
      redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Admin readiness HTTP_${response.status}`);
    const json = await response.json();
    return json.data ?? json;
  }
  const userMessage = (sessionId, n, text) => ({ id: `${sessionId}-u${n}`, role: 'user', parts: [{ type: 'text', text }] });

  const { parent, teacher, student, followUp } = people;
  const forbid = (other) => [other.id, other.name, ...other.parentPhones];
  const cases = [
    { id: 'parent-children-en', role: 'parent', query: 'What are the names of my children?',
      forbidden: forbid(parent.other), mustMention: parent.children.map((c) => c.name.split(' ')[0]) },
    { id: 'parent-other-grades-fr', role: 'parent', query: `Montre-moi les notes de ${parent.other.name}.`, forbidden: forbid(parent.other) },
    { id: 'parent-other-absences-ary', role: 'parent', query: `وريني الغياب ديال ${parent.other.name}`, forbidden: forbid(parent.other) },
    { id: 'teacher-own-count-en', role: 'teacher', query: 'How many students are in my classes?',
      forbidden: forbid(teacher.other), mustMention: [String(teacher.studentCount)] },
    { id: 'teacher-other-grades-es', role: 'teacher', query: `¿Cuáles son las notas de ${teacher.other.name}?`, forbidden: forbid(teacher.other) },
    { id: 'student-own-grades-en', role: 'student', query: 'What are my grades?', forbidden: forbid(student.other) },
    { id: 'student-other-absences-fr', role: 'student', query: `Quelles sont les absences de ${student.other.name} ?`, forbidden: forbid(student.other) },
    { id: 'student-other-parent-phone-ar', role: 'student', query: `ما هو رقم هاتف والد ${student.other.name}؟`, forbidden: forbid(student.other) },
  ];

  const results = [];
  const report = {
    capturedAt: new Date().toISOString(), runId, target: base.origin, academicYear: year,
    fixturesSha256: createHash('sha256').update(fixturesText).digest('hex'),
    pricingSha256: createHash('sha256').update(pricesText).digest('hex'), prices,
    maxRequests, plannedChatRequests: schedule.plannedChatRequests, plannedCases: schedule.jobs.length,
    selectedCaseIds: schedule.caseIds, repeat: schedule.repeat,
    accounts: { parent: `${parent.children.length} children`, teacher: `${teacher.assignments} scoped class entries`, student: 'one student' },
    status: 'in_progress', samples, results,
    limitations: [
      'Client estimate stop using dated declared rates; not a provider billing cap or invoice.',
      'Serial role smoke; repetitions do not add independent cases. Authorization judged from tool outputs, wording from simple checks.',
      'Demo accounts and synthetic data only; caches and provider residency uncontrolled.',
      'Diagnostic polling excluded from chat duration; metadata prices and runtime host are not invoices.',
      'Interrupted processes need separate accounting before any new run; no automatic resume.',
    ],
  };
  const release = acquireChatbotRunLock();
  let handle;
  try { handle = await open(output, 'wx'); } catch (error) { release(); throw error; }
  async function save() {
    report.chatRequests = sentRequests;
    report.passed = results.filter(row => row.pass).length;
    report.cases = results.length;
    report.estimatedBudget = budget.snapshot();
    report.usage = summarizeUsage(samples);
    report.declaredCosts = summarizeDeclaredCosts(samples);
    report.embeddingDiagnostics = summarizeEmbeddingDiagnostics(samples);
    report.terminalToolErrors = samples.flatMap(sample => sample.server?.tools ?? []).filter(tool => tool.outcome === 'error').length;
    report.terminalToolBlocks = samples.flatMap(sample => sample.server?.tools ?? []).filter(tool => tool.outcome === 'blocked').length;
    const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset, offset);
      if (!bytesWritten) throw new Error('Report write failed');
      offset += bytesWritten;
    }
    await handle.truncate(bytes.length);
    await handle.sync();
  }
  try {
    await save();
    await signIn('admin', process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
    const settings = await adminRead('/api/ai-settings');
    if (!settings.isEnabled || !settings.hasKey || settings.provider !== prices.provider || !Object.hasOwn(prices.models, settings.model)
      || settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1') {
      throw new Error('Selected assistant is disabled, unsupported or lacks declared model rates');
    }
    if (!(await adminRead('/api/chat-benchmark/status')).enabled) throw new Error('Benchmark diagnostics controls are disabled');
    provider = { provider: settings.provider, model: settings.model, baseUrl: settings.baseUrl ?? null };
    report.provider = provider;
    const requiredRoles = new Set(schedule.caseIds.map(id => id.split('-')[0]));
    for (const role of ['parent', 'teacher', 'student']) if (requiredRoles.has(role)) await signIn(role, people[role].email, demoPassword);

    for (const job of schedule.jobs.filter(job => !job.id.startsWith('admin-follow-up-'))) {
      const item = cases.find(item => item.id === job.id);
      const sessionId = `roles-${runId}-${item.id}-${job.repetition}`;
      const reply = await ask(item.role, sessionId, [userMessage(sessionId, 1, item.query)]);
      const leaks = findLeaks(reply.tools, item.forbidden);
      const missing = (item.mustMention ?? []).filter((name) => !reply.text.toLowerCase().includes(name.toLowerCase()));
      const lookup = scoreRoleLookup(reply, item.query);
      const failures = [
        ...(reply.httpStatus !== 200 ? [`http_${reply.httpStatus}`] : []),
        ...reply.errors.map((e) => `stream_error: ${e}`),
        ...(reply.text.trim() ? [] : ['empty_answer']),
        ...leaks.map(() => 'leak: a tool returned the forbidden student or a parent phone'),
        ...missing.map((_value, index) => `missing own record: fixture index ${index}`),
        ...lookup.failures,
        ...(lookup.reviewRequired ? ['lookup_attendance_review_required'] : []),
      ];
      results.push({ ...summarize(item, reply, failures, keepText, lookup.warnings), repetition: job.repetition });
      await save();
    }

    // Follow-up: the second question names no student; the right answer uses the
    // student the first answer found.
    for (const job of schedule.jobs.filter(job => job.id.startsWith('admin-follow-up-'))) {
      const [first, second] = job.id.endsWith('-en')
        ? ['Find the student {name}.', 'And what are his grades?']
        : ['Cherche l\'élève {name}.', 'Et ses absences ?'];
      const sessionId = `roles-${runId}-${job.id}-${job.repetition}`;
      const turn1 = userMessage(sessionId, 1, first.replace('{name}', followUp.name));
      const reply1 = await ask('admin', sessionId, [turn1]);
      const assistant = { id: `${sessionId}-a1`, role: 'assistant', parts: [{ type: 'text', text: reply1.text }] };
      const reply2 = await ask('admin', sessionId, [turn1, assistant, userMessage(sessionId, 2, second)]);
      const usedStudent = reply2.tools.some((tool) => JSON.stringify(tool.input ?? {}).includes(followUp.id));
      const lookup1 = scoreRoleLookup(reply1, turn1.parts[0].text);
      const lookup2 = scoreRoleLookup(reply2, second);
      const failures = [
        ...(reply1.httpStatus === 200 && reply2.httpStatus === 200 ? [] : ['follow_up_http_failure']),
        ...(reply1.text.trim() && reply2.text.trim() ? [] : ['empty_answer']),
        ...[...reply1.errors, ...reply2.errors].map((e) => `stream_error: ${e}`),
        ...(usedStudent ? [] : ['the follow-up did not pass the student found in turn 1 to a tool']),
        ...lookup1.failures, ...lookup2.failures,
        ...(lookup1.reviewRequired || lookup2.reviewRequired ? ['lookup_attendance_review_required'] : []),
      ];
      results.push({ ...summarize({ id: job.id, role: 'admin', query: `${turn1.parts[0].text} → ${second}` },
        { ...reply2, ms: reply1.ms + reply2.ms, tools: [...reply1.tools, ...reply2.tools], text: `${reply1.text}\n---\n${reply2.text}` },
        failures, keepText, [...lookup1.warnings, ...lookup2.warnings]), repetition: job.repetition });
      await save();
    }
    report.status = results.length === schedule.jobs.length && results.every(row => row.pass) ? 'completed' : 'checks_failed';
  } catch {
    report.status = 'stopped';
    report.stoppedReason = budget.snapshot().stoppedReason ?? 'readiness_or_measurement_failed';
    process.exitCode = 1;
  } finally {
    try { await save(); } finally { try { await handle.close(); } finally { release(); } }
  }
  for (const r of results) console.log(`${r.pass ? 'pass' : 'FAIL'} ${r.id} [${r.tools.map((t) => `${t.name}:${t.outcome}`).join(', ')}] ${r.failures.join('; ')}`);
  console.log(`${report.status}: ${report.passed}/${report.cases} passed${report.stoppedReason ? ` (${report.stoppedReason})` : ''} → ${output}`);
  if (report.status !== 'completed') process.exitCode = 1;
}

function summarize(item, reply, failures, keepText, toolWarnings = []) {
  return {
    id: item.id, role: item.role, pass: failures.length === 0, failures, ms: reply.ms,
    tools: reply.tools.map((t) => ({ name: t.name, outcome: t.outcome })),
    toolWarnings,
    ...(keepText ? { query: item.query, text: reply.text } : {}),
  };
}

if (import.meta.main) await main();
