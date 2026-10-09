/** Fresh synthetic Darija only. Uses runtime wording/guards; never executes School tools. */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { createEstimatedBudget } from './chatbot-budget.mjs';
import { buildJevRuntimeDecisionRequest } from '../packages/server/src/modules/chat/jevRuntimeWording';
import { acceptsWithQueryGuardV6 } from '../packages/server/src/modules/chat/jevQueryGuard';
import { INTENT_NAMES, JEV_DECISIONS_URL, parseDecision } from '../packages/server/src/modules/chat/jevIntents';
import { jevReplyPlan } from '../packages/server/src/modules/chat/jevReplyPlan';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/schoolReplyLanguage';

const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const normalized = (query: string) => query.normalize('NFKC').toLowerCase().replace(/[.!?؟،,]/gu, '').replace(/\s+/gu, ' ').trim();
export function validateFreshDarija(corpus: any, prior: Array<{ query: string }>) {
  if (corpus?.purpose !== 'fresh-assistant-darija-exploration' || corpus.source !== 'assistant'
    || corpus.independentNativeAcceptance !== false || !Array.isArray(corpus.cases) || !corpus.cases.length || corpus.cases.length > 80) throw Error('Require assistant-authored fresh exploration');
  const previous = new Set(prior.map(x => normalized(x.query))), ids = new Set<string>(), queries = new Set<string>();
  for (const item of corpus.cases) {
    if (!/^fresh\d{2}$/u.test(item.id) || ids.has(item.id) || !['ary', 'ary-latn'].includes(item.language)
      || !INTENT_NAMES.includes(item.intent) || typeof item.family !== 'string' || !item.family
      || typeof item.query !== 'string' || !item.query.trim() || item.query.length > 500
      || previous.has(normalized(item.query)) || queries.has(normalized(item.query))) throw Error('Invalid, duplicate or previously used question');
    ids.add(item.id); queries.add(normalized(item.query));
  }
  for (const family of new Set(corpus.cases.map((x: any) => x.family))) {
    const pair = corpus.cases.filter((x: any) => x.family === family);
    if (pair.length !== 2 || new Set(pair.map((x: any) => x.language)).size !== 2 || pair[0].intent !== pair[1].intent) throw Error('Require matched Arabic/Arabizi pairs');
  }
  return corpus.cases;
}

export async function runFreshProbe(cases: any[], options: { key: string; maxUsd: number; reserveUsd: number; fetchImpl?: typeof fetch }) {
  const budget = createEstimatedBudget(options.maxUsd, options.reserveUsd), rows = [];
  for (const item of cases) {
    if (budget.stopped) break;
    budget.reserve(item.id); const start = performance.now(); let cost: number | null = null, row: any;
    try {
      const response = await (options.fetchImpl ?? fetch)(JEV_DECISIONS_URL, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { authorization: 'Bearer ' + options.key, 'content-type': 'application/json' },
        body: JSON.stringify({ ...buildJevRuntimeDecisionRequest(item.query), session_id: randomUUID(), provider: { data_collection: 'deny' } }) });
      const body = await response.json();
      if (typeof body?.usage?.cost === 'number' && Number.isFinite(body.usage.cost) && body.usage.cost >= 0) cost = body.usage.cost;
      if (!response.ok) throw Error('Provider HTTP ' + response.status);
      const decision = parseDecision(body), language = schoolReplyLanguage(item.query);
      const accepted = language !== null && acceptsWithQueryGuardV6(decision, item.query, 0.8);
      const plan = accepted ? jevReplyPlan(decision.choice, language!, '2026-2027', item.query, '2026-10-09') : null;
      row = { id: item.id, expected: item.intent, decision, language, accepted: Boolean(plan),
        correctClassification: decision.choice === item.intent, acceptedWrong: Boolean(plan) && decision.choice !== item.intent,
        plannedTools: plan && 'calls' in plan ? plan.calls.map(x => x.name) : [] };
    } catch (error) { row = { id: item.id, expected: item.intent, error: String((error as Error).message), accepted: false, correctClassification: false, acceptedWrong: false, plannedTools: [] }; }
    budget.settle(item.id, cost === null ? null : { pricingFound: true, totalCost: cost });
    rows.push({ ...row, costUsd: cost, ms: performance.now() - start });
  }
  return { rows, budget: budget.snapshot() };
}

