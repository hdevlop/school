import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { ChatAgent, type ReplyPreparationRequest } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { McpBuilderService, McpRegistryService, TOOL_PROVIDER } from 'najm-mcp';
import { CORRELATION_ID, USER, getRoutes } from '../../src/najm';
import { getGuardMetadata } from 'najm-guard';
import { JevIntentClassifier } from '../../src/modules/chat/jev/JevIntentClassifier';
import { JevAttemptLedger } from '../../src/modules/chat/benchmark/JevAttemptLedger';
import { JevSessionGrants } from '../../src/modules/chat/benchmark/JevSessionGrants';
import { schoolJevRequestContext, type JevRequestContext } from '../../src/modules/chat/jev/JevRequestContext';
import { effectiveJevMode, setBenchmarkJevMode, readJevControls } from '../../src/modules/chat/jev/JevControls';
import { jevPreparationPolicy } from '../../src/modules/chat/jev/jevPreparationPolicy';
import { jevReplyPlan } from '../../src/modules/chat/jev/jevReplyPlan';
import { INTENT_NAMES, JEV_MODEL, type JevIntent } from '../../src/modules/chat/jev/jevIntents';
import { JevBenchmarkController } from '../../src/modules/chat/benchmark/JevBenchmarkController';
import { jevModeDto, jevSessionDto } from '../../src/modules/chat/benchmark/JevBenchmarkDto';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolReplyTemplate } from '../../src/modules/chat/replies/schoolReplyTemplates';
import { schoolChatYearContext } from '../../src/modules/chat/context/SchoolChatContextProvider';
import { jevSyntheticCases } from '../../src/modules/chat/benchmark/jevSyntheticCases';
import { schoolOpenRouterProvider } from '../../src/modules/chat/routing/schoolOpenRouterProvider';
import { jevDarijaCases } from '../../src/modules/chat/benchmark/jevDarijaCases';
import { hasGuardedJevReply, queryVetoV6 } from '../../src/modules/chat/jev/jevQueryGuard';
import { ChatDiagnosticsLog } from '../../src/modules/chat/diagnostics/ChatDiagnosticsLog';

test('reviewed Darija catalog grants exact text on the router-first arm', () => {
  const grants = new JevSessionGrants();
  expect(jevDarijaCases).toHaveLength(100);
  const sample = jevDarijaCases.find(item => item.language === 'ary-latn')!;
  const grant = grants.issue('actor', '2026-2027', sample.id, '20b-coreweave-router-first');
  expect(grant.query).toBe(sample.query);
  expect(grants.consume(grant.sessionKey, 'actor', '2026-2027',
    [{ role: 'user', content: sample.query }])?.experimentArm).toBe('20b-coreweave-router-first');
  expect(grants.consume(grant.sessionKey, 'actor', '2026-2027',
    [{ role: 'user', content: sample.query }])).toBeNull();
});

test('router-first policy and CoreWeave pin require the consumed fixture frame', () => {
  process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
  schoolJevRequestContext.run({ actorId: 'actor', role: 'admin', academicYear: '2026-2027',
    mode: 'on', correlationId: null, caseId: 'jev-operator-q01', query: 'salam',
    historyComplete: true, priorUserTurns: 0, experimentArm: '20b-coreweave-router-first' }, () => {
    expect(jevPreparationPolicy().strategy).toBe('router-first');
    expect(schoolOpenRouterProvider().only).toEqual(['coreweave']);
    process.env.NODE_ENV = 'production';
    expect(jevPreparationPolicy().strategy).toBe('parallel');
  });
});

