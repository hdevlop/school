/** Analyze the bounded development run after completion; no fetch, tool calls or evidence mutation. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { replayFixStudy } from './chatbot-jev-fix-study.mjs';
import { summarize, latency, templateIntent, ACCEPTANCE_POLICIES } from './chatbot-jev.mjs';
import { compareQueryGuardV3 } from './chatbot-jev-query-guard-v3.mjs';
import { compareQueryGuardV4, acceptsWithQueryGuardV4 } from './chatbot-jev-query-guard-v4.mjs';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/replies/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/replies/schoolReplyTemplates.ts';

const timing = rows => {
  const valid = rows.filter(row => row.decision);
  return { ...latency(rows), mean: valid.length ? valid.reduce((sum, row) => sum + row.durationMs, 0) / valid.length : null };
};

async function main() {
  const out = process.argv[2]?.startsWith('--out=') ? process.argv[2].slice(6) : null;
  if (process.argv.length !== 3 || !out) throw new Error('Use --out=NEW_PATH');
  const inputSha256 = {};
  const read = async path => {
    const text = await Bun.file(path).text();
    inputSha256[path] = createHash('sha256').update(text).digest('hex');
    return JSON.parse(text);
  };
  const executionPath = 'docs/evidence/chatbot-latency/jev-stress304-guard4-execution-20261007.json';
  const execution = await read(executionPath);
  const corpus = await read(execution.corpus);
  const report = await read(execution.runOutput);
  if (inputSha256[execution.corpus] !== execution.corpusSha256 || report.corpusSha256 !== execution.corpusSha256
    || !report.unreviewedDevelopment || report.queryGuardVersion !== 4
    || report.budgetUsd !== 0.05 || report.maxRequests !== 304 || report.repetitions !== 1
    || report.samples.length > 304 || corpus.operatorLanguageReview.status !== 'pending') {
    throw new Error('Execution scope, frozen cases or pending review does not match');
  }
  for (const [path, expected] of Object.entries(execution.sourceSha256)) {
    const sha = createHash('sha256').update(await Bun.file(path).text()).digest('hex');
    if (sha !== expected || report.sourceSha256[path] !== undefined && report.sourceSha256[path] !== expected) {
      throw new Error('Frozen source drift: ' + path);
    }
  }
  report.samples.forEach((row, index) => {
    if (row.id !== corpus.cases[index]?.id || row.repetition !== 1
      || !Number.isFinite(row.durationMs) || row.durationMs < 0) throw new Error('Non-contiguous attempt or invalid timing');
  });
  replayFixStudy(corpus, [report]); // Reparse every preserved valid decision.
  const byId = new Map(corpus.cases.map(item => [item.id, item]));
  const rows = report.samples.map(sample => {
    const item = byId.get(sample.id);
    const language = schoolReplyLanguage(item.query);
    const baseline = templateIntent(schoolReplyTemplate({ userText: item.query, language, channel: 'web' }, '2026-2027'));
    return { ...sample, item, language, baseline };
  });
  const candidates = rows.filter(row => row.language !== null && row.baseline === 'needs_llm');
  const guarded = candidates.filter(row => acceptsWithQueryGuardV4(row.decision, row.item.query));
  const baseline = rows.filter(row => row.baseline !== 'needs_llm');
  const rawSummary = subset => {
    const { errorUpperBound95: _omitted, ...result } = summarize(subset, 0.8, true, 'core');
    return result;
  };
  const known = rows.filter(row => row.reportedCostUsd !== null);
  const unknown = rows.filter(row => row.reportedCostUsd === null);
  const knownCostUsd = known.reduce((sum, row) => sum + row.reportedCostUsd, 0);
  const reserve = report.estimatedBudget.reservedUsd;
  if (report.estimatedBudget.inFlight !== 0 || report.estimatedBudget.requestsSettled !== rows.length
    || Math.abs(reserve - unknown.length * 0.00015) > 1e-9) throw new Error('Budget snapshot disagrees with attempts');
  const ledgerDelta = Number.isFinite(report.keyUsageBefore?.usage) && Number.isFinite(report.keyUsageAfter?.usage)
    ? report.keyUsageAfter.usage - report.keyUsageBefore.usage : null;
  const assessment = subset => ({ attempts: subset.length, valid: subset.filter(row => row.decision).length,
    errors: subset.filter(row => row.error).length, raw: rawSummary(subset),
    guard3: compareQueryGuardV3(subset.filter(row => row.language !== null && row.baseline === 'needs_llm')),
    guard4: compareQueryGuardV4(subset.filter(row => row.language !== null && row.baseline === 'needs_llm')),
    latencySuccessfulMs: timing(subset), unknownLanguage: subset.filter(row => row.language === null).length,
    baselineSelectionsProjected: subset.filter(row => row.baseline !== 'needs_llm').length });
  const output = { purpose: 'unreviewed-assistant-development-results', productionAcceptance: false, jevEnabled: false,
    operatorWordingReview: 'pending', inputSha256, attempts: rows.length, planned: 304,
    complete: rows.length === 304 && !report.stoppedReason, stoppedReason: report.stoppedReason,
    valid: rows.filter(row => row.decision).length,
    errors: rows.filter(row => row.error).map(row => ({ id: row.id, error: row.error, durationMs: row.durationMs })),
    latencySuccessfulMs: timing(rows), latencyWarmSuccessfulMs: timing(rows.slice(1)), raw: rawSummary(rows),
    eligibleCandidates: candidates.length, guard3: compareQueryGuardV3(candidates), guard4: compareQueryGuardV4(candidates),
    baselineProjection: { selected: baseline.length,
      wrong: baseline.filter(row => row.baseline !== row.item.intent).map(row => row.id) },
    guardedAcceptedChoices: guarded.map(row => ({ id: row.id, familyId: row.item.familyId, intent: row.decision.choice,
      provisionalLabel: row.item.intent, writeProbability: row.decision.writeProbability, durationMs: row.durationMs })),
    supportedEligibleFamilies: new Set(candidates.filter(row => ACCEPTANCE_POLICIES.core.includes(row.item.intent)).map(row => row.item.familyId)).size,
    guardedAcceptedFamilies: new Set(guarded.map(row => row.item.familyId)).size,
    combinedBaselineAndGuardedProjection: baseline.length + guarded.length,
    byLanguage: Object.fromEntries(['fr', 'ar', 'ary', 'ary-latn'].map(language => [language, assessment(rows.filter(row => row.item.language === language))])),
    rawChoiceDisagreements: rows.filter(row => row.decision && row.decision.choice !== row.item.intent)
      .map(row => ({ id: row.id, query: row.item.query, provisionalLabel: row.item.intent,
        choice: row.decision.choice, confidence: row.decision.confidence, writeProbability: row.decision.writeProbability })),
    writeScores: { validWrites: rows.filter(row => row.item.isWrite && row.decision).length,
      missedWrites: rows.filter(row => row.item.isWrite && row.decision?.writeProbability < 0.5).map(row => row.id),
      falseWriteScores: rows.filter(row => !row.item.isWrite && row.decision?.writeProbability >= 0.5).map(row => row.id) },
    accounting: { maxRequests: 304, budgetUsd: 0.05, requestReserveUsd: 0.00015, knownCostUsd,
      unknownAttempts: unknown.length, retainedUnknownReservationUsd: reserve,
      clientAccountedUsd: knownCostUsd + reserve, observedEstimatedUsd: report.estimatedBudget.observedEstimatedUsd,
      keyUsageBefore: report.keyUsageBefore, keyUsageAfter: report.keyUsageAfter, sharedKeyDeltaUsd: ledgerDelta,
      retries: 0, extraCallsAuthorized: false },
    limitations: ['Assistant wording and labels; actual operator review remains pending.',
      'Guard4 was tuned against this corpus. This is development evidence, not untouched held-out qualification.',
      'No School tool execution, rendered answers, readiness wins or full-chat latency/savings were measured.',
      'Linked variants/families are not independent native observations; no precision confidence bound is reported.',
      'Reported cost is provider metadata, not invoices; a shared-key delta does not attribute every charge.',
      'The 150-family qualification and published async integration gates remain open.'] };
  await writeFile(out, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ attempts: output.attempts, valid: output.valid, errors: output.errors.length,
    complete: output.complete, stoppedReason: output.stoppedReason, latency: output.latencySuccessfulMs,
    guard4: output.guard4.after, accounting: output.accounting }, null, 2));
}

if (import.meta.main) await main();
