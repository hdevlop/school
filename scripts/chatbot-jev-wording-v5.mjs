/** Bounded classification-only development comparison; no school or chat-model calls. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { buildDecisionRequest, buildDecisionRequestV5, parseDecision, JEV_DECISIONS_URL } from '@sms/server/jev-intents';
import { acceptsWithQueryGuardV6 } from '@sms/server/jev-query-guard';
import { createEstimatedBudget } from './chatbot-budget.mjs';

const corpusPath = 'datasets/chatbot-latency/darija-tool-selection-20261008.json';
const sourcePaths = [corpusPath, 'packages/server/src/modules/chat/jev/jevIntents.ts',
  'packages/server/src/modules/chat/jev/jevProtocol.ts', 'packages/server/src/modules/chat/jev/jevWording.ts',
  'packages/server/src/modules/chat/jev/jevDecision.ts',
  'packages/server/src/modules/chat/jev/jevQueryGuard.ts', ...[3,4,5,6].map(v=>`packages/server/src/modules/chat/jev/guards/queryV${v}.ts`),
  'packages/server/src/modules/chat/jev/guards/examsV6.ts', 'packages/server/src/modules/chat/jev/guards/countV2.ts',
  'packages/server/src/modules/chat/jev/guards/countV1.ts', 'packages/server/src/modules/chat/replies/schoolReplyWrite.ts',
  'scripts/chatbot-budget.mjs', 'scripts/chatbot-jev-wording-v5.mjs'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function wordingV5Protocol() {
  const corpus = JSON.parse(readFileSync(corpusPath,'utf8'));
  const targets = [5,6,9,10,11,12,13,14,29,30,31,32,33,34,35,36,49,50,51,52,53,54,55,56,71,72,77,78,79,80];
  const cases = corpus.cases.filter(item => item.intent === 'write_request' || targets.includes(Number(item.id.split('q').at(-1))));
  if(cases.length!==48 || cases.filter(x=>x.intent==='write_request').length!==18)throw Error('Focused corpus changed');
  return { purpose:'jev-wording-v5-development', guardVersion:6, threshold:.8, cases, assistantLabels:true,
    independentQualification:false, maxRequests:96, maxEstimatedUsd:.02, reserveUsd:.00015, timeoutMs:10000, spacingMs:200,
    retries:0, jobs:cases.flatMap((item,i)=>(i%2?[5,3]:[3,5]).map(version=>({caseId:item.id,version}))),
    requestShapes:{3:buildDecisionRequest('synthetic placeholder'),5:buildDecisionRequestV5('synthetic placeholder')},
    sourceHashes:Object.fromEntries(sourcePaths.map(path=>[path,hash(readFileSync(path))])) };
}
export function analyzeWordingV5(protocol, rows) {
  const byVersion = version => {
    const items=rows.filter(x=>x.version===version), valid=items.filter(x=>x.decision);
    const accepted=valid.filter(x=>acceptsWithQueryGuardV6(x.decision,protocol.cases.find(item=>item.id===x.caseId).query));
    return {attempted:items.length, valid:valid.length, correctChoice:valid.filter(x=>x.decision.choice===x.expectedIntent).length,
      falseWrites:valid.filter(x=>x.expectedIntent!=='write_request'&&x.decision.writeProbability>=.5).map(x=>x.caseId),
      missedWrites:valid.filter(x=>x.expectedIntent==='write_request'&&x.decision.writeProbability<.5).map(x=>x.caseId),
      accepted:accepted.length,acceptedWrong:accepted.filter(x=>x.decision.choice!==x.expectedIntent).map(x=>x.caseId),
      acceptedRead:accepted.filter(x=>x.expectedIntent!=='write_request').length,
      acceptedWrite:accepted.filter(x=>x.expectedIntent==='write_request').length,
      acceptedArabiziRead:accepted.filter(x=>x.language==='ary-latn'&&x.expectedIntent!=='write_request').length,
      costKnown:items.every(x=>Number.isFinite(x.costUsd)),knownCostUsd:items.reduce((sum,x)=>sum+(x.costUsd??0),0)};
  };
  const before=byVersion(3),after=byVersion(5);
  const checks={complete:rows.length===96&&before.valid===48&&after.valid===48,knownCosts:before.costKnown&&after.costKnown,
    noAcceptedWrong:after.acceptedWrong.length===0,noMissedWrites:after.missedWrites.length===0,
    falseWritesReduced:after.falseWrites.length<before.falseWrites.length,
    acceptedReadsIncreased:after.acceptedRead>before.acceptedRead,
    acceptedWriteCoverageMaintained:after.acceptedWrite>=before.acceptedWrite,
    arabiziReadCoverageIncreased:after.acceptedArabiziRead>before.acceptedArabiziRead};
  return {before,after,checks,developmentGatePassed:Object.values(checks).every(Boolean),productionAcceptance:false};
}
async function main() {
  const args=process.argv.slice(2),option=name=>args.find(x=>x.startsWith(`--${name}=`))?.slice(name.length+3);
  const planPath=option('plan'),out=option('output');
  if(!planPath)throw Error('Supply --plan');
  if(!args.includes('--execute')) {
    writeFileSync(planPath,JSON.stringify(wordingV5Protocol(),null,2)+'\n',{flag:'wx'});return;
  }
  const protocol=JSON.parse(readFileSync(planPath,'utf8'));
  if(!isDeepStrictEqual(protocol,wordingV5Protocol())||Number(option('max-requests'))!==protocol.maxRequests
    ||Number(option('max-estimated-usd'))!==protocol.maxEstimatedUsd||!out||existsSync(out))throw Error('Require frozen protocol, exact limits and new output');
  const key=process.env.OPENROUTER_API_KEY;if(!key)throw Error('Missing provider key');
  const budget=createEstimatedBudget(protocol.maxEstimatedUsd,protocol.reserveUsd);
  const report={status:'running',protocol,actualProviderRequests:0,rows:[],productionAcceptance:false};
  const save=()=>writeFileSync(out,JSON.stringify({...report,budget:budget.snapshot()},null,2)+'\n');
  writeFileSync(out,'{}\n',{flag:'wx'});save();
  for(const job of protocol.jobs) {
    if(budget.stopped)break;
    const item=protocol.cases.find(item=>item.id===job.caseId),id=randomUUID();
    try { budget.reserve(id); } catch { break; }
    let costUsd=null,decision=null,httpStatus=null,providerId=null,error=null;
    const start=performance.now();
    try {
      report.actualProviderRequests++;
      const response=await fetch(JEV_DECISIONS_URL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(protocol.timeoutMs),
        headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({
          ...(job.version===5?buildDecisionRequestV5(item.query):buildDecisionRequest(item.query)),
          session_id:id,provider:{data_collection:'deny'}})});
      httpStatus=response.status;const body=await response.json();
      if(typeof body.usage?.cost==='number'&&Number.isFinite(body.usage.cost)&&body.usage.cost>=0)costUsd=body.usage.cost;
      if(typeof body.id==='string'&&/^[\w-]{1,160}$/u.test(body.id))providerId=body.id;
      if(!response.ok)throw Error('provider_rejected');decision=parseDecision(body);
    }catch{error=httpStatus===200?'invalid_or_incomplete_decision':'provider_or_transport_failure';}
    budget.settle(id,costUsd===null?null:{pricingFound:true,totalCost:costUsd});
    report.rows.push({...job,expectedIntent:item.intent,language:item.language,httpStatus,providerId,costUsd,decision,error,elapsedMs:performance.now()-start});
    save();if(error)break;await new Promise(resolve=>setTimeout(resolve,protocol.spacingMs));
  }
  report.status=report.rows.length===protocol.jobs.length&&!budget.stopped&&!report.rows.some(x=>x.error)?'completed':'stopped';
  report.analysis=analyzeWordingV5(protocol,report.rows);save();
  console.log(JSON.stringify({status:report.status,requests:report.actualProviderRequests,budget:budget.snapshot(),analysis:report.analysis}));
}
if(import.meta.main)await main();