const names = ['DB_URL', 'NODE_ENV', 'CHATBOT_BENCHMARK_CONTROLS', 'CHATBOT_JEV_MODE', 'CHATBOT_JEV_MAX_REQUESTS',
  'CHATBOT_JEV_MAX_COST_USD', 'CHATBOT_JEV_TIMEOUT_MS', 'CHATBOT_JEV_THRESHOLD', 'CHATBOT_JEV_UNKNOWN_RESERVE_USD',
  'CHATBOT_JEV_BILLING_MODE', 'CHATBOT_JEV_BILLING_TIMEOUT_MS', 'CHATBOT_JEV_EXPERIMENT'];
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
beforeEach(() => {
  process.env.DB_URL = 'postgres://localhost/school_history_test';
  process.env.NODE_ENV = 'test'; process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
  process.env.CHATBOT_JEV_MAX_REQUESTS = '10'; process.env.CHATBOT_JEV_MAX_COST_USD = '0.01';
  process.env.CHATBOT_JEV_TIMEOUT_MS = '800'; process.env.CHATBOT_JEV_THRESHOLD = '0.8';
  setBenchmarkJevMode('on');
  process.env.CHATBOT_JEV_BILLING_MODE = 'abort';
  delete process.env.CHATBOT_JEV_EXPERIMENT;
});
afterEach(() => {
  for (const name of names) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  setBenchmarkJevMode('off');
});
const query = jevSyntheticCases.find(item => item.id === 'fr-student')!.query;
const request = (changes: Partial<ReplyPreparationRequest> = {}): ReplyPreparationRequest => ({
  userText: query, language: 'fr', channel: 'web', userId: 'actor',
  historyComplete: true, priorUserTurns: 0, signal: new AbortController().signal, ...changes,
});
function response(choice: JevIntent = 'student_count', cost = 0.00004) {
  return { model: JEV_MODEL, id: 'provider-1', usage: { input_tokens: 40, cost }, answers: {
    intent: { type: 'choice', choice, confidence: 0.93, probabilities: Object.fromEntries(INTENT_NAMES.map(name =>
      [name, name === choice ? 0.93 : name === (choice === 'needs_llm' ? 'student_count' : 'needs_llm') ? 0.07 : 0])) },
    is_write: { type: 'noul', noul: choice === 'write_request' ? 0.99 : 0.01 },
  } };
}
function classifier() {
  const settings = { getInternal: mock(async () => ({ provider: 'openrouter', apiKey: 'private-test-key', baseUrl: null })) };
  const instance = new JevIntentClassifier(settings as any);
  instance.transport = mock(async () => Response.json(response())) as any;
  return { instance, settings };
}
function frame(instance: JevIntentClassifier, changes: Partial<JevRequestContext> = {}): JevRequestContext {
  return { actorId: 'actor', role: 'admin', academicYear: '2026-2027', mode: 'on',
    correlationId: 'chat-request', caseId: 'fr-student', query, historyComplete: true, priorUserTurns: 0,
    eligible: input => instance.eligible(input), prepare: input => instance.prepare(input), onSelection: instance.onSelection, ...changes };
}
const run = <T>(instance: JevIntentClassifier, work: () => T, changes: Partial<JevRequestContext> = {}) =>
  schoolJevRequestContext.run(frame(instance, changes), work);