if (import.meta.main) {
  const args = process.argv.slice(2), option = (name: string) => args.find(x => x.startsWith('--' + name + '='))?.slice(name.length + 3);
  if (args.some(x => !['--plan', '--execute'].includes(x) && !['output', 'plan-file', 'previous'].some(n => x.startsWith('--' + n + '=')))) throw Error('Unknown option');
  const path = 'datasets/chatbot-latency/jev-fresh-darija-20261009.json', corpus = JSON.parse(readFileSync(path, 'utf8'));
  const priorPaths = readdirSync('datasets/chatbot-latency').filter(x => x.endsWith('.json') && x !== path.split('/').at(-1)).map(x => 'datasets/chatbot-latency/' + x);
  const prior = priorPaths.flatMap(p => (JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/u, '')).cases ?? []).filter((x: any) => typeof x?.query === 'string'));
  const cases = validateFreshDarija(corpus, prior), sources = [path, import.meta.path,
    'scripts/chatbot-budget.mjs', 'packages/server/src/modules/chat/jevRuntimeWording.ts', 'packages/server/src/modules/chat/jevIntents.ts',
    'packages/server/src/modules/chat/jevQueryGuard.ts', 'packages/server/src/modules/chat/jevGuard/queryV6.ts',
    'packages/server/src/modules/chat/jevGuard/examsV6.ts', 'packages/server/src/modules/chat/schoolFilteredReplies.ts',
    'packages/server/src/modules/chat/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/jevReplyPlan.ts'];
  const sourceHashes = Object.fromEntries(sources.map(p => [p, sha(p)])), fingerprint = createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex');
  const output = option('output'); if (!output || existsSync(output)) throw Error('Supply new output path');
  if (args.includes('--plan') === args.includes('--execute')) throw Error('Select plan or execute');
  const policy = { cases: cases.map((x: any) => x.id), maxRequests: cases.length, maxEstimatedUsd: 0.015, requestReserveUsd: 0.00015,
    retries: 0, sourceHashes, fingerprint, priorCorporaChecked: priorPaths.length, independentNativeAcceptance: false, scope: 'classification and counterfactual guarded tool plan only; no School tool execution' };
  if (args.includes('--plan')) { writeFileSync(output, JSON.stringify(policy, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ planned: cases.length, priorCorporaChecked: priorPaths.length, paidCalls: 0 })); }
  else {
    const plan = JSON.parse(readFileSync(option('plan-file') ?? ''));
    if (JSON.stringify(plan) !== JSON.stringify(policy) || !process.env.OPENROUTER_API_KEY) throw Error('Frozen plan/source mismatch or missing key');
    const previousPaths = option('previous')?.split(',') ?? [], previous = previousPaths.map(p => JSON.parse(readFileSync(p)));
    if (previous.some(p => p.fingerprint !== fingerprint)) throw Error('Different previous source');
    const completed = previous.flatMap(p => p.rows);
    if (new Set(completed.map(x => x.id)).size !== completed.length || completed.some((x, i) => x.id !== cases[i]?.id)) throw Error('Duplicate or out-of-order prior dispatch');
    const remaining = plan.maxEstimatedUsd - completed.reduce((sum, r) => sum + (r.costUsd ?? plan.requestReserveUsd), 0);
    const result = await runFreshProbe(cases.slice(completed.length), { key: process.env.OPENROUTER_API_KEY, maxUsd: remaining, reserveUsd: plan.requestReserveUsd });
    const all = [...completed, ...result.rows];
    const report = { fingerprint, ...result, totalCompleted: all.length, status: all.length === cases.length ? 'completed' : 'stopped',
      overall: { classifiedCorrectly: all.filter(x => x.correctClassification).length, errors: all.filter(x => x.error).length,
        accepted: all.filter(x => x.accepted).length, acceptedWrong: all.filter(x => x.acceptedWrong).length }, prior: previousPaths, independentNativeAcceptance: false };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ status: report.status, completed: all.length, ...report.overall }));
  }
}
