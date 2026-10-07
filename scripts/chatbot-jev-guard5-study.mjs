/** Replay frozen model results with a new offline guard; no API or School calls. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { compareSavedGuardCoverage, counterfactualGuardStudy } from './chatbot-jev-offline-safety-study.mjs';
import { replayFixStudy } from './chatbot-jev-fix-study.mjs';
import { explainQueryVetoV5 } from './chatbot-jev-query-guard-v5.mjs';

async function main() {
  const out = process.argv[2]?.startsWith('--out=') ? process.argv[2].slice(6) : null;
  if (!out || process.argv.length !== 3) throw new Error('Use --out=NEW_PATH');
  const inputSha256 = {};
  const read = async (path, expected) => {
    const text = await Bun.file(path).text();
    const sha = createHash('sha256').update(text).digest('hex');
    if (expected && sha !== expected) throw new Error('Frozen evidence changed: ' + path);
    inputSha256[path] = sha;
    return JSON.parse(text);
  };
  const execution = await read('docs/evidence/chatbot-latency/jev-stress304-guard4-execution-20261007.json');
  const stress = await read(execution.corpus, execution.corpusSha256);
  const run = await read(execution.runOutput);
  const measuredAnalysis = await read('docs/evidence/chatbot-latency/jev-stress304-guard4-analysis-20261007.json');
  if (inputSha256[execution.runOutput] !== measuredAnalysis.inputSha256[execution.runOutput]) throw new Error('Measured report changed');
  for (const [path, expected] of Object.entries(execution.sourceSha256)) {
    if (createHash('sha256').update(await Bun.file(path).text()).digest('hex') !== expected) throw new Error('Measured source changed: ' + path);
  }
  const coverage = {};
  const compare = (name, corpus, reports) => {
    replayFixStudy(corpus, reports);
    const samples = reports.flatMap(report => report.samples);
    coverage[name] = { measuredGuard4: compareSavedGuardCoverage(corpus.cases, samples, 4),
      candidateGuard5: compareSavedGuardCoverage(corpus.cases, samples, 5) };
  };
  compare('stress304', stress, [run]);
  const regressionProof = await read('docs/evidence/chatbot-latency/jev-fixes-regression100-analysis-20261007.json');
  const regression = await read('datasets/chatbot-latency/jev-fixes-regression100-20261007.json', regressionProof.corpusSha256);
  const regressionReports = [];
  for (const entry of regressionProof.reports) regressionReports.push(await read(entry.path, entry.sha256));
  compare('regression100', regression, regressionReports);
  const core = await read('datasets/chatbot-latency/jev-core-exploration.json');
  const coreProof = await read('docs/evidence/chatbot-latency/jev-core-final-analysis-20261005.json');
  const coreReports = [];
  for (const [path, sha] of Object.entries(coreProof.reportHashes)) coreReports.push(await read(path, sha));
  compare('core', core, coreReports);
  const draft = await read('datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json');
  for (const [name, path] of [['draftV3', 'docs/evidence/chatbot-latency/jev-draft-probe96-run-20261006.json'],
    ['draftV4', 'docs/evidence/chatbot-latency/jev-v4-probe96-run-20261006.json']]) compare(name, draft, [await read(path)]);
  const development = await read('datasets/chatbot-latency/jev-moroccan-development.json');
  const faultChecks = { stress304: counterfactualGuardStudy(stress.cases, 5),
    development960: counterfactualGuardStudy(development.cases, 5), core104: counterfactualGuardStudy(core.cases, 5) };
  const byId = new Map(stress.cases.map(item => [item.id, item]));
  const originallyDeclined = new Set(measuredAnalysis.guard3.declined.map(row => row.id));
  const restoredExtraDeclines = measuredAnalysis.guard4.declined.filter(row => !originallyDeclined.has(row.id))
    .map(row => ({ id: row.id, choice: row.choice, ...explainQueryVetoV5(byId.get(row.id).query, row.choice) }));
  const sourceSha256 = {};
  for (const path of ['scripts/chatbot-jev-guard5-study.mjs', 'scripts/chatbot-jev-query-guard-v5.mjs',
    'scripts/chatbot-jev-offline-safety-study.mjs']) sourceSha256[path] = createHash('sha256').update(await Bun.file(path).text()).digest('hex');
  const output = { mode: 'post-result-development-replay', providerCalls: 0, schoolToolCalls: 0,
    jevEnabled: false, productionAcceptance: false, inputSha256, sourceSha256, measuredSourcesUnchanged: true,
    coverage, restoredExtraDeclines, faultChecks,
    limitations: ['Guard5 was tuned using saved results and assistant labels; not untouched held-out accuracy.',
      'All latency and cost measurements belong to the unchanged guard4 run.',
      'Fault injection covers tested synthetic case/choice pairs, not every possible semantic error.'] };
  await writeFile(out, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ coverage: Object.fromEntries(Object.entries(coverage).map(([name, row]) => [name, {
    guard4: row.measuredGuard4.after, guard5: row.candidateGuard5.after,
    lostCorrect: row.candidateGuard5.lostCorrectAttempts }])),
    restored: restoredExtraDeclines.filter(row => row.veto === null).length,
    faultChecks: Object.fromEntries(Object.entries(faultChecks).map(([name, row]) => [name, {
      pairs: row.forcedWrongPairs, unblocked: row.unblockedPairs }])) }, null, 2));
}

if (import.meta.main) await main();