describe('Jev eligibility and privacy boundary', () => {
  test.each(['وريني نقط بنتي فهاد العام.', 'ch7al mn tilmid f l9ism lkhamis bo7do?',
    'chno ndir daba m3a hadok?', 'zid tilmid jdid daba'])('unsupported query %s bypasses settings, transport and the paid ledger', async userText => {
    const { instance, settings } = classifier();
    await run(instance, async () => {
      expect(instance.eligible(request({ userText, language: 'ary' }))).toBe(false);
      expect(await instance.prepare(request({ userText, language: 'ary' }))).toBeNull();
      expect(schoolJevRequestContext.getStore()?.diagnostics).toEqual({ eligibility: 'unsupported_query', classification: 'not_started' });
    }, { query: userText });
    expect(settings.getInternal).not.toHaveBeenCalled();
    expect(instance.transport).not.toHaveBeenCalled();
    expect(instance.ledger.snapshot().requests).toBe(0);
    expect(instance.ledger.recent()).toEqual([]);
  });
  test('shadow retains unsupported-query measurement without returning a plan', async () => {
    const userText = 'وريني نقط بنتي فهاد العام.';
    setBenchmarkJevMode('shadow');
    const { instance } = classifier();
    instance.transport = mock(async () => Response.json(response('needs_llm'))) as any;
    await run(instance, async () => {
      expect(instance.eligible(request({ userText, language: 'ary' }))).toBe(true);
      expect(await instance.prepare(request({ userText, language: 'ary' }))).toBeNull();
      expect(schoolJevRequestContext.getStore()?.diagnostics).toEqual({ eligibility: 'shadow_unfiltered', classification: 'declined' });
    }, { query: userText, mode: 'shadow' });
    expect(instance.transport).toHaveBeenCalledTimes(1);
    expect(instance.ledger.recent()[0]).toMatchObject({ reason: 'shadow_only', costUsd: 0.00004 });
  });
  test('all eight frozen direct Jev observations remain eligible and retain their guarded plan', async () => {
    const measured = await Bun.file('docs/evidence/chatbot-latency/darija-combinations-results-20261009.json').json();
    const selected = measured.rows.filter((row: { jevSelected: boolean }) => row.jevSelected);
    expect(selected).toHaveLength(8);
    for (const row of selected) {
      const { instance } = classifier();
      const choice = row.replyLabel.slice(4) as JevIntent;
      instance.transport = mock(async () => Response.json(response(choice))) as any;
      const input = request({ userText: row.query, language: schoolReplyLanguage(row.query) });
      expect(await run(instance, () => instance.prepare(input), { query: row.query })).toMatchObject({ label: row.replyLabel });
      expect(instance.transport).toHaveBeenCalledTimes(1);
    }
  });
  test('the reviewed corpus keeps every positively guarded non-write candidate reachable', () => {
    let supported = 0;
    for (const item of jevDarijaCases) {
      if (item.intent === 'write_request' || item.intent === 'needs_llm' || queryVetoV6(item.query, item.intent) !== null) continue;
      supported++;
      expect(hasGuardedJevReply(item.query)).toBe(true);
    }
    expect(supported).toBeGreaterThan(0);
    // Eligibility remains only a negative filter: the classifier's answer still decides.
    expect(hasGuardedJevReply('salam')).toBe(true);
  });
  test('a positive prefilter does not replace classifier acceptance', async () => {
    const { instance } = classifier();
    instance.transport = mock(async () => Response.json(response('needs_llm'))) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'declined', choice: 'needs_llm' });
  });
  test('off sends nothing while the published contract still admits synchronous local replies', async () => {
    setBenchmarkJevMode('off');
    const { instance, settings } = classifier();
    expect(jevPreparationPolicy().enabled).toBe(true);
    expect(jevPreparationPolicy().eligible(request())).toBe(false);
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(settings.getInternal).not.toHaveBeenCalled();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test.each(['teacher', 'parent', 'student', 'accounting', 'custom'])('role %s is ineligible even with a grant', async role => {
    const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request()), { role })).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test.each([{ userId: 'someone-else' }, { historyComplete: false }, { priorUserTurns: 1 },
    { priorUserTurns: null }, { language: null }, { language: 'en' as any }, { language: 'es' as any },
    { channel: 'whatsapp' }, { userText: 'a different real question' }])('declines untrusted/ineligible metadata %j', async changes => {
    const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request(changes)))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('missing scope is unknown, not a first turn inferred from the request', async () => {
    const { instance } = classifier();
    expect(await instance.prepare(request())).toBeNull();
    expect(jevPreparationPolicy().resolveContext!(request())).toEqual({ historyComplete: false, priorUserTurns: null });
  });
  test.each([['production', 'true'], ['test', 'false']])('benchmark-only mode stays off for %s/%s', async (environment, controls) => {
    process.env.NODE_ENV = environment; process.env.CHATBOT_BENCHMARK_CONTROLS = controls;
    const { instance } = classifier();
    expect(effectiveJevMode()).toBe('off');
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('uses only the selected canonical OpenRouter key, sends deny and no history', async () => {
    const { instance } = classifier();
    const plan = await run(instance, () => instance.prepare(request()));
    expect(plan).toMatchObject({ label: 'jev:student_count', calls: [{ name: 'students_get_student_count', input: { academicYear: '2026-2027' } }] });
    const [, init] = (instance.transport as any).mock.calls[0];
    expect(init.redirect).toBe('error');
    expect(init.headers.authorization).toBe('Bearer private-test-key');
    expect(JSON.parse(init.body)).toMatchObject({ state: query, provider: { data_collection: 'deny' } });
    const ledger = instance.ledger.recent();
    expect(ledger[0]).toMatchObject({ costUsd: 0.00004, providerRequestId: 'provider-1', outcome: 'candidate' });
    expect(JSON.stringify(ledger)).not.toContain(query);
    expect(JSON.stringify(ledger)).not.toContain('private-test-key');
  });
  test('noncanonical provider settings never send the selected credential', async () => {
    const { instance, settings } = classifier();
    settings.getInternal.mockResolvedValue({ provider: 'openrouter', apiKey: 'private-test-key', baseUrl: 'https://other.invalid' });
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('shadow records a paid decision but returns no plan', async () => {
    setBenchmarkJevMode('shadow'); const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request()), { mode: 'shadow' })).toBeNull();
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'candidate', reason: 'shadow_only', costUsd: 0.00004 });
  });
});

