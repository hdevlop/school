/** Offline authoring/export only. Never fetches, authenticates, or runs a classifier. */
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { groups } from '../datasets/chatbot-latency/jev-moroccan-authoring.mjs';
import { validateFreshCorpus } from './chatbot-jev-accuracy.mjs';
import { INTENT_NAMES, validateCases } from './chatbot-jev.mjs';
import { NATIVE_LANGUAGES, NATIVE_PREVIOUS_CORPORA, buildNativeReviewWorksheet, inspectNativeIntake } from './chatbot-jev-native.mjs';

export const DEVELOPMENT_PATH = 'datasets/chatbot-latency/jev-moroccan-development.json';
// A linked translation may need a different label when it omits essential context.
export const PROVISIONAL_LABEL_CORRECTIONS = Object.freeze({
  'mda26-student_and_teacher_count-12-fr': 'needs_llm',
});
const COLLECTION_PATH = 'datasets/chatbot-latency/jev-native-collection.json';
const WORKSHEET_PATH = 'datasets/chatbot-latency/jev-moroccan-review-worksheet.json';
const COUNTS = { student_count: 30, teacher_count: 30, student_and_teacher_count: 25,
  class_list: 25, attendance_today: 25, small_talk: 15, write_request: 30, needs_llm: 50, upcoming_exams: 10 };
const core = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list', 'attendance_today', 'small_talk'];

export function buildMoroccanDraft(previousCases, { now = new Date().toISOString() } = {}) {
  if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid draft creation time');
  const cases = [];
  for (const intent of INTENT_NAMES) {
    const rows = groups[intent];
    if (!Array.isArray(rows) || rows.length !== COUNTS[intent]) throw new Error(`Incomplete authoring group: ${intent}`);
    for (const [index, row] of rows.entries()) {
      if (!Array.isArray(row) || row.length !== NATIVE_LANGUAGES.length || row.some(query => typeof query !== 'string' || !query.trim())) {
        throw new Error(`Incomplete four-language family: ${intent}:${index}`);
      }
      const familyId = `mda26-${intent}-${String(index + 1).padStart(2, '0')}`;
      for (const [languageIndex, language] of NATIVE_LANGUAGES.entries()) {
        const id = `${familyId}-${language}`;
        const label = PROVISIONAL_LABEL_CORRECTIONS[id] ?? intent;
        cases.push({ id, familyId, language, query: row[languageIndex], split: 'test',
          intent: label, isWrite: label === 'write_request', source: 'assistant' });
      }
    }
  }
  validateCases(cases);
  const development = { version: 1, purpose: 'fresh-exploratory', acceptancePolicy: 'core',
    scope: 'Assistant-authored Moroccan-style development draft; provisional labels. Translation-linked family groups and one author are correlated, not independent human/native acceptance evidence.',
    createdAt: now, previousCorpora: NATIVE_PREVIOUS_CORPORA.filter(path => path !== DEVELOPMENT_PATH),
    nativeAuthoredCases: 0, nativeReviewedCases: 0, productionAcceptance: false, cases };
  const freshness = validateFreshCorpus(development, previousCases);
  const collection = { version: 1, purpose: 'native-intake', acceptancePolicy: 'core',
    scope: 'Full assistant-authored review draft, not actual native collection. Every case remains source=assistant, split=dev and pending human review. Human review does not change assistant authorship. Native export remains blocked.',
    labelSource: 'assistant provisional assessment', nativeAuthoredCases: 0, nativeReviewedCases: 0,
    cases: cases.map(item => ({ ...item, split: 'dev', authorId: 'codex', authoredAt: now,
      authorNativeDarijaSpeaker: null, reviewerId: null, reviewedAt: null, reviewStatus: 'pending',
      reviewBlind: null, reviewQuestionSha256: null,
      anonymization: { confirmed: true, notes: 'Invented question; any Zz names, IDs, accounts, contacts or amounts are synthetic placeholders. No School records were read.' } })) };
  const status = inspectNativeIntake(collection, previousCases);
  const worksheet = buildNativeReviewWorksheet(collection);
  return { development, collection, worksheet, summary: {
    cases: cases.length, syntheticFamilyGroups: freshness.families, languages: NATIVE_LANGUAGES,
    casesPerLanguage: Object.fromEntries(NATIVE_LANGUAGES.map(language => [language, cases.filter(item => item.language === language).length])),
    familyGroupsByIntent: COUNTS, coreSupportedFamilyGroups: core.reduce((sum, intent) => sum + COUNTS[intent], 0),
    provisionalCasesByIntent: Object.fromEntries(INTENT_NAMES.map(intent => [intent, cases.filter(item => item.intent === intent).length])),
    writeFamiliesPerStyle: 30, nativeAuthoredCases: 0, nativeReviewedCases: 0,
    nativeExportReady: status.readyForExport, labels: 'Assistant-proposed; human review pending',
    statisticallyIndependentNativeFamilies: 0, freshness,
  } };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--validate', '--write'].includes(args[0])) throw new Error('Use --validate (offline) or --write (create full draft once)');
  const previousCases = [];
  for (const path of NATIVE_PREVIOUS_CORPORA.filter(path => path !== DEVELOPMENT_PATH)) previousCases.push(...(await Bun.file(path).json()).cases);
  const draft = buildMoroccanDraft(previousCases);
  if (args[0] === '--write') {
    for (const path of [DEVELOPMENT_PATH, WORKSHEET_PATH]) if (await Bun.file(path).exists()) throw new Error('Draft output exists; preserve its history');
    const original = await Bun.file(COLLECTION_PATH).json();
    if (original.purpose !== 'native-intake' || !Array.isArray(original.cases) || original.cases.length) {
      throw new Error('Working collection contains records; do not replace author/review history');
    }
    await writeFile(DEVELOPMENT_PATH, `${JSON.stringify(draft.development, null, 2)}\n`, { flag: 'wx' });
    await writeFile(WORKSHEET_PATH, `${JSON.stringify(draft.worksheet, null, 2)}\n`, { flag: 'wx' });
    await writeFile(COLLECTION_PATH, `${JSON.stringify(draft.collection, null, 2)}\n`);
  }
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  console.log(JSON.stringify({ offline: true, ...draft.summary,
    casesSha256: hash(draft.development.cases), source: 'assistant', providerCalls: 0 }, null, 2));
}

if (import.meta.main) await main();
