/** Offline comparison on spent synthetic data. No provider/app calls or revised decisions. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/schoolReplyTemplates.ts';
import { buildDecisionRequest, parseDecision, validateCases } from './chatbot-jev.mjs';
import { compareCountGuardV2 } from './chatbot-jev-count-guard-v2.mjs';
import { acceptsWithCountGuard } from './chatbot-jev-count-guard.mjs';
import { acceptsWithCountGuardV2 } from './chatbot-jev-count-guard-v2.mjs';
import { buildDecisionRequestV4 } from './chatbot-jev-wording-v4.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const inputSha256 = {};
async function read(path, expected) {
  const text = await Bun.file(path).text();
  inputSha256[path] = hash(text);
  if (expected && inputSha256[path] !== expected) throw new Error(`Historical input changed: ${path}`);
  return JSON.parse(text);
}

export function studyCandidates(corpus, reports) {
  validateCases(corpus.cases);
  const byId = new Map(corpus.cases.map(item => [item.id, item]));
  const seen = new Set();
  const rows = reports.flatMap(report => {
    if (!isDeepStrictEqual(report.requestShape, buildDecisionRequest('<query>'))) throw new Error('Expected preserved measured wording v3');
    return report.samples.map(sample => {
      const item = byId.get(sample.id);
      const pair = `${sample.repetition}:${sample.id}`;
      if (!item || seen.has(pair)) throw new Error('Unknown/duplicate saved attempt');
      seen.add(pair);
      if (sample.decision) {
        const value = sample.decision;
        const parsed = parseDecision({ model: value.model, usage: { input_tokens: value.inputTokens, cost: value.costUsd },
          answers: { intent: { type: 'choice', choice: value.choice, confidence: value.confidence, probabilities: value.probabilities },
            is_write: { type: 'noul', noul: value.writeProbability } } });
        if (!isDeepStrictEqual(value, parsed)) throw new Error('Normalized decision changed');
      }
      return { ...sample, item };
    });
  });
  const candidates = rows.filter(row => {
    const language = schoolReplyLanguage(row.item.query);
    return language !== null && schoolReplyTemplate({ userText: row.item.query, language, channel: 'web' }, '2026-2027') === null;
  });
  const comparison = compareCountGuardV2(candidates);
  return { savedAttempts: rows.length, validDecisions: rows.filter(row => row.decision).length,
    currentLanguageEligibleAttempts: candidates.length, comparison,
    restoredCorrect: [...new Set(candidates.filter(row => row.decision?.choice === row.item.intent
      && acceptsWithCountGuardV2(row.decision, row.item.query, 0.8)
      && !acceptsWithCountGuard(row.decision, row.item.query, 0.8)).map(row => row.item.id))],
    productionAcceptance: false, note: 'Saved v3 choices with current language gating; v4 write scores were not measured.' };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !args[0].startsWith('--out=') || !args[0].slice(6).trim()) throw new Error('Use --out=NEW_PATH');
  const original = await read('docs/evidence/chatbot-latency/jev-core-final-analysis-20261005.json');
  const coreCorpusPath = 'datasets/chatbot-latency/jev-core-exploration.json';
  const coreCorpus = await read(coreCorpusPath);
  const coreReports = [];
  for (const [path, expected] of Object.entries(original.reportHashes)) {
    const report = await read(path, expected);
    if (report.corpusSha256 !== inputSha256[coreCorpusPath]) throw new Error('Measured core corpus changed');
    coreReports.push(report);
  }
  const devReport = await read('docs/evidence/chatbot-latency/jev-draft-probe96-run-20261006.json');
  const devCorpusPath = 'datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json';
  const devCorpus = await read(devCorpusPath, devReport.corpusSha256);
  const sourceSha256 = {};
  for (const path of ['scripts/chatbot-jev-candidate-study.mjs', 'scripts/chatbot-jev-count-guard-v2.mjs',
    'scripts/chatbot-jev-count-guard.mjs', 'scripts/chatbot-jev-wording-v4.mjs', 'scripts/chatbot-jev.mjs',
    'packages/server/src/modules/chat/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/schoolReplyTemplates.ts']) {
    sourceSha256[path] = hash(await Bun.file(path).text());
  }
  const output = { stage: 'post-result offline development candidates', threshold: 0.8, acceptancePolicy: 'core',
    providerRequests: 0, keyLedgerReads: 0, schoolToolCalls: 0, jevEnabled: false, productionAcceptance: false,
    inputSha256, sourceSha256, core: studyCandidates(coreCorpus, coreReports), draft96: studyCandidates(devCorpus, [devReport]),
    candidateRequestShape: buildDecisionRequestV4('<query>'), candidateWriteWordingMeasured: false,
    nativeAuthoredOrReviewedCases: 0,
    limitations: ['Tuned on spent assistant development data; no independent/native acceptance.',
      'V2 changes count-veto decisions, never classifier scores or write agreement.',
      'V4 request wording is prepared only; no prediction, coverage, timing or billing improvement claimed.',
      'Original v1/v3 files and all raw reports/labels remain unchanged. No runtime integration.'] };
  await writeFile(args[0].slice(6), `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ core: output.core, draft96: output.draft96, candidateWriteWordingMeasured: false }, null, 2));
}

if (import.meta.main) await main();