describe('server-issued first-turn grants', () => {
  test('the grant binds actor, year and exact synthetic case, and works only once', () => {
    const grants = new JevSessionGrants(); const grant = grants.issue('actor', '2026-2027', 'fr-student');
    const messages = [{ role: 'user', content: grant.query }];
    expect(grants.consume(grant.sessionKey, 'other', '2026-2027', messages)).toBeNull();
    expect(grants.consume(grant.sessionKey, 'actor', '2025-2026', messages)).toBeNull();
    expect(grants.consume(grant.sessionKey, 'actor', '2026-2027', messages)).toMatchObject({ historyComplete: true, priorUserTurns: 0 });
    expect(grants.consume(grant.sessionKey, 'actor', '2026-2027', messages)).toBeNull();
    expect(grants.consume('client-asserted-session', 'actor', '2026-2027', messages)).toBeNull();
  });
  test.each([[{ role: 'user', content: 'Real private student name' }],
    [{ role: 'system', content: query }, { role: 'user', content: query }],
    [{ role: 'user', parts: [{ type: 'text', text: query }, { type: 'text', text: 'extra' }] }]])('rejects altered text/history and consumes the grant', messages => {
    const grants = new JevSessionGrants(); const grant = grants.issue('actor', '2026-2027', 'fr-student');
    expect(grants.consume(grant.sessionKey, 'actor', '2026-2027', messages)).toBeNull();
    expect(grants.consume(grant.sessionKey, 'actor', '2026-2027', [{ role: 'user', content: query }])).toBeNull();
  });
  test('the control DTO cannot authorize arbitrary questions, budgets or asserted history', () => {
    expect(jevSessionDto.safeParse({ caseId: 'fr-student' }).success).toBe(true);
    expect(jevSessionDto.safeParse({ caseId: 'unknown' }).success).toBe(false);
    expect(jevSessionDto.safeParse({ caseId: 'fr-student', historyComplete: true }).success).toBe(false);
    expect(jevModeDto.safeParse({ mode: 'on', maxRequests: 1000 }).success).toBe(false);
    expect(jevSessionDto.safeParse({ caseId: 'fr-student', experimentArm: '20b-coreweave-first' }).success).toBe(true);
    expect(jevSessionDto.safeParse({ caseId: 'fr-student', experimentArm: 'arbitrary-host' }).success).toBe(false);
  });
  test('experiment routing and strategy require the controlled context; normal and production keep defaults', () => {
    const { instance } = classifier();
    process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
    expect(schoolOpenRouterProvider()).toMatchObject({ order: ['cerebras'], allow_fallbacks: true });
    expect(jevPreparationPolicy().strategy).toBe('parallel');
    run(instance, () => {
      expect(schoolOpenRouterProvider()).toEqual({ only: ['coreweave'], allow_fallbacks: false, require_parameters: true });
      expect(jevPreparationPolicy().strategy).toBe('candidate-first');
      process.env.NODE_ENV = 'production';
      expect(schoolOpenRouterProvider()).toMatchObject({ order: ['cerebras'] });
      expect(jevPreparationPolicy().strategy).toBe('parallel');
    }, { experimentArm: '20b-coreweave-first' });
  });
  test('every control declares sign-in and the administrator role; grant setup excludes principal', () => {
    const methods = getRoutes(JevBenchmarkController).map(route => route.methodName);
    expect(methods.sort()).toEqual(['attempts', 'fixtureReads', 'mode', 'session', 'status']);
    for (const method of methods) {
      const guards = getGuardMetadata(JevBenchmarkController, method);
      expect(guards.some(guard => guard.guardClass.name === 'AuthGuard')).toBe(true);
      expect(guards.find(guard => guard.guardClass.name === 'RoleGuard')?.params).toEqual(method === 'fixtureReads' ? 'admin' : ['principal', 'admin']);
    }
  });
});

