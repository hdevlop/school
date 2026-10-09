import 'reflect-metadata';
import { afterEach, expect, test } from 'bun:test';
import { ChatAgent } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { ordinaryJevTurn, readSchoolChatControls } from '../../src/modules/chat/transport/schoolChatControls';
import { budgetedChatFetch, installSchoolPaidChatTransport, schoolPaidChatContext, type SchoolPaidChatFrame } from '../../src/modules/chat/budget/SchoolPaidChatTransport';
import { schoolChatResponse } from '../../src/modules/chat/transport/schoolChatResponse';
import { createJevFixture } from './jevFixture';
import { ChatSpendRepository } from '../../src/modules/chat/budget/ChatSpendRepository';
import { schoolJevRequestContext } from '../../src/modules/chat/jev/JevRequestContext';
import { jevPreparationPolicy } from '../../src/modules/chat/jev/jevPreparationPolicy';
import { schoolRoutingContext } from '../../src/modules/chat/routing/schoolRoutingContext';
import { rewriteDarijaForRouting } from '../../src/modules/chat/routing/darijaRouting';
import { schoolReplyLanguage } from '../../src/modules/chat/replies/schoolReplyLanguage';
import { schoolWriteRefusalKind } from '../../src/modules/chat/replies/schoolReplyWrite';
import { queryVetoV6 } from '../../src/modules/chat/jev/jevQueryGuard';
import { INTENT_NAMES, JEV_MODEL } from '../../src/modules/chat/jev/jevIntents';

const original = { flow: process.env.CHATBOT_FLOW, mode: process.env.CHATBOT_JEV_MODE };
afterEach(() => {
  for (const [key, value] of [['CHATBOT_FLOW',original.flow],['CHATBOT_JEV_MODE',original.mode]]) {
    if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
  }
});
function fixture(limit = 100_000) {
  let used = 0, attempts = 0, sends = 0;
  const reservations = new Set<string>();
  const frame: SchoolPaidChatFrame = { limit, calls: 0, costs: [], repository: {
    reserve: async (_kind, microUsd) => {
      if (used + microUsd > limit) return null;
      used += microUsd; attempts++;
      const id = crypto.randomUUID(); reservations.add(id);
      return { id, month: '2026-10', microUsd };
    },
    settle: async (r, cost) => {
      if (cost === null || !reservations.delete(r.id)) return;
      used += Math.ceil(cost * 1_000_000) - r.microUsd;
    },
  } };
  const fetcher = (value: Response | (() => Response)) => budgetedChatFetch((async () => {
    sends++; return typeof value === 'function' ? value() : value;
  }) as typeof fetch);
  return { frame, fetcher, snapshot: () => ({used,attempts,sends}) };
}
const generation = { method:'POST', body: JSON.stringify({model:'openai/gpt-oss-20b',messages:[{role:'user',content:'salam'}]}) };
const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

