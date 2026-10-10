import 'reflect-metadata';
import { afterEach, expect, test } from 'bun:test';
import { ChatAgent } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { ordinaryJevTurn, readSchoolChatControls } from '../../src/modules/chat/transport/schoolChatControls';
import { schoolChatFetch, installSchoolChatTransport, schoolChatTransportContext, type SchoolChatTransportFrame } from '../../src/modules/chat/transport/SchoolChatTransport';
import { createJevFixture } from './jevFixture';
import { schoolJevRequestContext, jevPreparationPolicy } from '../../src/modules/chat/jev/JevRequestContext';
import { schoolRoutingContext } from '../../src/modules/chat/routing/schoolRoutingContext';
import { rewriteDarijaForRouting } from '../../src/modules/chat/routing/darijaRouting';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolWriteRefusalKind } from '../../src/modules/chat/replies/schoolReplyWrite';
import { queryVeto } from '../../src/modules/chat/jev/guards/queryGuard';
import { INTENT_NAMES, JEV_MODEL } from '../../src/modules/chat/jev/jevIntents';

const original = { flow: process.env.CHATBOT_FLOW, mode: process.env.CHATBOT_JEV_MODE };
afterEach(() => {
  for (const [key, value] of [['CHATBOT_FLOW',original.flow],['CHATBOT_JEV_MODE',original.mode]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
});
function fixture() {
  const frame: SchoolChatTransportFrame = { embeddingUrl: 'http://127.0.0.1:18080/v1/embeddings', calls: 0 };
  let sends = 0;
  const fetcher = (response: Response) => schoolChatFetch((async () => { sends++; return response; }) as typeof fetch);
  return { frame, fetcher, sends: () => sends };
}
const generation = { method: 'POST', body: JSON.stringify({model:'openai/gpt-oss-20b',messages:[{role:'user',content:'salam'}]}) };
const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

test('reinstall after a framework fetch replacement dispatches nested wrappers once', async () => {
  const originalFetch = globalThis.fetch, f = fixture();
  try {
    globalThis.fetch = f.fetcher(Response.json({text:'ok'}));
    const previous = globalThis.fetch;
    globalThis.fetch = ((...args) => previous(...args)) as typeof fetch;
    installSchoolChatTransport();
    await schoolChatTransportContext.run(f.frame, async () => { await (await fetch(endpoint, generation)).text(); });
    expect(f.sends()).toBe(1); expect(f.frame.calls).toBe(1);
  } finally { globalThis.fetch = originalFetch; }
});

test('only a new single-text user turn establishes ordinary first-turn context', () => {
  expect(ordinaryJevTurn({messages:[{role:'user',content:'bghit total tlamid'}],historyComplete:true,role:'admin'})).toEqual({query:'bghit total tlamid',historyComplete:true,priorUserTurns:0});
  for (const body of [{sessionKey:'forged',messages:[{role:'user',content:'x'}]}, {messages:[{role:'assistant',content:'x'}]},
    {messages:[{role:'user',parts:[{type:'text',text:'x'},{type:'file'}]}]}, {messages:[{role:'user',content:'x'},{role:'user',content:'y'}]}]) expect(ordinaryJevTurn(body)).toBeNull();
});
test('qualified ordinary frame uses candidate-first and Jev off keeps the preparation contract', () => {
  process.env.CHATBOT_FLOW='jev-router-20b'; process.env.CHATBOT_JEV_MODE='off';
  expect(readSchoolChatControls().enabled).toBe(true);
  schoolJevRequestContext.run({actorId:'a',academicYear:'2026-2027',query:'x',mode:'off',correlationId:null,historyComplete:true,priorUserTurns:0},()=>{
    expect(jevPreparationPolicy().strategy).toBe('candidate-first'); expect(jevPreparationPolicy().enabled).toBe(true);
  });
});
test('class-name wording retains unknown qualifiers; a teacher number without quantity remains ambiguous',()=>{
 const q='بغيت غير سميات الأقسام فالمدرسة كاملة بلا معلومات أخرى.';
 expect(queryVeto(q,'class_list')).toBeNull();
 expect(queryVeto(q+' غير البنات','class_list')).not.toBeNull();
});
test('provider policy passes the response through without reading or wrapping it', async () => {
  const f = fixture(); let sent: any;
  const response = new Response('provider bytes');
  const fetcher = schoolChatFetch((async (_url, init) => { sent = JSON.parse(String(init?.body)); return response; }) as typeof fetch);
  const result = await schoolChatTransportContext.run(f.frame, () => fetcher(endpoint, generation));
  expect(result).toBe(response); expect(response.bodyUsed).toBe(false);
  expect(sent.max_tokens).toBe(4096); expect(sent.temperature).toBe(0);
  expect(sent.provider.only).toEqual(['coreweave']);
  expect(sent.provider.allow_fallbacks).toBe(false); expect(sent.provider.max_price).toBeUndefined();
});

test('provider failure cannot trigger a generation retry or 120B escalation', async () => {
  const f = fixture();
  await schoolChatTransportContext.run(f.frame, async () => {
    expect((await f.fetcher(new Response('failure', {status:503}))(endpoint, generation)).status).toBe(503);
    await expect(f.fetcher(Response.json({}))(endpoint, generation)).rejects.toThrow('retry');
  });
  expect(f.sends()).toBe(1);
  const other = fixture();
  await schoolChatTransportContext.run(other.frame, async () => {
    await expect(other.fetcher(Response.json({}))(endpoint, {...generation, body:'{"model":"openai/gpt-oss-120b"}'})).rejects.toThrow('OSS20B');
  });
  expect(other.sends()).toBe(0);
});

test('classification and configured embeddings dispatch without accounting; other destinations remain blocked', async () => {
  const f = fixture();
  await schoolChatTransportContext.run(f.frame, async () => {
    for (const url of ['https://openrouter.ai/api/alpha/decisions', f.frame.embeddingUrl])
      await f.fetcher(Response.json({}))(url, {method:'POST', body:'{}'});
    await expect(f.fetcher(Response.json({}))('http://127.0.0.1:18080/v1/chat/completions', generation)).rejects.toThrow('qualified');
  });
  expect(f.sends()).toBe(2);
  await f.fetcher(Response.json({}))('https://other-provider.example/api');
  expect(f.sends()).toBe(3); expect(f.frame.calls).toBe(2);
});

test('ordinary signed-in chat selects Jev through the production first-turn boundary and rejects forged role/history',async()=>{
 process.env.CHATBOT_FLOW='jev-router-20b';process.env.CHATBOT_JEV_MODE='on';
 const f=await createJevFixture();
 let decisions=0;
 f.classifier.transport=async()=>{decisions++;return Response.json({model:JEV_MODEL,answers:{intent:{type:'choice',choice:'student_count',confidence:0.99,probabilities:Object.fromEntries(INTENT_NAMES.map(name=>[name,name==='student_count'?0.99:name==='needs_llm'?0.01:0]))},is_write:{type:'noul',noul:0.01}},usage:{input_tokens:1,cost:0}});};
 try{
  const body={messages:[{role:'user',content:'خاصني العدد كامل ديال التلاميذ فالمدرسة هاد العام بلا تفاصيل.'}],historyComplete:true};
  const r=await f.call('/chat',body);expect(r.status).toBe(200);expect(await r.text()).toContain('9');
  expect(decisions).toBe(1);expect(f.counts().generations).toBe(0);
  for(const [role,extra] of [['student',{role:'admin'}],['admin',{sessionKey:'already-existing'}]] as const){
   const response=await f.call('/chat',{...body,...extra},role);await response.text();
   expect(decisions).toBe(2);
   if(role === 'student') expect(f.events.at(-1)?.tools.every(tool => tool.outcome !== 'executed')).toBe(true);
  }
 }finally{await f.server.stop();}
});
test('retired benchmark endpoints are absent from the chat server', async () => {
  const f = await createJevFixture();
  try {
    for (const [path, body] of [['/chat-benchmark/status', undefined],
      ['/chat-benchmark/reset-caches', {}], ['/chat-benchmark/jev/status', undefined],
      ['/chat-benchmark/jev/session', {caseId:'fr-student'}]] as const)
      expect((await f.call(path, body)).status).toBe(404);
    expect(f.counts()).toEqual({decisions:0,generations:0});
  } finally { await f.server.stop(); }
});

test('routing uses the current question and keeps self-identity dependencies', () => {
 expect(schoolRoutingContext('t9der t3tini no9ati had l3am?')).toContain('students_get_my_identity');
 expect(schoolRoutingContext('t9der t3tini no9ati had l3am?')).toContain('student-profile_get_academic');
 expect(schoolRoutingContext('bghit no9at dyal bnti')).toContain('parents_get_my_identity');
 expect(schoolRoutingContext('bghit no9at dyal bnti')).toContain('parents_get_children');
 const placement = 'bghit l9ism dyali daba';
 expect(schoolRoutingContext(placement, rewriteDarijaForRouting(placement))).toContain('students_get_my_identity');
 const teaching = '3tini lmawadd li kan9erri';
 expect(schoolRoutingContext(teaching, rewriteDarijaForRouting(teaching))).toContain('teachers_get_my_identity');
 expect(schoolRoutingContext(teaching, rewriteDarijaForRouting(teaching))).toContain('teacher-profile_get_my_classes');
 expect(schoolRoutingContext('unrecognized qualifier Salma')).toBe('unrecognized qualifier Salma');
 expect(schoolReplyLanguage('t9der t3tini no9ati had l3am?')).toBe('ary');
 expect(schoolWriteRefusalKind('beddel lia no9ti f math daba.')).toBe('change');
 expect(schoolWriteRefusalKind('"beddel lia no9ti"')).toBeNull();
});

test('write refusals skip generation and general reads use model fallback without a spend repository', async () => {
  process.env.CHATBOT_FLOW = 'jev-router-20b'; process.env.CHATBOT_JEV_MODE = 'off';
  const f = await createJevFixture();
  const model = scriptedModel('Authorized model answer'); let generations = 0;
  const stream = model.doStream.bind(model);
  model.doStream = async options => { generations++; return stream(options); };
  (f.server.container.get(ChatAgent) as any).buildModel = () => model;
  try {
    const write = await f.call('/chat', {messages:[{role:'user',content:"Enregistre 15 sur 20 pour l'élève Zzbench Qqtest au dernier contrôle."}]});
    expect(await write.text()).toContain('Je ne peux pas effectuer cette modification');
    expect(generations).toBe(0);
    const read = await f.call('/chat', {messages:[{role:'user',content:'Combien de filles dans CP ?'}]});
    const body = await read.text();
    expect(body).toContain('Authorized model answer'); expect(generations).toBe(1);
    for (const field of ['totalTokens', 'totalCost', 'pricingFound', 'monthly_allowance']) expect(body).not.toContain(field);
  } finally { await f.server.stop(); }
});
