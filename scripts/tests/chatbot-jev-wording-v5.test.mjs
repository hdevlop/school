import {expect,test} from 'bun:test';
import {buildDecisionRequest,buildDecisionRequestV5,INTENT_WORDING_VERSION} from '@sms/server/jev-intents';
import {wordingV5Protocol,analyzeWordingV5} from '../chatbot-jev-wording-v5.mjs';

test('candidate preserves raw text, model, closed intents and historical wording',()=>{
  const query='imta lfard jay?',old=buildDecisionRequest(query),snapshot=JSON.stringify(old),candidate=buildDecisionRequestV5(query);
  expect(INTENT_WORDING_VERSION).toBe(3);
  expect(candidate.state).toBe(query);expect(candidate.model).toBe(old.model);
  expect(Object.keys(candidate.questions.intent.criteria)).toEqual(Object.keys(old.questions.intent.criteria));
  expect(candidate.questions.intent.criteria.upcoming_exams).toContain(query);
  expect(candidate.questions.is_write.criteria.true).toContain('incomplete');
  expect(candidate.questions.is_write.instructions).toContain('not by command tone');
  expect(JSON.stringify(buildDecisionRequest(query))).toBe(snapshot);
  expect(()=>buildDecisionRequestV5('')).toThrow();
});
test('protocol freezes balanced script/order, exact limits and all writes without French',()=>{
  const p=wordingV5Protocol();expect(p.cases).toHaveLength(48);expect(p.jobs).toHaveLength(96);
  expect(p.cases.filter(x=>x.intent==='write_request')).toHaveLength(18);
  expect(p.cases.filter(x=>x.language==='ary')).toHaveLength(24);
  expect(p.cases.filter(x=>x.language==='ary-latn')).toHaveLength(24);
  expect(p.jobs.filter((x,i)=>i%2===0&&x.version===3)).toHaveLength(24);
  expect(p.maxRequests*p.reserveUsd).toBeLessThanOrEqual(p.maxEstimatedUsd);
  expect(p.retries).toBe(0);expect(p.independentQualification).toBe(false);
});
test('analysis cannot promote an incomplete comparison or mistake missing cost for zero',()=>{
  const p=wordingV5Protocol();const result=analyzeWordingV5(p,[]);
  expect(result.developmentGatePassed).toBe(false);
  const item=p.cases.find(x=>x.intent==='student_count');
  const rows=[3,5].map(version=>({caseId:item.id,version,expectedIntent:item.intent,language:item.language,costUsd:null,
    decision:{choice:item.intent,confidence:.99,writeProbability:0}}));
  const changed=analyzeWordingV5(p,rows);expect(changed.checks.knownCosts).toBe(false);
  expect(changed.developmentGatePassed).toBe(false);
});
test('guard retains arithmetic and write disagreement after the wording change',()=>{
  const p=wordingV5Protocol(),item=p.cases.find(x=>x.id==='jev-operator-q30');
  const rows=[3,5].map(version=>({caseId:item.id,version,expectedIntent:item.intent,language:item.language,costUsd:0,
    decision:{choice:'student_and_teacher_count',confidence:.99,writeProbability:0}}));
  const result=analyzeWordingV5(p,rows);expect(result.after.accepted).toBe(0);
});
