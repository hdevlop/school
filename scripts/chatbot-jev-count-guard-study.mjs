/** Offline replay/development only. Uses saved decisions and never dispatches a classifier or app call. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { buildDecisionRequest, parseDecision, validateCases } from './chatbot-jev.mjs';
import { compareCountGuard, countQueryVeto, COUNT_GUARD_VERSION } from './chatbot-jev-count-guard.mjs';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/replies/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/replies/schoolReplyTemplates.ts';

const args = process.argv.slice(2);
if (args.length < 1 || args.length > 3 || !args[0].startsWith('--output=') || !args[0].slice('--output='.length).trim()
  || args.slice(1).some(arg => !['--current-language-profile', '--current-reply-profile', '--current-protocol-profile'].includes(arg))) {
  throw new Error('Use --output=<new-json> with explicit current language/reply/protocol profile flags for offline re-evaluation');
}
const currentReplyProfile = args.includes('--current-reply-profile');
const currentLanguageProfile = args.includes('--current-language-profile') || currentReplyProfile;
const currentProtocolProfile = args.includes('--current-protocol-profile');
const outputPath = resolve(args[0].slice('--output='.length));
if (await Bun.file(outputPath).exists()) throw new Error('Offline study output already exists');
const read = path => Bun.file(path).json();
const hash = async path => createHash('sha256').update(await Bun.file(path).text()).digest('hex');
const original = await read('docs/evidence/chatbot-latency/jev-core-final-analysis-20261005.json');
const measuredPlan = await read('docs/evidence/chatbot-latency/jev-core-finish-plan-20261005.json');
const sourcePaths = ['scripts/chatbot-jev-count-guard.mjs', 'scripts/chatbot-jev-count-guard-study.mjs',
  'scripts/chatbot-jev.mjs', 'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts',
  'packages/server/src/modules/chat/replies/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/replies/schoolListReplies.ts',
  'packages/server/src/modules/chat/replies/schoolReplyWrite.ts',
  'datasets/chatbot-latency/jev-count-guard-dev.json'];
const sourceSha256 = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, await hash(path)])));
if (currentProtocolProfile) sourceSha256['packages/server/src/modules/chat/jev/jevIntents.ts'] = await hash('packages/server/src/modules/chat/jev/jevIntents.ts');
const changedMeasuredSources = sourcePaths.slice(2, -1).filter(path => sourceSha256[path] !== measuredPlan.sourceSha256[path]);
for (const path of changedMeasuredSources) {
  const allowed = path === 'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts'
    || currentProtocolProfile && path === 'scripts/chatbot-jev.mjs'
    || currentReplyProfile && ['packages/server/src/modules/chat/replies/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/replies/schoolReplyWrite.ts', 'packages/server/src/modules/chat/replies/schoolListReplies.ts'].includes(path);
  if (!currentLanguageProfile || !allowed) {
    throw new Error(`Measured classification source changed: ${path}`);
  }
}
const corpusPath = 'datasets/chatbot-latency/jev-core-exploration.json';
const corpusHash = await hash(corpusPath);
const corpus = await read(corpusPath);
const byId = new Map(validateCases(corpus.cases).map(item => [item.id, item]));
const rows = [];
const pairs = new Set();
let replayed = 0;
for (const [path, expectedHash] of Object.entries(original.reportHashes)) {
  if (await hash(path) !== expectedHash) throw new Error('Historical raw report changed');
  const report = await read(path);
  if (report.corpusSha256 !== corpusHash || !isDeepStrictEqual(report.requestShape, buildDecisionRequest('<query>'))) {
    throw new Error('Measured corpus/request differs from current replay input');
  }
  for (const sample of report.samples) {
    const item = byId.get(sample.id);
    const pair = `${sample.repetition}:${sample.id}`;
    if (!item || pairs.has(pair)) throw new Error('Unknown or duplicate replay case/repetition');
    pairs.add(pair);
    if (sample.decision) {
      const saved = sample.decision;
      const parsed = parseDecision({ model: saved.model, usage: { input_tokens: saved.inputTokens, cost: saved.costUsd },
        answers: { intent: { type: 'choice', choice: saved.choice, confidence: saved.confidence, probabilities: saved.probabilities },
          is_write: { type: 'noul', noul: saved.writeProbability } } });
      if (!isDeepStrictEqual(saved, parsed)) throw new Error('Normalized decision changed');
      replayed++;
    }
    rows.push({ ...sample, item });
  }
}
const candidates = rows.filter(row => {
  const language = schoolReplyLanguage(row.item.query);
  return language != null && !schoolReplyTemplate({ userText: row.item.query, language, channel: 'web' }, '2026-2027');
});
const comparison = compareCountGuard(candidates);
const measured = original.classification.afterLanguageAndRegex;
const originalCountsReproduced = comparison.before.samples === measured.accepted && comparison.before.questions === measured.acceptedCases
  && comparison.before.wrongSamples === measured.acceptedWrong && comparison.before.wrongQuestions === measured.wrongCaseCount;
if (!originalCountsReproduced && !currentLanguageProfile) {
  throw new Error('Original eligibility/acceptance recount does not match measured analysis');
}
const development = await read('datasets/chatbot-latency/jev-count-guard-dev.json');
validateCases(development.cases);
if (development.purpose !== 'count-guard-development' || development.cases.some(item => item.source !== 'assistant'
  || item.split !== 'dev' || !['student_count', 'teacher_count', 'student_and_teacher_count'].includes(item.proposedChoice)
  || typeof item.expectedVeto !== 'boolean')) throw new Error('Invalid development corpus');
const devChecks = development.cases.map(item => ({ id: item.id, expectedVeto: item.expectedVeto,
  actualVeto: countQueryVeto(item.query, item.proposedChoice) !== null,
  intentionalCorrectAbstention: item.knownConservativeAbstention === true,
  semanticLabel: item.intent, proposedChoice: item.proposedChoice }));
if (devChecks.some(item => item.actualVeto !== item.expectedVeto)) throw new Error('Development expectation failed');
const output = { capturedAtUtc: new Date().toISOString(), mode: 'offline-post-result-development', guardVersion: COUNT_GUARD_VERSION,
  liveProviderRequests: 0, schoolAppToolDatabaseCalls: 0, parsedDecisionsReplayed: replayed,
  totalSavedAttempts: rows.length, eligibleSavedAttempts: candidates.length,
  languageProfile: currentLanguageProfile ? 'current-post-result' : 'measured', changedMeasuredSources,
  replyProfile: currentReplyProfile ? 'current-post-result' : 'measured',
  protocolProfile: currentProtocolProfile ? 'current-shared-owner-request-and-310-decisions-equivalence-checked' : 'measured',
  originalEligibilityAndAcceptanceReproduced: changedMeasuredSources.length === 0 && originalCountsReproduced,
  originalAcceptanceCountsReproduced: originalCountsReproduced,
  originalMeasuredAcceptance: { samples: measured.accepted, questions: measured.acceptedCases,
    wrongSamples: measured.acceptedWrong, wrongQuestions: measured.wrongCaseCount },
  historicalRawReportsChanged: false,
  historicalReportSha256: original.reportHashes, sourceSha256,
  devChecks, comparison,
  comparisonsByLanguage: Object.fromEntries(['fr', 'ar', 'ary', 'ary-latn'].map(language => [language,
    compareCountGuard(candidates.filter(row => row.item.language === language))])),
  nativeAuthoredOrReviewedCases: 0, productionAcceptance: false, runtimeGuardEnabled: false, jevEnabled: false,
  limitations: ['Spent synthetic records and assistant-authored dev expectations, not fresh held-out validation',
    'Name/list terms under negation or quotation also cause abstention; coverage losses remain visible',
    'Finite token forms do not validate every qualifier or prove a remaining count decision correct',
    'No actual reply, tool, readiness race, provider call or production integration was measured',
    'Fresh independent/native acceptance and later integration gates remain required'],
};
await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output: outputPath, replayed, devChecks: devChecks.length,
  before: comparison.before, after: comparison.after, preventedWrong: comparison.preventedWrong,
  lostCorrect: comparison.lostCorrect, productionAcceptance: false }, null, 2));
