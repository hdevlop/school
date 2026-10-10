import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, test, mock } from 'bun:test';
import { ChatAgent, type ReplyPreparationRequest } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { McpBuilderService, McpRegistryService, TOOL_PROVIDER } from 'najm-mcp';
import { JevIntentClassifier } from '../../src/modules/chat/jev/JevIntentClassifier';
import { schoolJevRequestContext, jevPreparationPolicy, type JevRequestContext } from '../../src/modules/chat/jev/JevRequestContext';
import { jevReplyPlan } from '../../src/modules/chat/jev/jevReplyPlan';
import { INTENT_NAMES, JEV_MODEL, type JevIntent } from '../../src/modules/chat/jev/jevIntents';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolWriteReply } from '../../src/modules/chat/replies/schoolReplyWrite';
import { schoolOpenRouterProvider } from '../../src/modules/chat/routing/schoolOpenRouterProvider';
import { ChatDiagnosticsLog } from '../../src/modules/chat/diagnostics/ChatDiagnosticsLog';

import { CORRELATION_ID, USER } from '../../src/najm';
import { effectiveJevMode, readJevControls } from '../../src/modules/chat/transport/schoolChatControls';
import { parseDecision, accepts } from '../../src/modules/chat/jev/jevDecision';

const names = ['CHATBOT_FLOW', 'CHATBOT_JEV_MODE', 'CHATBOT_JEV_THRESHOLD', 'CHATBOT_JEV_OPERATING_TIMEOUT_MS'];
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
beforeEach(() => {
  process.env.CHATBOT_FLOW = 'jev-router-20b'; process.env.CHATBOT_JEV_MODE = 'on';
  process.env.CHATBOT_JEV_THRESHOLD = '0.8'; process.env.CHATBOT_JEV_OPERATING_TIMEOUT_MS = '3000';
});
afterEach(() => {
  for (const name of names) if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
});
const query = 'Je voudrais connaître le nombre total d’élèves de notre école.';
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
  return { actorId: 'actor',  academicYear: '2026-2027', mode: 'on',
    correlationId: 'chat-request', query, historyComplete: true, priorUserTurns: 0,
    eligible: input => instance.eligible(input), prepare: input => instance.prepare(input), ...changes };
}
const run = <T>(instance: JevIntentClassifier, work: () => T, changes: Partial<JevRequestContext> = {}) =>
  schoolJevRequestContext.run(frame(instance, changes), work);


