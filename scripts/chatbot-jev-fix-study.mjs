/** Offline replay of preserved reports. Never fetches, executes School tools or edits evidence. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { parseDecision, validateCases, summarize, templateIntent } from './chatbot-jev.mjs';
import { compareQueryGuardV3, acceptsWithQueryGuardV3 } from './chatbot-jev-query-guard-v3.mjs';
import { compareCountGuardV2 } from './chatbot-jev-count-guard-v2.mjs';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/replies/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/replies/schoolReplyTemplates.ts';

export function replayFixStudy(corpus, reports) {
  validateCases(corpus.cases);
  const byId = new Map(corpus.cases.map(item => [item.id, item]));
  const seen = new Set();
  const rows = reports.flatMap(report => report.samples.map(sample => {
    const key = `${sample.repetition}:${sample.id}`;
    const item = byId.get(sample.id);
    if (!item || seen.has(key)) throw new Error('Unknown or repeated saved attempt');
    seen.add(key);
    if (sample.decision) {
      const decision = sample.decision;
      const parsed = parseDecision({ model: decision.model,
        usage: { input_tokens: decision.inputTokens, cost: decision.costUsd },
        answers: { intent: { type: 'choice', choice: decision.choice, confidence: decision.confidence, probabilities: decision.probabilities },
          is_write: { type: 'noul', noul: decision.writeProbability } } });
      if (!isDeepStrictEqual(parsed, decision)) throw new Error('Saved normalized decision changed');
    }
    const language = schoolReplyLanguage(item.query);
    const baseline = templateIntent(schoolReplyTemplate({ userText: item.query, language, channel: 'web' }, '2026-2027'));
    return { ...sample, item, language, baseline };
  }));
  const candidates = rows.filter(row => row.language !== null && row.baseline === 'needs_llm');
  const { errorUpperBound95: _omitted, ...raw } = summarize(rows, 0.8, true, 'core');
  const allAccepted = rows.filter(row => acceptsWithQueryGuardV3(row.decision, row.item.query));
  return { attempts: rows.length, valid: rows.filter(row => row.decision).length,
    errors: rows.filter(row => row.error).map(row => ({ id: row.id, repetition: row.repetition, error: row.error })), raw,
    currentUnknownLanguage: [...new Set(rows.filter(row => row.language === null).map(row => row.id))],
    currentBaselineCases: [...new Set(rows.filter(row => row.baseline !== 'needs_llm').map(row => row.id))],
    currentBaselineLabelDisagreements: rows.filter(row => row.baseline !== 'needs_llm' && row.baseline !== row.item.intent).map(row => row.id),
    version2OnCurrentCandidates: compareCountGuardV2(candidates),
    version3OnCurrentCandidates: compareQueryGuardV3(candidates),
    version3OnAllRows: compareQueryGuardV3(rows),
    acceptedByVersion3: allAccepted.map(row => ({ id: row.id, repetition: row.repetition, choice: row.decision.choice })),
    productionAcceptance: false, note: 'Post-result development projection using current language/refusals and preserved classifier scores; no new latency or accuracy measurement.' };
}

async function main() {
  if (process.argv.length !== 3 || !process.argv[2].startsWith('--out=')) throw new Error('Use --out=NEW_PATH');
  const inputSha256 = {};
  const read = async (path, expected) => {
    const text = await Bun.file(path).text();
    const hash = createHash('sha256').update(text).digest('hex');
    if (expected && hash !== expected) throw new Error('Historical input changed: ' + path);
    inputSha256[path] = hash;
    return JSON.parse(text);
  };
  const coreProof = await read('docs/evidence/chatbot-latency/jev-core-final-analysis-20261005.json');
  const coreReports = await Promise.all(Object.entries(coreProof.reportHashes).map(([path, hash]) => read(path, hash)));
  const core = await read('datasets/chatbot-latency/jev-core-exploration.json');
  const draft = await read('datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json');
  const v3 = await read('docs/evidence/chatbot-latency/jev-draft-probe96-run-20261006.json', '3a555eec67ac792d3fcfd7cba400b471c32e3ecd82cfe2995fb1b4c520065dfb');
  const v4 = await read('docs/evidence/chatbot-latency/jev-v4-probe96-run-20261006.json');
  const operatorProof = await read('docs/evidence/chatbot-latency/jev-operator-review100-analysis-20261007.json');
  const operator = await read(operatorProof.corpus, operatorProof.corpusSha256);
  const operatorReports = await Promise.all(operatorProof.reports.map(entry => read(entry.path, entry.sha256)));
  for (const report of [...coreReports, v3, v4, ...operatorReports]) {
    const expectedHash = report.corpusSha256;
    const matchingCorpus = [core, draft, operator].find(item => createHash('sha256').update(JSON.stringify(item)).digest('hex') === expectedHash);
    // Corpus hashes bind original bytes (pretty printing matters); use recorded reads.
    if (!matchingCorpus && ![inputSha256['datasets/chatbot-latency/jev-core-exploration.json'],
      inputSha256['datasets/chatbot-latency/jev-moroccan-probe96-dev-20261006.json'], inputSha256[operatorProof.corpus]].includes(expectedHash)) throw new Error('Unknown measured corpus');
  }
  const studies = { core: replayFixStudy(core, coreReports), v3Draft96: replayFixStudy(draft, [v3]),
    v4Draft96: replayFixStudy(draft, [v4]), operator100: replayFixStudy(operator, operatorReports) };
  const sourceSha256 = {};
  for (const path of ['scripts/chatbot-jev-fix-study.mjs', 'scripts/chatbot-jev-query-guard-v3.mjs',
    'scripts/chatbot-jev-count-guard-v2.mjs', 'scripts/chatbot-jev-count-guard.mjs', 'scripts/chatbot-jev.mjs',
    'packages/server/src/modules/chat/replies/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/replies/schoolReplyTemplates.ts',
    'packages/server/src/modules/chat/replies/schoolReplyWrite.ts']) sourceSha256[path] = createHash('sha256').update(await Bun.file(path).text()).digest('hex');
  const output = { mode: 'offline-post-result-fixes', providerCalls: 0, schoolToolCalls: 0, inputSha256, sourceSha256, studies,
    validDecisionsReparsed: Object.values(studies).reduce((sum, study) => sum + study.valid, 0),
    frozenReportsAndLabelsChanged: false, productionAcceptance: false, jevEnabled: false };
  await writeFile(process.argv[2].slice(6), JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ validDecisionsReparsed: output.validDecisionsReparsed,
    studies: Object.fromEntries(Object.entries(studies).map(([name, study]) => [name, {
      unknownLanguage: study.currentUnknownLanguage.length, baseline: study.currentBaselineCases.length,
      before: study.version3OnCurrentCandidates.before, after: study.version3OnCurrentCandidates.after,
      preventedWrong: study.version3OnCurrentCandidates.preventedWrong, lostCorrect: study.version3OnCurrentCandidates.lostCorrect }])) }));
}
if (import.meta.main) await main();
