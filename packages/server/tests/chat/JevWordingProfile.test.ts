import {expect,test} from 'bun:test';
import {buildDecisionRequest,buildDecisionRequestV5} from '../../src/modules/chat/jev/jevIntents';
import {buildJevRuntimeDecisionRequest,jevRequestWordingProfile} from '../../src/modules/chat/jev/jevRuntimeWording';
import {jevDarijaCases} from '../../src/modules/chat/benchmark/jevDarijaCases';

test('profile keeps baseline requests byte-identical for all reviewed writes and filtered/ambiguous requests',()=>{
  for(const item of jevDarijaCases.filter(x=>['write_request','needs_llm'].includes(x.intent))) {
    expect(jevRequestWordingProfile(item.query)).toBe(3);
    expect(buildJevRuntimeDecisionRequest(item.query)).toEqual(buildDecisionRequest(item.query));
  }
});
test.each(['imta lfard jay?','gouli ghir ch7al mn tilmid kayn f lmdrasa kamla.',
  '3tini 3adad tlamd bo7do w 3adad lasatida bo7do, dyal lmdrasa kamla.'])('only guarded reads select candidate wording: %s',query=>{
  expect(jevRequestWordingProfile(query)).toBe(5);
  expect(buildJevRuntimeDecisionRequest(query)).toEqual(buildDecisionRequestV5(query));
  expect(buildJevRuntimeDecisionRequest(query).state).toBe(query);
});
test.each(['imta lfard jay dyal l9ism A?', 'زيد ليا تلميذ جديد', 'ماذا نفعل بعد ذلك؟',
  'جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع.', '"imta lfard jay?"'])('uncertain/filtered/write text stays on baseline: %s',query=>{
  expect(jevRequestWordingProfile(query)).toBe(3);
});
test.each(['datasets/chatbot-latency/jev-fresh-stress304-20261007.json',
  'datasets/chatbot-latency/jev-moroccan-development.json','datasets/chatbot-latency/jev-core-exploration.json'])('preserves baseline wording for broader write controls: %s',async path=>{
  const corpus=await Bun.file(path).json();
  const writes=corpus.cases.filter((item:{intent:string})=>item.intent==='write_request');
  expect(writes.length).toBeGreaterThan(0);
  for(const item of writes)expect(buildJevRuntimeDecisionRequest(item.query)).toEqual(buildDecisionRequest(item.query));
});