describe('production Jev boundary', () => {
  test.each(['وريني نقط بنتي فهاد العام.', 'ch7al mn tilmid f l9ism lkhamis bo7do?',
    'chno ndir daba m3a hadok?', 'zid tilmid jdid daba'])('unsupported query %s never dispatches classification', async userText => {
    const { instance, settings } = classifier();
    expect(await run(instance, () => instance.prepare(request({ userText, language: 'ary' })), { query: userText })).toBeNull();
    expect(settings.getInternal).not.toHaveBeenCalled(); expect(instance.transport).not.toHaveBeenCalled();
  });
  test.each([{ userId: 'someone-else' }, { historyComplete: false }, { priorUserTurns: 1 },
    { priorUserTurns: null }, { language: null }, { language: 'en' as any }, { channel: 'whatsapp' },
    { userText: 'different question' }])('declines ineligible metadata %j', async changes => {
    const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request(changes)))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('missing server context cannot establish a first turn', async () => {
    const { instance } = classifier();
    expect(await instance.prepare(request())).toBeNull();
    expect(jevPreparationPolicy().resolveContext!(request())).toEqual({ historyComplete: false, priorUserTurns: null });
  });
  test.each(['off', 'legacy'])('%s disables Jev while leaving local preparation enabled', async choice => {
    if (choice === 'off') process.env.CHATBOT_JEV_MODE = 'off'; else process.env.CHATBOT_FLOW = 'legacy';
    const { instance } = classifier();
    expect(effectiveJevMode()).toBe('off'); expect(jevPreparationPolicy().enabled).toBe(true);
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    expect(instance.transport).not.toHaveBeenCalled();
  });
  test('canonical provider receives only the question and fixed choices, with deny', async () => {
    const { instance } = classifier();
    expect(await run(instance, () => instance.prepare(request()))).toMatchObject({label:'jev:student_count',calls:[{name:'students_get_student_count',input:{academicYear:'2026-2027'}}]});
    const [, init] = (instance.transport as any).mock.calls[0];
    expect(init.redirect).toBe('error'); expect(init.headers.authorization).toBe('Bearer private-test-key');
    expect(JSON.parse(init.body)).toMatchObject({state:query,provider:{data_collection:'deny'}});
    expect(init.body).not.toContain('actor'); expect(init.body).not.toContain('2026-2027');
  });
  test('noncanonical provider cannot receive the key', async () => {
    const { instance, settings } = classifier();
    settings.getInternal.mockResolvedValue({provider:'openrouter',apiKey:'private-test-key',baseUrl:'https://other.invalid'});
    expect(await run(instance, () => instance.prepare(request()))).toBeNull(); expect(instance.transport).not.toHaveBeenCalled();
  });
  test.each(['needs_llm','write_request','small_talk'] as const)('a %s decision cannot enter the qualified read path', async choice => {
    const { instance } = classifier(); instance.transport = mock(async () => Response.json(response(choice))) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull();
  });
  test.each(['confidence','writeProbability'])('invalid %s cannot pass parser or acceptance', field => {
    for (const value of [-0.1, 1.5, NaN, Infinity]) {
      const body = response();
      if (field === 'confidence') body.answers.intent.confidence = value; else body.answers.is_write.noul = value;
      expect(() => parseDecision(body)).toThrow();
      expect(accepts({...parseDecision(response()),[field]:value},0.8,true)).toBe(false);
    }
  });
  test('decision validation ignores provider usage and pricing metadata', () => {
    const { usage: _usage, ...body } = response();
    const decision = parseDecision(body);
    expect(decision.choice).toBe('student_count');
    expect(parseDecision({ ...body, usage: { input_tokens: 'unused', cost: 'unused' } })).toEqual(decision);
    expect(decision).not.toHaveProperty('inputTokens'); expect(decision).not.toHaveProperty('costUsd');
  });
  test.each(['NaN','Infinity','-1','1.5'])('invalid threshold %s fails configuration', value => {
    process.env.CHATBOT_JEV_THRESHOLD = value; expect(readJevControls).toThrow();
  });
  test('provider failure returns no plan and never retries', async () => {
    const { instance } = classifier(); instance.transport = mock(async () => new Response('private provider body',{status:503})) as any;
    expect(await run(instance, () => instance.prepare(request()))).toBeNull(); expect(instance.transport).toHaveBeenCalledTimes(1);
  });
  test('deadline releases fallback even when transport ignores abort; a late decision never executes', async () => {
    process.env.CHATBOT_JEV_OPERATING_TIMEOUT_MS = '20';
    const { instance } = classifier(); let release!: (response: Response) => void;
    instance.transport = mock(() => new Promise(resolve => { release = resolve; })) as any;
    const f = frame(instance);
    expect(await schoolJevRequestContext.run(f, () => instance.prepare(request()))).toBeNull();
    expect(f.diagnostics?.classification).toBe('aborted'); release(Response.json(response()));
    await new Promise(resolve => setTimeout(resolve, 5)); expect(f.diagnostics?.classification).toBe('aborted');
  });
  test('HTTP disconnect cancels the pending classifier', async () => {
    const { instance } = classifier(); const lifetime = new AbortController();
    instance.transport = mock(async () => { lifetime.abort(); return Response.json(response()); }) as any;
    expect(await run(instance, () => instance.prepare(request()), {requestSignal:lifetime.signal})).toBeNull();
  });
  test('oversized and malformed decisions never produce a plan', async () => {
    const { instance } = classifier();
    for (const body of ['x'.repeat(65_537),'{}']) {
      instance.transport = mock(async () => new Response(body)) as any;
      expect(await run(instance, () => instance.prepare(request()))).toBeNull();
    }
  });
  test('provider selection retains the released model policy and explicit legacy rollback', () => {
    expect(schoolOpenRouterProvider()).toMatchObject({only:['coreweave'],allow_fallbacks:false});
    process.env.CHATBOT_FLOW = 'legacy'; expect(schoolOpenRouterProvider()).toMatchObject({order:['cerebras'],allow_fallbacks:true});
  });
});
describe('shared intent renderers', () => {
  test.each(['fr', 'ar', 'ary'] as const)('maps only guarded core intents in %s', language => {
    for (const intent of INTENT_NAMES) {
      const plan = jevReplyPlan(intent, language, '2025-2026');
      if (!['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list'].includes(intent)) expect(plan).toBeNull();
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

  function agent(instance: JevIntentClassifier, router: () => Promise<any>) {
    const diagnostics = new ChatDiagnosticsLog();
    const events: any[] = []; const reads = mock(async () => ({ content: [{ type: 'text', text: '{"count":7}' }] }));
    const value = new ChatAgent({ getInternal: async () => ({ isEnabled: true, provider: 'openrouter', model: 'test', useMemory: false }) } as any,
      {} as any, {} as any, { reply: { detectLanguage: schoolReplyLanguage, template: input => schoolWriteReply(input),
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

test('candidate-first executes one authorized MCP read without routing or generation', async () => {
  const { instance } = classifier(); const router = mock(async () => ({ status:'routed', tools:[] }));
  const a = agent(instance, router);
  expect(await run(instance, () => a.value.runOnce(a.input))).toContain('7 élèves');
  expect(a.reads).toHaveBeenCalledTimes(1); expect(router).not.toHaveBeenCalled(); expect(a.generation).not.toHaveBeenCalled();
});
test('declined candidate invokes the existing router/model fallback once', async () => {
  const { instance } = classifier(); instance.transport = mock(async () => Response.json(response('needs_llm'))) as any;
  const router = mock(async () => ({status:'routed',tools:[]})); const a = agent(instance, router);
  expect(await run(instance, () => a.value.runOnce(a.input))).toBe('model fallback');
  expect(a.reads).not.toHaveBeenCalled(); expect(router).toHaveBeenCalledTimes(1); expect(a.generation).toHaveBeenCalledTimes(1);
});