describe('billing, errors and cancellation', () => {
  test('zero-default request budget sends no paid request', async () => {
    delete process.env.CHATBOT_JEV_MAX_REQUESTS; delete process.env.CHATBOT_JEV_MAX_COST_USD;
    const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('missing cost halts subsequent attempts and retains the unknown reserve', async () => {
    const { instance } = classifier(); const body: any = response(); delete body.usage.cost;
    instance.transport = mock(async () => Response.json(body)) as any;
    await run(instance, () => instance.prepare(request()));
    await run(instance, () => instance.prepare(request()));
    expect(instance.transport).toHaveBeenCalledTimes(1);
    expect(instance.ledger.snapshot()).toMatchObject({ unknownCosts: 1, reservedUsd: 0.00015, stoppedReason: 'unknown_cost' });
  });
  test('malformed decisions still retain a known bill', async () => {
    const { instance } = classifier(); const body = response(); body.answers.intent.confidence = 1.5;
    instance.transport = mock(async () => Response.json(body)) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.ledger.recent()[0]).toMatchObject({ costUsd: 0.00004, outcome: 'error' });
  });
  test('provider rejection under deny is recorded without retry or weaker policy', async () => {
    const { instance } = classifier(); instance.transport = mock(async () => Response.json({ error: 'denied' }, { status: 403 })) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.transport).toHaveBeenCalledTimes(1);
    expect(instance.ledger.snapshot().unknownCosts).toBe(1);
  });
  test('request/deadline aborts retain unknown cost instead of free success', async () => {
    process.env.CHATBOT_JEV_TIMEOUT_MS = '5'; const { instance } = classifier();
    instance.transport = mock((_input: any, init: any) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('abort')), { once: true });
    })) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'aborted', costUsd: null });
    expect(instance.ledger.snapshot().stoppedReason).toBe('unknown_cost');
  });
  test('reservations close a concurrent spending race before dispatch', () => {
    const ledger = new JevAttemptLedger({ maxRequests: 10, maxCostUsd: 0.00015, unknownReserveUsd: 0.00015 });
    expect(ledger.start({ correlationId: null, mode: 'on', caseId: 'fr-student' })).not.toBeNull();
    expect(ledger.start({ correlationId: null, mode: 'on', caseId: 'fr-student' })).toBeNull();
  });
  test.each(['NaN', 'Infinity', '-1', '1.5'])('invalid threshold %s fails configuration', value => {
    process.env.CHATBOT_JEV_THRESHOLD = value;
    expect(readJevControls).toThrow();
  });
});

describe('shared intent renderers', () => {
  test.each(['fr', 'ar', 'ary'] as const)('maps only guarded core intents in %s', language => {
    for (const intent of INTENT_NAMES) {
      const plan = jevReplyPlan(intent, language, '2025-2026');
      if (['upcoming_exams', 'needs_llm'].includes(intent)) expect(plan).toBeNull();
      else { expect(plan?.label).toBe(`jev:${intent}`); if (plan && 'calls' in plan) {
        expect(plan.calls.every(call => call.input.academicYear === '2025-2026')).toBe(true);
        expect(plan.calls.some(call => /create|update|delete|record|mark/u.test(call.name))).toBe(false);
      } }
    }
  });
  test('counts render actual validated MCP values and refuse invalid results', () => {
    const plan = jevReplyPlan('student_count', 'fr', '2026-2027')!;
    if (!('calls' in plan)) throw new Error('expected plan');
    expect(plan.render([{ count: 7 }])).toContain('7 élèves');
    expect(() => plan.render([{ count: -1 }])).toThrow();
    expect(() => plan.render([{ count: Infinity }])).toThrow();
  });
});