test('reinstall after a framework fetch replacement charges nested wrappers once',async()=>{
 const originalFetch=globalThis.fetch, f=fixture();let sends=0;
 try{
  globalThis.fetch=budgetedChatFetch((async()=>{sends++;return Response.json({usage:{cost:0.00001}});}) as typeof fetch);
  const previous=globalThis.fetch;globalThis.fetch=((...args)=>previous(...args)) as typeof fetch;
  installSchoolPaidChatTransport();
  await schoolPaidChatContext.run(f.frame,async()=>{await(await fetch(endpoint,generation)).text();});
  expect(sends).toBe(1);expect(f.snapshot().attempts).toBe(1);expect(f.snapshot().used).toBe(10);
 }finally{globalThis.fetch=originalFetch;installSchoolPaidChatTransport();}
});
test('only a new single-text user turn establishes ordinary first-turn context', () => {
  expect(ordinaryJevTurn({messages:[{role:'user',content:'bghit total tlamid'}],historyComplete:true,role:'admin'})).toEqual({query:'bghit total tlamid',historyComplete:true,priorUserTurns:0});
  for (const body of [{sessionKey:'forged',messages:[{role:'user',content:'x'}]}, {messages:[{role:'assistant',content:'x'}]},
    {messages:[{role:'user',parts:[{type:'text',text:'x'},{type:'file'}]}]}, {messages:[{role:'user',content:'x'},{role:'user',content:'y'}]}]) expect(ordinaryJevTurn(body)).toBeNull();
});
test('qualified ordinary frame uses candidate-first and Jev off keeps the preparation contract', () => {
  process.env.CHATBOT_FLOW='jev-router-20b'; process.env.CHATBOT_JEV_MODE='off';
  expect(readSchoolChatControls().monthlyMicroUsd).toBe(10_000_000);
  schoolJevRequestContext.run({actorId:'a',academicYear:'2026-2027',query:'x',mode:'off',correlationId:null,historyComplete:true,priorUserTurns:0},()=>{
    expect(jevPreparationPolicy().strategy).toBe('candidate-first'); expect(jevPreparationPolicy().enabled).toBe(true);
  });
});
test('class-name wording retains unknown qualifiers; a teacher number without quantity remains ambiguous',()=>{
 const q='بغيت غير سميات الأقسام فالمدرسة كاملة بلا معلومات أخرى.';
 expect(queryVetoV6(q,'class_list')).toBeNull();
 expect(queryVetoV6(q+' غير البنات','class_list')).not.toBeNull();
});
test('generation reserves before send, passes bytes and releases only reported cost', async () => {
  const f=fixture(); let sent:any;
  const fetcher=budgetedChatFetch((async (_url,init)=>{sent=JSON.parse(String(init?.body)); return Response.json({usage:{cost:0.000012},text:'ok'});}) as typeof fetch);
  await schoolPaidChatContext.run(f.frame,async()=>{const response=await fetcher(endpoint,generation);expect(await response.json()).toEqual({usage:{cost:0.000012},text:'ok'});});
  expect(sent.max_tokens).toBe(4096);expect(sent.provider.only).toEqual(['coreweave']);expect(sent.provider.allow_fallbacks).toBe(false);
  expect(f.snapshot().used).toBe(12);expect(f.frame.calls).toBe(1);
});
test('missing cost, cancellation and stream errors keep debits; no spent allowance dispatch', async () => {
  const f=fixture(6000);
  await schoolPaidChatContext.run(f.frame,async()=>{
    const response=await f.fetcher(Response.json({text:'ok'}))(endpoint,generation);await response.text();
    expect(f.snapshot().used).toBeGreaterThan(0);
    await expect(f.fetcher(Response.json({}))(endpoint,generation)).rejects.toThrow('allowance');
  });
  expect(f.snapshot().sends).toBe(1);expect(f.frame.stopped).toBe('allowance');
  const c=fixture();await schoolPaidChatContext.run(c.frame,async()=>{
    const response=await c.fetcher(new Response(new ReadableStream({pull(controller){controller.enqueue(new TextEncoder().encode('data: x\n\n'));}}),{headers:{'content-type':'text/event-stream'}}))(endpoint,generation);
    await response.body!.cancel();
  });expect(c.snapshot().used).toBeGreaterThan(0);expect(c.frame.costs).toHaveLength(0);
});
test('streamed usage settles independently per generation step without buffering output', async () => {
  const f=fixture();const data='data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: {"usage":{"cost":0.00001}}\n\ndata: [DONE]\n\n';
  await schoolPaidChatContext.run(f.frame,async()=>{
    for(let i=0;i<2;i++){const r=await f.fetcher(()=>new Response(data,{headers:{'content-type':'text/event-stream'}}))(endpoint,generation);expect(await r.text()).toBe(data);}
  });expect(f.snapshot().used).toBe(20);expect(f.frame.calls).toBe(2);
});
test('provider failures cannot trigger another paid generation retry or 120B escalation',async()=>{
  const f=fixture();await schoolPaidChatContext.run(f.frame,async()=>{
    const r=await f.fetcher(new Response('failure',{status:503}))(endpoint,generation);await r.text();
    await expect(f.fetcher(Response.json({}))(endpoint,generation)).rejects.toThrow('retry');
    await expect(f.fetcher(Response.json({}))(endpoint,{...generation,body:'{"model":"openai/gpt-oss-120b"}'})).rejects.toThrow();
  });expect(f.snapshot().sends).toBe(1);
});
test('classification and remote embeddings share the generation allowance; unrelated fetch is unchanged',async()=>{
  const f=fixture();f.frame.embeddingUrl='https://embedding.example/v1/embeddings';
  await schoolPaidChatContext.run(f.frame,async()=>{
    for(const url of ['https://openrouter.ai/api/alpha/decisions',f.frame.embeddingUrl]){
      const r=await f.fetcher(Response.json({usage:{cost:0.00001}}))(url,{method:'POST',body:'{}'});await r.text();
    }
    await expect(f.fetcher(Response.json({}))('https://other-provider.example/api',generation)).rejects.toThrow('qualified');
  });expect(f.snapshot().used).toBe(20);expect(f.frame.costs.map(c=>c.kind)).toEqual(['classification','embedding']);
  const f2=fixture();await f2.fetcher(Response.json({ok:true}))('https://other-provider.example/api');expect(f2.snapshot().attempts).toBe(0);
});
test('only the configured free local embedding endpoint bypasses accounting, not a local model proxy',async()=>{
 const f=fixture();f.frame.freeEmbeddingUrl='http://127.0.0.1:18080/v1/embeddings';
 await schoolPaidChatContext.run(f.frame,async()=>{
  await f.fetcher(Response.json({data:[]}))(f.frame.freeEmbeddingUrl!);
  await expect(f.fetcher(Response.json({}))('http://127.0.0.1:18080/v1/chat/completions',generation)).rejects.toThrow('qualified');
 });expect(f.snapshot().attempts).toBe(0);expect(f.snapshot().sends).toBe(1);
});

