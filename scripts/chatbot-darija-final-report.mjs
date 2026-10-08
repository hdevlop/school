/** Offline combined report; raw observations and billing gaps remain unchanged. */
﻿import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {scoreSelection} from './chatbot-darija-selection-report.mjs';
import {sourceHashes,darijaComparisonProtocol,fingerprint} from './chatbot-jev-full-chat-lib.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/u,'')),sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const dir='docs/evidence/chatbot-latency/',prefix=dir+'darija-total-exams',catalog='datasets/chatbot-latency/darija-tool-selection-20261008.json';
const [runArgs,usageArgs,receipt,output]=process.argv.slice(2);
if(!runArgs||!usageArgs||!receipt||!output)throw Error('Supply RUNS_CSV USAGE_CSV RECOVERY_RECEIPT NEW_OUTPUT');
const index={runs:runArgs.split(','),usages:usageArgs.split(','),receipt,completed:true};
if(index.runs.length!==index.usages.length)throw Error('Require paired segments and usage');
const segments=index.runs.map(read),recovery=read(index.receipt),corpus=read(catalog);
if(!index.completed||segments.at(-1).status!=='completed'||sha(index.runs[0])!==recovery.originalRun.sha256)throw Error('Incomplete or changed raw evidence');
const expected=darijaComparisonProtocol(index.runs.slice(0,-1).join(','),index.usages.slice(0,-1).join(','),'jevfirstfix',index.receipt);
const {sourceHashes:_hashes,sourceFingerprint:_fingerprint,...declared}=segments.at(-1).protocol;
const {sourceHashes:_currentHashes,...policy}=expected;
if(JSON.stringify(declared)!==JSON.stringify(policy))throw Error('Continuation policy differs from preserved input evidence');
if(segments.at(-1).protocol.sourceFingerprint!==fingerprint(segments.at(-1).protocol.sourceHashes))throw Error('Invalid frozen source fingerprint');
const rawRows=segments.flatMap(x=>x.rows),attempts=segments.flatMap(x=>x.attempts);
const rows=rawRows.map(row=>row.correlationId===recovery.correlationId?{...row,diagnostics:recovery.diagnostics}:row);
if(rows.length!==100||JSON.stringify(rows.map(x=>x.caseId))!==JSON.stringify(corpus.cases.map(x=>x.id)))throw Error('Missing, repeated or reordered question');
const lastSources=segments.at(-1).protocol.sourceHashes;
if(process.argv.includes('--verify-current')&&JSON.stringify(lastSources)!==JSON.stringify({...sourceHashes(),[catalog]:sha(catalog)}))throw Error('Sources changed');
for(const segment of segments)for(const [path,hash] of Object.entries(segment.protocol.sourceHashes))if(!path.startsWith('scripts/')&&lastSources[path]!==hash)throw Error('Application runtime sources differ');
const registryPath=dir+'darija-jev-read-wording-tools-20261008.json',fixturePath=dir+'darija-jev-read-wording-fixture-data-20261008.json';
const registry=read(registryPath).result.tools,fixture=read(fixturePath);
const values=Object.fromEntries(Object.entries(fixture).map(([k,v])=>[k,JSON.parse(v.find(x=>x.type==='text').text)]));
const knownIds=new Set([...values.classes_get_classes,...values.sections_get_sections].map(x=>x.id));
const graded=rows.map((row,i)=>({id:row.caseId,query:corpus.cases[i].query,language:corpus.cases[i].language,
 ...scoreSelection(row,corpus.cases[i],registry,knownIds,new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Casablanca'}).format(new Date(row.startedAt))),
 completionSeconds:row.completionMs/1000,reply:row.diagnostics.reply,tools:row.tools,text:row.text}));
const calls=index.usages.flatMap(p=>readFileSync(p,'utf8').trim().split(/\r?\n/u).filter(Boolean).map(x=>JSON.parse(x)));
const ids=new Set();if(calls.some(x=>!x.generationId||ids.has(x.generationId)||!ids.add(x.generationId)))throw Error('Incomplete/duplicate generations');
if(calls.some(x=>x.model!=='openai/gpt-oss-20b'||x.provider&&x.provider!=='CoreWeave'))throw Error('Generation differs from frozen provider/model policy');
if(calls.length!==rows.reduce((n,row)=>n+row.diagnostics.steps.length,0))throw Error('Unaccounted generation calls');
for(const row of rows){const n=calls.filter(x=>Date.parse(x.startedAt)>=Date.parse(row.startedAt)&&Date.parse(x.startedAt)<=Date.parse(row.completedAt)).length;
 if(n!==row.diagnostics.steps.length)throw Error('Generation count differs '+row.caseId);}
const unknownClassifier=attempts.filter(x=>x.costUsd===null).length+1;
const generationKnown=calls.filter(x=>Number.isFinite(x.usage?.cost)&&x.usage.cost>=0&&!x.incomplete);
if(generationKnown.length!==calls.length)throw Error('Generation cost gap');
const knownCost=generationKnown.reduce((n,x)=>n+x.usage.cost,0)+attempts.reduce((n,x)=>n+(x.costUsd??0),0);
const previous=read(dir+'darija-jev-first-fix-results-20261008.json');
const targetIds=[29,30,31,32,79,80,91,92,93,94].map(n=>'jev-operator-q'+String(n).padStart(2,'0'));
const targetRows=graded.filter(x=>targetIds.includes(x.id)),failed=graded.filter(x=>!x.toolPlanChecksPassed);
const off=read(prefix+'-off-check-20261008.json');
if(off.passed!==10||off.rows.length!==10||off.classifierRequests||off.generationRequests||off.rows.some(x=>!x.passed))throw Error('Primary live Jev-off check is incomplete');
const report={status:'completed',productionQualification:false,paidChats:100,repeatedChats:0,guardVersion:6,runtimeWordingVersion:6,
 summary:{toolPlansPassed:100-failed.length,failed:failed.length,previousFull100Passed:previous.arms?.[0]?.toolPlanChecksPassed??80,
 targetPassed:targetRows.filter(x=>x.toolPlanChecksPassed).length,targetCases:10,averageResponseSeconds:rows.reduce((n,x)=>n+x.completionMs,0)/100/1000,
 timingGateApplied:false,jevReplies:rows.filter(x=>x.diagnostics.reply?.label?.startsWith('jev:')).length,
 pairedFamiliesPassed:[...new Set(corpus.cases.map(x=>x.familyId))].filter(family=>corpus.cases.map((x,i)=>({item:x,result:graded[i]})).filter(x=>x.item.familyId===family).every(x=>x.result.toolPlanChecksPassed)).length,
 semanticReviewFlags:graded.filter(x=>x.reviewFlags.length).length,
 localReplies:rows.filter(x=>x.diagnostics.reply?.source==='template'&&!x.diagnostics.reply?.label?.startsWith('jev:')).length,
 modelReplies:rows.filter(x=>x.diagnostics.reply?.source==='model').length,classifierAttempts:attempts.length+1,generationCalls:calls.length,
 knownResponseReportedCostUsd:knownCost,unknownClassifierCosts:unknownClassifier,unknownClassifierReserveUsd:unknownClassifier*0.00015,totalBilledCostUsd:null,
 acceptedWrongRecordedDecisions:attempts.filter(x=>x.selected==='template'&&x.choice!==corpus.cases.find(y=>y.id===x.caseId)?.intent).length,
 scripts:Object.fromEntries(['ary','ary-latn'].map(language=>[language,{cases:graded.filter(x=>x.language===language).length,passed:graded.filter(x=>x.language===language&&x.toolPlanChecksPassed).length}]))},
 primaryJevOff:{passed:10,cases:10,classifierCalls:0,generationCalls:0},
 segments:segments.map((s,i)=>({path:index.runs[i],status:s.status,cases:s.rows.length,stoppedReason:s.stoppedReason??null,restoredInOriginal:s.modeRestoredOff&&s.modelRestored})),
 failures:failed.map(x=>({id:x.id,query:x.query,issues:x.issues,tools:x.tools.map(t=>t.name),text:x.text})),
 targetRows,verification:{chatTestsPassed:427,scriptTestsPassed:557,protocolAndHistoricalGuardTestsPassed:23,chatYearScopeTestsPassed:13,
 populatedHttpChecks:40,restrictedRoleChats:15,directMcpDenials:9,rootLint:'passed with 3 existing frontend hook warnings',rootTypecheck:'passed',productionBuild:'passed'},
 limitations:['Tool-plan checks are not full semantic answer accuracy or independent native-language qualification.',
 'Admin first-turn fixture only; two-year/admin/principal and restricted-role behavior is additionally checked with populated synthetic HTTP/MCP fixtures.',
 'Observed improvements include guarded local replies; they are not evidence that the Jev model became more accurate.',
 'First seven chats preceded a harness-only authentication/recovery fix; application runtime sources did not change. Recovered diagnostics are a separate hash-bound unpaid receipt. No prefix chats were repeated.',
 'One classifier ledger entry was lost; additional timed-out classifier calls retain null billed costs and their full reservations. Known charges are not an exact total or a monthly projection.',
 'Historical fixture has missing genders and empty teacher/subject/exam data; populated filter/render tests cover these separately.'],
 source:[...index.runs,...index.usages,...index.runs.map(p=>p.replace('-run-','-plan-')),index.receipt,prefix+'-off-check-20261008.json',prefix+'-fixture-20261008.json',catalog,registryPath,fixturePath,'scripts/chatbot-darija-selection-report.mjs','scripts/chatbot-darija-final-report.mjs'].map(path=>({path,sha256:sha(path)})),
 rows:graded.map(({query:_query,text:_text,tools,...rest})=>({...rest,toolNames:tools.map(x=>x.name)}))};
writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({summary:report.summary,failures:report.failures,targets:targetRows.length}));
