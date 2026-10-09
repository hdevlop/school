/** Counterfactual guard checks and virtual readiness replay; never performs I/O against an API. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { ACCEPTANCE_POLICIES, validateCases } from './chatbot-jev.mjs';
import { acceptsWithQueryGuardV3, queryVetoV3 } from './chatbot-jev-query-guard-v3.mjs';
import { acceptsWithQueryGuardV4, queryVetoV4 } from './chatbot-jev-query-guard-v4.mjs';
import { acceptsWithQueryGuardV5, queryVetoV5 } from './chatbot-jev-query-guard-v5.mjs';
import { jevTurnEligibility, selectJevReplyPreparation } from './chatbot-reply-readiness.mjs';
import { replayFixStudy } from './chatbot-jev-fix-study.mjs';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/replies/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/replies/schoolReplyTemplates.ts';

const profile = item => {
  const language = schoolReplyLanguage(item.query);
  const baseline = schoolReplyTemplate({ userText: item.query, language, channel: 'web' }, '2026-2027');
  const turn = { mode: 'on', regexMatched: baseline !== null, language, channel: 'web',
    isAdminUser: true, historyComplete: true, priorUserTurns: 0 };
  return { baseline, turn, eligibility: jevTurnEligibility(turn) };
};

const guardFor = version => {
  if (![3, 4, 5].includes(version)) throw new Error('Use guard version 3, 4 or 5');
  if (version === 5) return { accept: acceptsWithQueryGuardV5, veto: queryVetoV5 };
  return version === 4 ? { accept: acceptsWithQueryGuardV4, veto: queryVetoV4 }
    : { accept: acceptsWithQueryGuardV3, veto: queryVetoV3 };
};

export function counterfactualGuardStudy(cases, guardVersion = 3) {
  validateCases(cases);
  const guard = guardFor(guardVersion);
  const choices = ACCEPTANCE_POLICIES.core.filter(choice => choice !== 'write_request');
  const rows = [];
  let eligibleCases = 0;
  for (const item of cases) {
    if (!profile(item).eligibility.eligible) continue;
    eligibleCases++;
    for (const choice of choices) {
      if (choice === item.intent) continue;
      // Deliberately inject a wrong high-confidence, low-write decision.
      // This is a fault scenario, not a provider prediction or estimated probability.
      const decision = { choice, confidence: 0.99, writeProbability: 0 };
      rows.push({ id: item.id, query: item.query, provisionalIntent: item.intent, forcedChoice: choice,
        veto: guard.veto(item.query, choice), passed: guard.accept(decision, item.query) });
    }
  }
  const remaining = rows.filter(row => row.passed);
  return { mode: 'injected-wrong-decisions-not-model-results', guardVersion, providerCalls: 0, eligibleCases,
    forcedWrongPairs: rows.length, vetoedPairs: rows.length - remaining.length,
    unblockedPairs: remaining.length, casesWithUnblockedWrongChoice: new Set(remaining.map(row => row.id)).size,
    writeCasesWithUnblockedReadChoice: new Set(remaining.filter(row => row.provisionalIntent === 'write_request').map(row => row.id)).size,
    unblockedByForcedChoice: Object.fromEntries(choices.map(choice => [choice, remaining.filter(row => row.forcedChoice === choice).length])),
    limitations: ['Artificial failures demonstrate guard limitations, not observed Jev errors or their likelihood.',
      'Provisional assistant labels are not independent ground truth.',
      'The baseline was prepared but never executed; no School tools or records were accessed.'], rows };
}

function virtualClock() {
  let now = 0, serial = 0;
  const pending = new Map();
  return { get now() { return now; }, get pending() { return pending.size; },
    setTimer(callback, delay) { const id = ++serial; pending.set(id, { callback, at: now + delay }); return id; },
    clearTimer(id) { pending.delete(id); },
    async drain() {
      for (let steps = 0; steps < 20; steps++) {
        for (let index = 0; index < 12; index++) await Promise.resolve();
        const next = [...pending.entries()].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) return;
        pending.delete(next[0]); now = next[1].at; next[1].callback();
      }
      throw new Error('Virtual scheduler failed to settle');
    } };
}

export async function readinessReplay(cases, samples, routingReadyMs, templateTimeoutMs = 800, guardVersion = 3) {
  if (!Number.isFinite(routingReadyMs) || routingReadyMs < 0) throw new Error('Invalid assumed routing time');
  const guard = guardFor(guardVersion);
  validateCases(cases);
  const byId = new Map(cases.map(item => [item.id, item]));
  const seen = new Set();
  const rows = [];
  for (const sample of samples) {
    const item = byId.get(sample.id);
    if (!item || seen.has(sample.id) || !Number.isFinite(sample.durationMs) || sample.durationMs < 0) {
      throw new Error('Need unique known attempts with finite recorded durations');
    }
    seen.add(sample.id);
    const { baseline, turn } = profile(item);
    if (baseline) {
      rows.push({ id: item.id, kind: 'baseline', selectedAtMs: 0, classifierStarted: false, fallbackDelayMs: 0 });
      continue;
    }
    const time = virtualClock();
    let classifierStarted = false, selectedAtMs = null;
    const selection = selectJevReplyPreparation({ turn, templateTimeoutMs,
      setTimer: time.setTimer, clearTimer: time.clearTimer,
      routing: () => new Promise(resolve => time.setTimer(() => resolve({ hypotheticalRouting: true }), routingReadyMs)),
      template: () => {
        classifierStarted = true;
        return new Promise((resolve, reject) => time.setTimer(() => {
          if (sample.error || !sample.decision) { reject(new Error('Replayed failed classifier attempt')); return; }
          resolve(guard.accept(sample.decision, item.query) ? { hypotheticalCandidate: true } : null);
        }, sample.durationMs));
      },
    });
    selection.then(() => { selectedAtMs = time.now; });
    await time.drain();
    const result = await selection;
    if (selectedAtMs === null || time.pending) throw new Error('Selection did not settle cleanly');
    rows.push({ id: item.id, kind: result.kind, selectedAtMs, classifierStarted,
      templateOutcome: result.templateOutcome,
      fallbackDelayMs: result.kind === 'model' ? selectedAtMs - routingReadyMs : 0 });
  }
  return { mode: 'virtual-replay-not-live-latency', guardVersion, assumedRoutingReadyMs: routingReadyMs, templateTimeoutMs,
    attemptsReplayed: rows.length, baselineSelections: rows.filter(row => row.kind === 'baseline').length,
    classifierFactoriesStarted: rows.filter(row => row.classifierStarted).length,
    guardedCandidateWins: rows.filter(row => row.kind === 'template').length,
    modelFallbacks: rows.filter(row => row.kind === 'model').length,
    maximumFallbackDelayMs: Math.max(0, ...rows.map(row => row.fallbackDelayMs)),
    limitations: ['Routing time is assumed and unpaired with classifier observations.',
      'Recorded classifier durations came from a different, serial probe with a ten-second request deadline.',
      'Factories create placeholders only. No answers, tool execution, full-chat latency, cost savings or real cancellation billing were measured.'], rows };
}

export function compareSavedGuardCoverage(cases, samples, guardVersion = 4) {
  const guard = guardFor(guardVersion);
  const byId = new Map(cases.map(item => [item.id, item]));
  const before = [], after = [];
  for (const sample of samples) {
    const item = byId.get(sample.id);
    if (!item) throw new Error('Saved sample has an unknown ID');
    if (!profile(item).eligibility.eligible) continue;
    const row = { id: sample.id, repetition: sample.repetition, provisionalIntent: item.intent,
      choice: sample.decision?.choice, correct: sample.decision?.choice === item.intent };
    if (acceptsWithQueryGuardV3(sample.decision, item.query)) before.push(row);
    if (guard.accept(sample.decision, item.query)) after.push(row);
  }
  const selected = new Set(after.map(row => `${row.id}:${row.repetition}`));
  const lost = before.filter(row => !selected.has(`${row.id}:${row.repetition}`));
  return { before: { acceptedAttempts: before.length, wrongAttempts: before.filter(row => !row.correct).length },
    after: { acceptedAttempts: after.length, wrongAttempts: after.filter(row => !row.correct).length },
    lostCorrectAttempts: lost.filter(row => row.correct).length,
    lostCorrectCases: [...new Set(lost.filter(row => row.correct).map(row => row.id))],
    declined: lost };
}

async function main() {
  const out = process.argv[2]?.startsWith('--out=') ? process.argv[2].slice(6) : null;
  if (!out || process.argv.length !== 3) throw new Error('Use --out=NEW_PATH');
  const inputSha256 = {};
  const read = async (path, expected) => {
    const text = await Bun.file(path).text();
    const sha = createHash('sha256').update(text).digest('hex');
    if (expected && expected !== sha) throw new Error('Saved evidence changed: ' + path);
    inputSha256[path] = sha;
    return JSON.parse(text);
  };
  const stress = await read('datasets/chatbot-latency/jev-fresh-stress304-20261007.json');
  const proof = await read('docs/evidence/chatbot-latency/jev-fixes-regression100-analysis-20261007.json');
  const corpus = await read('datasets/chatbot-latency/jev-fixes-regression100-20261007.json', proof.corpusSha256);
  const reports = [];
  for (const entry of proof.reports) reports.push(await read(entry.path, entry.sha256));
  // Reparse and validate the preserved decisions before using their durations.
  const validation = replayFixStudy(corpus, reports);
  if (validation.attempts !== 100 || validation.valid !== 99) throw new Error('Unexpected saved recheck coverage');
  const samples = reports.flatMap(report => report.samples);
  const readiness = [];
  for (const version of [3, 4]) for (const delay of [0, 50, 100, 250, 500, 800, 1200]) {
    readiness.push(await readinessReplay(corpus.cases, samples, delay, 800, version));
  }
  const savedCoverage = { regression100: compareSavedGuardCoverage(corpus.cases, samples) };
  const coreProof = await read('docs/evidence/chatbot-latency/jev-core-final-analysis-20261005.json');
  const coreReports = [];
  for (const [path, sha] of Object.entries(coreProof.reportHashes)) coreReports.push(await read(path, sha));
  const core = await read('datasets/chatbot-latency/jev-core-exploration.json');
  replayFixStudy(core, coreReports);
  savedCoverage.core = compareSavedGuardCoverage(core.cases, coreReports.flatMap(report => report.samples));
  const draft = await read('datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json');
  for (const [name, path] of [['draftV3', 'docs/evidence/chatbot-latency/jev-draft-probe96-run-20261006.json'],
    ['draftV4', 'docs/evidence/chatbot-latency/jev-v4-probe96-run-20261006.json']]) {
    const report = await read(path);
    replayFixStudy(draft, [report]);
    savedCoverage[name] = compareSavedGuardCoverage(draft.cases, report.samples);
  }
  const development = await read('datasets/chatbot-latency/jev-moroccan-development.json');
  const broadFaultChecks = {
    development960: counterfactualGuardStudy(development.cases, 4),
    core104: counterfactualGuardStudy(core.cases, 4),
  };
  const sourceSha256 = {};
  for (const path of ['scripts/chatbot-jev-offline-safety-study.mjs', 'scripts/chatbot-reply-readiness.mjs',
    'scripts/chatbot-jev-query-guard-v3.mjs', 'scripts/chatbot-jev-query-guard-v4.mjs', 'scripts/chatbot-jev-fix-study.mjs',
    'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/replies/schoolReplyTemplates.ts',
    'packages/server/src/modules/chat/replies/schoolReplyWrite.ts']) sourceSha256[path] = createHash('sha256').update(await Bun.file(path).text()).digest('hex');
  const report = { mode: 'offline-counterfactual-and-readiness-study', providerCalls: 0, schoolToolCalls: 0,
    jevEnabled: false, productionAcceptance: false, inputSha256, sourceSha256,
    guardStress: counterfactualGuardStudy(stress.cases, 3), guardStressV4: counterfactualGuardStudy(stress.cases, 4),
    savedCoverage, broadFaultChecks, readiness };
  await writeFile(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ guardStress: { ...report.guardStress, rows: undefined },
    guardStressV4: { ...report.guardStressV4, rows: undefined },
    savedCoverage: Object.fromEntries(Object.entries(savedCoverage).map(([name, row]) => [name, {
      before: row.before, after: row.after, lostCorrectAttempts: row.lostCorrectAttempts }])),
    broadFaultChecks: Object.fromEntries(Object.entries(broadFaultChecks).map(([name, row]) => [name, {
      eligibleCases: row.eligibleCases, forcedWrongPairs: row.forcedWrongPairs, unblockedPairs: row.unblockedPairs }])),
    readiness: readiness.map(row => ({ guardVersion: row.guardVersion, assumedRoutingReadyMs: row.assumedRoutingReadyMs,
      baselineSelections: row.baselineSelections, guardedCandidateWins: row.guardedCandidateWins,
      modelFallbacks: row.modelFallbacks, maximumFallbackDelayMs: row.maximumFallbackDelayMs })) }, null, 2));
}

if (import.meta.main) await main();