test('ordinary signed-in chat selects Jev through the production first-turn boundary and rejects forged role/history',async()=>{
 process.env.CHATBOT_FLOW='jev-router-20b';process.env.CHATBOT_JEV_MODE='on';
 const f=await createJevFixture();const spend=fixture();
 f.server.container.set(ChatSpendRepository,spend.frame.repository as any);
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
test('exhausted allowance is a visible localized unavailable outcome, preserving tool results',async()=>{
  const data='data: {"type":"start"}\n\ndata: {"type":"error","errorText":"private"}\n\ndata: {"type":"finish"}\n\ndata: [DONE]\n\n';
  const r=schoolChatResponse(new Response(data,{headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'}}),'bghit no9ati',undefined,{stopped:'allowance'});
  const text=await r.text();expect(text).toContain('ميزانية');expect(text).toContain('monthly_allowance');expect(text).not.toContain('private');
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

test('write refusal is free and general reads cannot bypass an exhausted allowance', async () => {
 process.env.CHATBOT_FLOW='jev-router-20b'; process.env.CHATBOT_JEV_MODE='off';
 const f=await createJevFixture(); const spend=fixture(1);
 f.server.container.set(ChatSpendRepository,spend.frame.repository as any);
 let sends=0;
 const paid=budgetedChatFetch((async()=>{sends++;return Response.json({});}) as typeof fetch);
 const model=scriptedModel('Unexpected answer');
 model.doStream=async()=>{await paid(endpoint,generation);throw Error('Unexpected paid send');};
 (f.server.container.get(ChatAgent) as any).buildModel=()=>model;
 try {
  const write=await f.call('/chat',{messages:[{role:'user',content:"Enregistre 15 sur 20 pour l'élève Zzbench Qqtest au dernier contrôle."}]});
  expect(await write.text()).toContain('Je ne peux pas effectuer cette modification');
  expect(spend.snapshot().attempts).toBe(0);
  const read=await f.call('/chat',{messages:[{role:'user',content:'Combien de filles dans CP ?'}]});
  expect(await read.text()).toContain('Le budget mensuel de l’assistant est atteint');
  expect(sends).toBe(0);
 } finally { await f.server.stop(); }
});