describe('published readiness integration', () => {
  function observation() {
    process.env.CHATBOT_JEV_BILLING_MODE = 'observe';
    process.env.CHATBOT_JEV_TIMEOUT_MS = '20'; process.env.CHATBOT_JEV_BILLING_TIMEOUT_MS = '150';
    const { instance } = classifier(); const lifetime = new AbortController();
    const scope = <T>(work: () => T) => run(instance, work, { requestSignal: lifetime.signal });
    return { instance, lifetime, scope };
  }
  test('router-first uses matching shortlisted tool without generation or a second routing call', async () => {
    process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
    const { instance } = classifier();
    const router = mock(async () => ({ status: 'routed', tools: [
      { name: 'students_get_student_count', annotations: { readOnlyHint: true } },
    ] }));
    const a = agent(instance, router);
    expect(await run(instance, () => a.value.runOnce(a.input),
      { experimentArm: '20b-coreweave-router-first' })).toContain('7 élèves');
    expect(router).toHaveBeenCalledTimes(1);
    expect(a.generation).not.toHaveBeenCalled();
    expect(a.reads).toHaveBeenCalledTimes(1);
    expect(a.events[0].replyPreparation.availableToolNames).toEqual(['students_get_student_count']);
  });
  test('router-first missing shortlisted tool falls back without executing Jev plan', async () => {
    process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
    const { instance } = classifier();
    const router = mock(async () => ({ status: 'routed', tools: [] }));
    const a = agent(instance, router);
    expect(await run(instance, () => a.value.runOnce(a.input),
      { experimentArm: '20b-coreweave-router-first' })).toBe('model fallback');
    expect(router).toHaveBeenCalledTimes(1);
    expect(a.reads).not.toHaveBeenCalled();
    expect(a.generation).toHaveBeenCalledTimes(1);
  });
  async function terminal(instance: JevIntentClassifier) {
    const end = performance.now() + 500;
    while (instance.ledger.snapshot().pendingRequests && performance.now() < end)
      await new Promise(resolve => setTimeout(resolve, 2));
    expect(instance.ledger.snapshot().pendingRequests).toBe(0);
  }
  function agent(instance: JevIntentClassifier, router: () => Promise<any>) {
    const diagnostics = new ChatDiagnosticsLog();
    const events: any[] = []; const reads = mock(async () => ({ content: [{ type: 'text', text: '{"count":7}' }] }));
    const value = new ChatAgent({ getInternal: async () => ({ isEnabled: true, provider: 'openrouter', model: 'test', useMemory: false }) } as any,
      {} as any, {} as any, { reply: { detectLanguage: schoolReplyLanguage, template: input => schoolReplyTemplate(input, schoolChatYearContext.getStore()?.academicYear),
        preparation: jevPreparationPolicy() }, chatLogging: { enabled: false, onDiagnostics: event => { events.push(event); diagnostics.record(event); } } }, {} as any);
    (value as any).container = { get(token: any) {
      if (token === USER) return { id: 'actor', role: 'admin' };
      if (token === CORRELATION_ID) return 'chat-request';
      if (token === TOOL_PROVIDER) return { findRelevantTools: router };
      if (token === McpRegistryService) return { tools: [{ name: 'students_get_student_count', annotations: { readOnlyHint: true } }] };
      if (token === McpBuilderService) return { invokeTool: reads };
      throw new Error('optional');
    } };
    const model = scriptedModel('model fallback'); const generation = mock(model.doGenerate.bind(model)); model.doGenerate = generation;
    (value as any).buildModel = () => model;
    const input = { messages: [{ role: 'user', parts: [{ type: 'text', text: query }] }] } as any;
    return { value, events, reads, generation, input, diagnostics };
  }
  test.each(['20b-coreweave-first', '20b-coreweave-router-first'] as const)('%s bypasses unsupported Jev work and invokes the existing router/model fallback once', async experimentArm => {
    process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
    const userText = 'وريني نقط بنتي فهاد العام.';
    const { instance, settings } = classifier();
    const router = mock(async () => ({ status: 'routed', tools: [] }));
    const a = agent(instance, router);
    a.input.messages[0].parts[0].text = userText;
    expect(await run(instance, () => a.value.runOnce(a.input), { query: userText, experimentArm })).toBe('model fallback');
    expect(router).toHaveBeenCalledTimes(1); expect(a.generation).toHaveBeenCalledTimes(1);
    expect(settings.getInternal).not.toHaveBeenCalled(); expect(instance.transport).not.toHaveBeenCalled();
    expect(a.reads).not.toHaveBeenCalled(); expect(instance.ledger.snapshot().requests).toBe(0);
    expect(a.diagnostics.find('chat-request')?.jev).toEqual({ eligibility: 'unsupported_query', classification: 'not_started' });
    expect(a.diagnostics.find('chat-request')?.steps).toHaveLength(1);
  });
  test('early candidate executes one read through the existing builder', async () => {
    const { instance } = classifier(); const a = agent(instance, () => new Promise(() => {}));
    expect(await run(instance, () => a.value.runOnce(a.input))).toContain('7 élèves');
    expect(a.reads).toHaveBeenCalledTimes(1); expect(a.generation).not.toHaveBeenCalled();
    expect(instance.ledger.recent()[0]).toMatchObject({ selected: 'template', costUsd: 0.00004 });
    expect(a.diagnostics.find('chat-request')?.jev).toEqual({ eligibility: 'supported_query', classification: 'candidate' });
    expect(a.diagnostics.find('chat-request')?.steps).toHaveLength(0);
  });
  test('candidate-first waits for a valid decision and uses the last budget slot without routing or generation', async () => {
    process.env.CHATBOT_JEV_EXPERIMENT = 'coreweave-first';
    process.env.CHATBOT_JEV_MAX_REQUESTS = '1';
    const { instance } = classifier();
    instance.transport = mock(async () => { await new Promise(resolve => setTimeout(resolve, 15)); return Response.json(response()); }) as any;
    const router = mock(async () => ({ status: 'routed', tools: [] }));
    const a = agent(instance, router);
    expect(await run(instance, () => a.value.runOnce(a.input), { experimentArm: '20b-coreweave-first' })).toContain('7 élèves');
    expect(router).not.toHaveBeenCalled(); expect(a.generation).not.toHaveBeenCalled(); expect(a.reads).toHaveBeenCalledTimes(1);
    expect(instance.ledger.snapshot()).toMatchObject({ requests: 1, stoppedReason: 'request_limit' });
    expect(instance.ledger.recent()[0]).toMatchObject({ selected: 'template', costUsd: 0.00004 });
  });
  test('ready fallback never waits for the hanging classifier; late costs stay separate', async () => {
    const { instance } = classifier(); let release!: (value: Response) => void;
    instance.transport = mock(() => new Promise(resolve => { release = resolve; })) as any;
    const a = agent(instance, async () => ({ status: 'routed', tools: [] }));
    expect(await run(instance, () => a.value.runOnce(a.input))).toBe('model fallback');
    expect(a.reads).not.toHaveBeenCalled();
    const terminal = JSON.stringify(a.events[0]);
    release(Response.json(response()));
    await new Promise(resolve => setTimeout(resolve, 5));
    expect(a.reads).not.toHaveBeenCalled(); expect(JSON.stringify(a.events[0])).toBe(terminal);
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'aborted', selected: 'ordinary', costUsd: 0.00004 });
  });
  test('synchronous refusal starts neither classifier nor routing', async () => {
    const { instance } = classifier(); const router = mock(() => new Promise<any>(() => {})); const a = agent(instance, router);
    a.input.messages[0].parts[0].text = 'Ajoute un élève nommé ZzJevDemo.';
    expect(await run(instance, () => a.value.runOnce(a.input))).toContain('Je ne peux pas');
    expect(instance.transport).not.toHaveBeenCalled(); expect(router).not.toHaveBeenCalled();
  });
  test('observer returns fallback before billing, then records cost and both provider identifiers without a late read', async () => {
    const { instance, scope } = observation(); let release!: (value: Response) => void; let network!: AbortSignal;
    instance.transport = mock((_url: unknown, init: RequestInit) => {
      network = init.signal!; return new Promise(resolve => { release = resolve; });
    }) as any;
    const a = agent(instance, async () => ({ status: 'routed', tools: [] }));
    expect(await scope(() => a.value.runOnce(a.input))).toBe('model fallback');
    expect(network.aborted).toBe(false);
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'pending', selected: 'ordinary' });
    expect(a.events[0].replyPreparation.elapsedMs).toBeLessThan(100);
    const saved = JSON.stringify(a.events);
    release(Response.json({ ...response(), id: 'gen-dec-owned' }, { headers: { 'x-request-id': 'req-owned' } }));
    await terminal(instance);
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'aborted', costUsd: 0.00004,
      costSource: 'decisions_response', providerRequestId: 'req-owned', providerGenerationId: 'gen-dec-owned',
      billingMode: 'observe', transportCompleted: true, selected: 'ordinary' });
    expect(instance.ledger.snapshot().unknownCosts).toBe(0);
    expect(a.reads).not.toHaveBeenCalled(); expect(JSON.stringify(a.events)).toBe(saved);
  });
  test('observer deadline rejects a late candidate while its known bill can settle', async () => {
    const { instance, scope } = observation(); let release!: (value: Response) => void;
    instance.transport = mock(() => new Promise(resolve => { release = resolve; })) as any;
    expect(await scope(() => instance.prepare(request()))).toBeNull();
    expect(instance.ledger.recent()[0].outcome).toBe('pending');
    release(Response.json(response())); await terminal(instance);
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'aborted', costUsd: 0.00004, transportCompleted: true });
  });
  test.each(['disconnect', 'off'])('observer stops network work on %s after ordinary selection', async reason => {
    const { instance, lifetime, scope } = observation(); let network!: AbortSignal;
    instance.transport = mock((_url: unknown, init: RequestInit) => { network = init.signal!; return new Promise(() => {}); }) as any;
    const a = agent(instance, async () => ({ status: 'routed', tools: [] }));
    await scope(() => a.value.runOnce(a.input));
    if (reason === 'disconnect') lifetime.abort(); else { setBenchmarkJevMode('off'); instance.cancelInFlight(); }
    await terminal(instance);
    expect(network.aborted).toBe(true); expect(a.reads).not.toHaveBeenCalled();
    expect(instance.ledger.snapshot()).toMatchObject({ unknownCosts: 1, reservedUsd: 0.00015, stoppedReason: 'unknown_cost' });
  });
  test('observer stops on a disconnect before any ordinary selection', async () => {
    const { instance, lifetime, scope } = observation(); let started!: () => void;
    const dispatched = new Promise<void>(resolve => { started = resolve; });
    instance.transport = mock(() => { started(); return new Promise(() => {}); }) as any;
    const pending = scope(() => instance.prepare(request())); await dispatched; lifetime.abort();
    expect(await pending).toBeNull(); await terminal(instance);
    expect(instance.ledger.recent()[0]).toMatchObject({ outcome: 'aborted', costUsd: null });
  });
  test('observer hard lifetime settles unknown even if the transport ignores abort', async () => {
    const { instance, scope } = observation();
    instance.transport = mock(() => new Promise(() => {})) as any;
    expect(await scope(() => instance.prepare(request()))).toBeNull(); await terminal(instance);
    expect(instance.transport).toHaveBeenCalledTimes(1);
    expect(instance.ledger.snapshot()).toMatchObject({ requests: 1, unknownCosts: 1, stoppedReason: 'unknown_cost' });
  });
  test('observer refuses missing HTTP lifetime and retains malformed-response known costs', async () => {
    const { instance, scope } = observation();
    expect(await run(instance, () => instance.prepare(request()))).toBeNull(); expect(instance.transport).not.toHaveBeenCalled();
    const bad = response(); bad.answers.intent.confidence = 1.5;
    instance.transport = mock(async () => Response.json(bad)) as any;
    expect(await scope(() => instance.prepare(request()))).toBeNull();
    expect(instance.ledger.recent()[0]).toMatchObject({ costUsd: 0.00004, outcome: 'error', transportCompleted: true });
  });
  test('observer remains bounded for an oversized response or a hanging response body', async () => {
    for (const response of [new Response('x'.repeat(65537)), new Response(new ReadableStream({ start() {} }))]) {
      const { instance, scope } = observation(); instance.transport = mock(async () => response) as any;
      expect(await scope(() => instance.prepare(request()))).toBeNull(); await terminal(instance);
      expect(instance.ledger.snapshot()).toMatchObject({ unknownCosts: 1, stoppedReason: 'unknown_cost' });
    }
  });
  test('observer may still select an early valid read once', async () => {
    const { instance, scope } = observation(); const a = agent(instance, () => new Promise(() => {}));
    expect(await scope(() => a.value.runOnce(a.input))).toContain('7 élèves');
    expect(a.reads).toHaveBeenCalledTimes(1); expect(a.generation).not.toHaveBeenCalled();
    expect(instance.ledger.recent()[0]).toMatchObject({ selected: 'template', outcome: 'candidate', costUsd: 0.00004 });
  });
  test('observer cannot use a billing lifetime shorter than candidate eligibility', () => {
    process.env.CHATBOT_JEV_BILLING_MODE = 'observe'; process.env.CHATBOT_JEV_BILLING_TIMEOUT_MS = '1';
    expect(readJevControls).toThrow();
  });
});
