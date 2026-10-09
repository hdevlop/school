/** Offline paired comparison of saved synthetic v3/v4 probes. Never sends requests. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { analyzeDevelopmentProbe } from './chatbot-jev-development-study.mjs';
import { accepts } from './chatbot-jev.mjs';
import { compareCountGuardV2 } from './chatbot-jev-count-guard-v2.mjs';

export function compareDevelopmentProbes(corpus, v3, v4) {
  const before = analyzeDevelopmentProbe(corpus, v3);
  const after = analyzeDevelopmentProbe(corpus, v4);
  const commonIds = new Set(v4.samples.filter(row => v3.samples.some(old => old.id === row.id)).map(row => row.id));
  const skippedBefore = new Set([...before.languageSkipped, ...before.baselineMatched]);
  const skippedAfter = new Set([...after.languageSkipped, ...after.baselineMatched]);
  if (before.writeWordingVersion !== 3 || after.writeWordingVersion !== 4
    || !isDeepStrictEqual(v3.requestShape.questions.intent, v4.requestShape.questions.intent)
    || [...commonIds].some(id => skippedBefore.has(id) !== skippedAfter.has(id))) throw new Error('Comparison changed more than binary wording or lacks matched eligibility');
  const oldById = new Map(v3.samples.map(row => [row.id, row]));
  const newById = new Map(v4.samples.map(row => [row.id, row]));
  const skipped = new Set([...skippedBefore, ...skippedAfter]);
  const rows = corpus.cases.filter(item => oldById.has(item.id) && newById.has(item.id)).map(item => {
    const oldDecision = oldById.get(item.id).decision;
    const newDecision = newById.get(item.id).decision;
    const eligible = !skipped.has(item.id);
    return { id: item.id, query: item.query, language: item.language, provisionalIntent: item.intent, isWrite: item.isWrite, eligible,
      v3: oldDecision, v4: newDecision,
      v3Accepted: eligible && accepts(oldDecision, 0.8, true, 'core'),
      v4Accepted: eligible && accepts(newDecision, 0.8, true, 'core'),
      v3CorrectChoice: oldDecision?.choice === item.intent, v4CorrectChoice: newDecision?.choice === item.intent,
      v3FalseWrite: Boolean(oldDecision && !item.isWrite && oldDecision.writeProbability >= 0.5),
      v4FalseWrite: Boolean(newDecision && !item.isWrite && newDecision.writeProbability >= 0.5),
      v4MissedWrite: Boolean(newDecision && item.isWrite && newDecision.writeProbability < 0.5) };
  });
  const ids = predicate => rows.filter(predicate).map(row => row.id);
  const candidates = report => report.samples.map(row => ({ ...row, item: corpus.cases.find(item => item.id === row.id) }))
    .filter(row => !skipped.has(row.id));
  const falseWriteBefore = ids(row => row.v3FalseWrite);
  const falseWriteAfter = ids(row => row.v4FalseWrite);
  const missedWrites = ids(row => row.v4MissedWrite);
  const checks = {
    completeValidRuns: before.complete && after.complete && before.validDecisions === corpus.cases.length && after.validDecisions === corpus.cases.length,
    allCandidateCostsKnown: after.accounting.requestsWithUnknownCost === 0,
    falseWriteScoresReduced: falseWriteAfter.length < falseWriteBefore.length,
    noFalseNegativeWriteScores: missedWrites.length === 0,
    noWrongAcceptedChoices: after.afterLanguageAndRegex.acceptedWrong === 0,
    eligibleAcceptedCoverageMaintained: after.afterLanguageAndRegex.accepted >= before.afterLanguageAndRegex.accepted,
    arabiziCoverageImproved: (after.byLanguage['ary-latn']?.candidateSummary.accepted ?? 0)
      > (before.byLanguage['ary-latn']?.candidateSummary.accepted ?? 0),
    warmClassifierP95Within500ms: after.classifierLatencyMs.warm.p95 !== null && after.classifierLatencyMs.warm.p95 <= 500,
  };
  return { scope: 'Sequential paired development comparison on spent assistant questions', threshold: 0.8, acceptancePolicy: 'core',
    providerCallsDuringAnalysis: 0, productionAcceptance: false, jevEnabled: false, defaultWordingChanged: false,
    before, after, checks, developmentCriteriaPass: Object.values(checks).every(Boolean),
    pairedQuestions: rows.length, falseWriteBefore, falseWriteAfter, missedWrites,
    correctedFalseWrites: ids(row => row.v3FalseWrite && row.v4 && !row.v4FalseWrite),
    newlyFalseWrites: ids(row => row.v4FalseWrite && row.v3 && !row.v3FalseWrite),
    newlyWrongChoices: ids(row => row.v3CorrectChoice && row.v4 && !row.v4CorrectChoice),
    newlyWrongAccepted: ids(row => row.v4Accepted && !row.v4CorrectChoice),
    gainedCorrectAccepted: ids(row => !row.v3Accepted && row.v4Accepted && row.v4CorrectChoice),
    lostCorrectAccepted: ids(row => row.v3Accepted && row.v3CorrectChoice && !row.v4Accepted),
    prototypeCountV2: { before: compareCountGuardV2(candidates(v3)), after: compareCountGuardV2(candidates(v4)) },
    servedModels: { v3: [...new Set(v3.samples.filter(row => row.decision).map(row => row.decision.model))],
      v4: [...new Set(v4.samples.filter(row => row.decision).map(row => row.decision.model))] },
    rows,
    limitations: ['One historical pass per version, not randomized/interleaved; timing and model variability are uncontrolled.',
      'Provisional assistant labels and correlated translations, not native/independent acceptance.',
      'No answer rendering, authenticated tool execution, readiness race or production deployment tested.',
      'Count-veto v2 is a separate offline prototype, not part of either classifier request.',
      'Passing dev criteria only identifies a candidate for further evaluation; probe default and runtime remain unchanged.'] };
}

async function main() {
  const args = process.argv.slice(2);
  const names = ['cases', 'v3', 'v4', 'out'];
  if (args.length !== 4 || args.some(arg => !/^--(?:cases|v3|v4|out)=.+$/.test(arg))
    || names.some(name => args.filter(arg => arg.startsWith(`--${name}=`)).length !== 1)) throw new Error('Use --cases=PATH --v3=PATH --v4=PATH --out=NEW_PATH');
  const value = name => args.find(arg => arg.startsWith(`--${name}=`)).slice(name.length + 3);
  const hash = text => createHash('sha256').update(text).digest('hex');
  const texts = Object.fromEntries(await Promise.all(['cases', 'v3', 'v4'].map(async name => [name, await Bun.file(value(name)).text()])));
  const corpus = JSON.parse(texts.cases);
  const v3 = JSON.parse(texts.v3);
  const v4 = JSON.parse(texts.v4);
  if ([v3, v4].some(report => report.corpusSha256 !== hash(texts.cases))) throw new Error('Paired corpus hash mismatch');
  // Old runner metadata may differ. Actual classifier/parser/language/template
  // inputs must still be shared and match their measured hashes.
  for (const path of ['scripts/chatbot-jev.mjs', 'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts',
    'packages/server/src/modules/chat/replies/schoolReplyTemplates.ts', 'packages/server/src/modules/chat/replies/schoolListReplies.ts']) {
    if (v3.sourceSha256[path] !== v4.sourceSha256[path] || hash(await Bun.file(path).text()) !== v4.sourceSha256[path]) {
      throw new Error(`Classification input changed: ${path}`);
    }
  }
  if (hash(await Bun.file('scripts/chatbot-jev-wording-v4.mjs').text()) !== v4.sourceSha256['scripts/chatbot-jev-wording-v4.mjs']) throw new Error('Measured v4 wording changed');
  const comparison = compareDevelopmentProbes(corpus, v3, v4);
  comparison.inputSha256 = Object.fromEntries(['cases', 'v3', 'v4'].map(name => [name, hash(texts[name])]));
  comparison.analyzerSha256 = hash(await Bun.file('scripts/chatbot-jev-wording-comparison.mjs').text());
  await writeFile(value('out'), `${JSON.stringify(comparison, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ ...comparison, rows: undefined }, null, 2));
}

if (import.meta.main) await main();
