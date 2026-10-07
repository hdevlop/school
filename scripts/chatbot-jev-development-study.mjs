/** Offline analysis of a single-repetition assistant development probe. Never fetches. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/schoolReplyTemplates.ts';
import { JEV_MODEL, accepts, buildDecisionRequest, parseDecision, summarize, latency, validateCases } from './chatbot-jev.mjs';
import { compareCountGuard } from './chatbot-jev-count-guard.mjs';
import { buildDecisionRequestV4 } from './chatbot-jev-wording-v4.mjs';

export function analyzeDevelopmentProbe(corpus, report) {
  const writeWordingVersion = report?.writeWordingVersion ?? 3;
  const expectedRequest = writeWordingVersion === 4 ? buildDecisionRequestV4 : buildDecisionRequest;
  if (corpus?.developmentOnly !== true || corpus.baseCorpus || !Array.isArray(corpus.cases)
    || !corpus.cases.length || corpus.cases.some(item => item?.source !== 'assistant' || item.split !== 'dev' || !item.familyId)
    || report?.split !== 'dev' || report.repetitions !== 1 || report.acceptancePolicy !== 'core'
    || report.gateThreshold !== 0.8 || report.model !== JEV_MODEL || !Array.isArray(report.samples)
    || ![3, 4].includes(writeWordingVersion)
    || !isDeepStrictEqual(report.requestShape, expectedRequest('<query>'))) {
    throw new Error('Expected a synthetic dev-only single-repetition core probe frozen at 0.8');
  }
  validateCases(corpus.cases);
  const byId = new Map(corpus.cases.map(item => [item.id, item]));
  const seen = new Set();
  const rows = report.samples.map((sample, index) => {
    const item = byId.get(sample.id);
    if (!item || item.id !== corpus.cases[index]?.id || sample.repetition !== 1 || seen.has(item.id)
      || !Number.isFinite(sample.durationMs) || sample.durationMs < 0) throw new Error('Unknown, duplicate or out-of-order probe attempt');
    seen.add(item.id);
    if (sample.decision) {
      const value = sample.decision;
      const parsed = parseDecision({ model: value.model, usage: { input_tokens: value.inputTokens, cost: value.costUsd },
        answers: { intent: { type: 'choice', choice: value.choice, confidence: value.confidence, probabilities: value.probabilities },
          is_write: { type: 'noul', noul: value.writeProbability } } });
      if (!isDeepStrictEqual(value, parsed) || sample.reportedCostUsd !== value.costUsd) throw new Error('Saved decision or reported cost mismatch');
    }
    const detectedLanguage = schoolReplyLanguage(item.query);
    const template = schoolReplyTemplate({ userText: item.query, language: detectedLanguage, channel: 'web' }, '2026-2027');
    return { ...sample, item, detectedLanguage, templateMatched: template !== null };
  });
  const candidates = rows.filter(row => row.detectedLanguage !== null && !row.templateMatched);
  // Translation-linked questions do not justify an independent binomial bound.
  const score = subset => ({ ...summarize(subset, 0.8, true, 'core'), errorUpperBound95: null });
  const durations = subset => {
    const values = subset.filter(row => row.decision).map(row => row.durationMs);
    return { ...latency(subset), mean: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
  };
  const wrongChoices = rows.filter(row => row.decision && row.decision.choice !== row.item.intent);
  const knownCosts = rows.filter(row => Number.isFinite(row.reportedCostUsd) && row.reportedCostUsd >= 0);
  const keyBefore = report.keyUsageBefore?.usage;
  const keyAfter = report.keyUsageAfter?.usage;
  return { stage: 'assistant-authored synthetic development', productionAcceptance: false, jevEnabled: false,
    writeWordingVersion,
    threshold: 0.8, acceptancePolicy: 'core', plannedQuestions: corpus.cases.length, attempts: rows.length,
    complete: rows.length === corpus.cases.length && !report.stoppedReason,
    validDecisions: rows.filter(row => row.decision).length, stoppedReason: report.stoppedReason,
    all: score(rows), afterLanguageAndRegex: score(candidates),
    prototypeCountGuard: compareCountGuard(candidates, { threshold: 0.8, policy: 'core' }),
    classifierLatencyMs: { all: durations(rows), warm: durations(rows.slice(1)) },
    byLanguage: Object.fromEntries([...new Set(corpus.cases.map(item => item.language))].map(language => {
      const group = rows.filter(row => row.item.language === language);
      return [language, { attempts: group.length, summary: score(group),
        candidateSummary: score(group.filter(row => row.detectedLanguage !== null && !row.templateMatched)),
        classifierLatencyMs: durations(group) }];
    })),
    languageSkipped: rows.filter(row => row.detectedLanguage === null).map(row => row.item.id),
    baselineMatched: rows.filter(row => row.templateMatched).map(row => row.item.id),
    wrongChoices: wrongChoices.map(row => ({ id: row.item.id, query: row.item.query,
      provisionalLabel: row.item.intent, choice: row.decision.choice, confidence: row.decision.confidence,
      writeProbability: row.decision.writeProbability, detectedLanguage: row.detectedLanguage })),
    writeDisagreements: rows.filter(row => row.decision && (row.decision.writeProbability >= 0.5) !== row.item.isWrite)
      .map(row => ({ id: row.item.id, query: row.item.query, isWrite: row.item.isWrite,
        choice: row.decision.choice, confidence: row.decision.confidence, writeProbability: row.decision.writeProbability,
        highConfidenceAcceptanceBlocked: accepts(row.decision, 0.8, false, 'core') && !accepts(row.decision, 0.8, true, 'core') })),
    errors: rows.filter(row => row.error).map(row => ({ id: row.item.id, error: row.error, reportedCostUsd: row.reportedCostUsd })),
    accounting: { knownRequestCostsUsd: knownCosts.reduce((sum, row) => sum + row.reportedCostUsd, 0),
      requestsWithKnownCost: knownCosts.length, requestsWithUnknownCost: rows.length - knownCosts.length,
      retainedReservationUsd: report.estimatedBudget?.reservedUsd ?? null,
      keyBefore, keyAfter, observedKeyDeltaUsd: Number.isFinite(keyBefore) && Number.isFinite(keyAfter) ? keyAfter - keyBefore : null,
      note: 'Key delta is a shared aggregate window, possibly unsettled. It is not an isolated per-request invoice.' },
    nativeAuthoredCases: 0, humanReviewedCases: 0,
    limitations: ['Provisional assistant labels and linked translations; not native or independent acceptance or error-bound evidence.',
      'One repetition cannot establish stability. Each language includes only two write families.',
      'No reply rendering, authenticated tool execution or readiness-race time was measured.',
      'Count-veto results are a development replay, outside the app. No thresholds or labels changed after results.'] };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args.some(arg => !/^--(?:cases|report|out)=.+$/.test(arg))
    || ['cases', 'report', 'out'].some(name => args.filter(arg => arg.startsWith(`--${name}=`)).length !== 1)) {
    throw new Error('Use --cases=PATH --report=PATH --out=NEW_PATH');
  }
  const value = name => args.find(arg => arg.startsWith(`--${name}=`)).slice(name.length + 3);
  const corpusText = await Bun.file(value('cases')).text();
  const reportText = await Bun.file(value('report')).text();
  const report = JSON.parse(reportText);
  const hash = text => createHash('sha256').update(text).digest('hex');
  if (hash(corpusText) !== report.corpusSha256) throw new Error('Frozen corpus hash mismatch');
  for (const [path, expected] of Object.entries(report.sourceSha256 ?? {})) {
    if (hash(await Bun.file(path).text()) !== expected) throw new Error(`Measured source changed: ${path}`);
  }
  const analysis = analyzeDevelopmentProbe(JSON.parse(corpusText), report);
  analysis.inputSha256 = { corpus: hash(corpusText), report: hash(reportText) };
  analysis.analyzerSha256 = hash(await Bun.file('scripts/chatbot-jev-development-study.mjs').text());
  await writeFile(value('out'), `${JSON.stringify(analysis, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(analysis, null, 2));
}

if (import.meta.main) await main();
