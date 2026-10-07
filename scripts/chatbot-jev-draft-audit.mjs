/** Offline coverage audit. No classifier, tool execution, authentication or network calls. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { schoolReplyLanguage } from '../packages/server/src/modules/chat/schoolReplyLanguage.ts';
import { schoolReplyTemplate } from '../packages/server/src/modules/chat/schoolReplyTemplates.ts';
import { DEVELOPMENT_PATH } from './chatbot-jev-draft.mjs';
import { ACCEPTANCE_POLICIES, templateIntent, validateCases } from './chatbot-jev.mjs';
import { countQueryVeto } from './chatbot-jev-count-guard.mjs';
import { jevTurnEligibility } from './chatbot-reply-readiness.mjs';

const countIntents = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const families = rows => new Set(rows.map(row => row.familyId)).size;

export function auditDraft(corpus, academicYear = '2026-2027') {
  if (corpus?.purpose !== 'fresh-exploratory' || corpus.acceptancePolicy !== 'core'
    || !Array.isArray(corpus.cases) || !corpus.cases.length
    || corpus.cases.some(row => row?.source !== 'assistant' || !row?.familyId)
    || !/^\d{4}-\d{4}$/.test(academicYear)
    || Number(academicYear.slice(5)) !== Number(academicYear.slice(0, 4)) + 1) {
    throw new Error('Supply a non-empty assistant exploratory core corpus and consecutive academic year');
  }
  validateCases(corpus.cases);
  const rows = corpus.cases.map(item => {
    const language = schoolReplyLanguage(item.query);
    const template = schoolReplyTemplate({ userText: item.query, language, channel: 'web' }, academicYear);
    const baselineIntent = templateIntent(template);
    const eligibility = jevTurnEligibility({ mode: 'on', language, regexMatched: template !== null,
      channel: 'web', isAdminUser: true, historyComplete: true, priorUserTurns: 0 });
    return { id: item.id, familyId: item.familyId, declaredLanguage: item.language, detectedLanguage: language,
      provisionalIntent: item.intent, query: item.query,
      baselineMatched: template !== null, baselineIntent,
      baselineLabelDisagreement: template !== null && baselineIntent !== item.intent,
      baselineTools: (template?.calls ?? []).map(call => call.name),
      coreSupportedLabel: ACCEPTANCE_POLICIES.core.includes(item.intent),
      classifierEligibleUnderAssumedTurn: eligibility.eligible, skipReasons: eligibility.reasons,
      countGuardVetoOnProvisionalLabel: countIntents.has(item.intent) ? countQueryVeto(item.query, item.intent) : null };
  });
  const summarize = subset => ({ questions: subset.length, syntheticFamilyGroups: families(subset),
    unknownLanguage: subset.filter(row => row.detectedLanguage === null).length,
    detectedLanguages: Object.fromEntries([...new Set(subset.map(row => row.detectedLanguage))]
      .map(language => [language ?? 'unknown', subset.filter(row => row.detectedLanguage === language).length])),
    baselineMatches: subset.filter(row => row.baselineMatched).length,
    baselineLabelDisagreements: subset.filter(row => row.baselineLabelDisagreement).length,
    classifierEligibleUnderAssumedTurn: subset.filter(row => row.classifierEligibleUnderAssumedTurn).length,
    eligibleCoreSupportedLabels: subset.filter(row => row.classifierEligibleUnderAssumedTurn && row.coreSupportedLabel).length,
    eligibleUnsupportedLabels: subset.filter(row => row.classifierEligibleUnderAssumedTurn && !row.coreSupportedLabel).length,
    coreSupportedLabelsSkippedForLanguage: subset.filter(row => row.coreSupportedLabel && row.detectedLanguage === null).length,
    provisionalCountLabelsVetoed: subset.filter(row => row.countGuardVetoOnProvisionalLabel !== null).length });
  return { version: 1, purpose: 'offline-draft-coverage', offline: true, productionAcceptance: false,
    providerCalls: 0, schoolToolCalls: 0, modelDecisions: 0, academicYear,
    assumptions: { mode: 'on', channel: 'web', isAdminUser: true, historyComplete: true, priorUserTurns: 0 },
    limitations: [corpus.operatorLanguageReview?.status === 'approved'
      ? 'Assistant-provisional labels; operator approved wording only, not independent labels or native authorship.'
      : 'Labels and dialect wording are assistant-proposed, not human validated.',
      'Eligibility assumes an administrator first turn; it does not authenticate a user or enable Jev.',
      'No Jev decisions, answer rendering, readiness timing, accuracy or cost were measured.',
      'Translation-linked synthetic groups are correlated, not independent native observations.',
      'The count veto is a development prototype; this audit does not integrate it.'],
    summary: summarize(rows),
    byDeclaredLanguage: Object.fromEntries([...new Set(rows.map(row => row.declaredLanguage))]
      .map(language => [language, summarize(rows.filter(row => row.declaredLanguage === language))])),
    byProvisionalIntent: Object.fromEntries([...new Set(rows.map(row => row.provisionalIntent))]
      .map(intent => [intent, summarize(rows.filter(row => row.provisionalIntent === intent))])),
    rows };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !/^--(?:cases|out)=.+$/.test(arg))
    || ['cases', 'out'].some(name => args.filter(arg => arg.startsWith(`--${name}=`)).length > 1)) {
    throw new Error('Use optional --cases=PATH and --out=NEW_PATH');
  }
  const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const casesPath = value('cases') ?? DEVELOPMENT_PATH;
  const report = auditDraft(await Bun.file(casesPath).json());
  report.casesPath = casesPath;
  report.sourceSha256 = {};
  for (const path of [casesPath, 'scripts/chatbot-jev-draft-audit.mjs', 'scripts/chatbot-jev.mjs',
    'scripts/chatbot-reply-readiness.mjs', 'scripts/chatbot-jev-count-guard.mjs',
    'packages/server/src/modules/chat/schoolReplyLanguage.ts', 'packages/server/src/modules/chat/schoolReplyTemplates.ts',
    'packages/server/src/modules/chat/schoolListReplies.ts', 'packages/server/src/modules/chat/schoolReplyWrite.ts', 'package.json', 'bun.lock']) {
    report.sourceSha256[path] = createHash('sha256').update(new Uint8Array(await Bun.file(path).arrayBuffer())).digest('hex');
  }
  if (value('out')) await writeFile(value('out'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
}

if (import.meta.main) await main();
