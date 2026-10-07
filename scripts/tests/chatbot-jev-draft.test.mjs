import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { buildMoroccanDraft, DEVELOPMENT_PATH, PROVISIONAL_LABEL_CORRECTIONS } from '../chatbot-jev-draft.mjs';
import { NATIVE_PREVIOUS_CORPORA, exportNativeHeldout, inspectNativeIntake } from '../chatbot-jev-native.mjs';
import { canonicalQuestion, validateFreshCorpus } from '../chatbot-jev-accuracy.mjs';
import { validateCases } from '../chatbot-jev.mjs';

const previous = [];
for (const path of NATIVE_PREVIOUS_CORPORA.filter(path => path !== DEVELOPMENT_PATH)) previous.push(...(await Bun.file(path).json()).cases);
const now = '2026-10-06T09:00:00.000Z';

describe('full assistant-authored Moroccan draft', () => {
  it('writes unique four-style families with consistent provisional labels and no legacy query copies', () => {
    const { development, summary } = buildMoroccanDraft(previous, { now });
    expect(validateCases(development.cases)).toHaveLength(960);
    expect(validateFreshCorpus(development, previous)).toMatchObject({ cases: 960, families: 240, nativeReviewedCases: 0 });
    expect(new Set(development.cases.map(row => canonicalQuestion(row.query))).size).toBe(960);
    expect(summary).toMatchObject({ coreSupportedFamilyGroups: 150, writeFamiliesPerStyle: 30,
      nativeExportReady: false, statisticallyIndependentNativeFamilies: 0 });
    const families = new Map();
    for (const row of development.cases) {
      if (!families.has(row.familyId)) families.set(row.familyId, []);
      families.get(row.familyId).push(row);
    }
    for (const rows of families.values()) {
      expect(new Set(rows.map(row => row.language)).size).toBe(4);
      expect(new Set(rows.filter(row => !Object.hasOwn(PROVISIONAL_LABEL_CORRECTIONS, row.id)).map(row => row.intent)).size).toBe(1);
      expect(rows.every(row => row.isWrite === (row.intent === 'write_request'))).toBe(true);
    }
  });
  it('keeps the context-free French totals query on the model path without changing its text or family', async () => {
    const { development } = buildMoroccanDraft(previous, { now });
    const id = 'mda26-student_and_teacher_count-12-fr';
    const expected = { intent: 'needs_llm', isWrite: false,
      familyId: 'mda26-student_and_teacher_count-12', query: 'Je cherche les deux totaux, sans les listes de noms.' };
    expect(development.cases.find(row => row.id === id)).toMatchObject(expected);
    for (const path of [DEVELOPMENT_PATH, 'datasets/chatbot-latency/jev-native-collection.json']) {
      const actual = await Bun.file(path).json();
      expect(actual.cases.find(row => row.id === id)).toMatchObject(expected);
    }
  });
  it('keeps generated authorship and review truth distinct and blocks native export', () => {
    const { collection, worksheet } = buildMoroccanDraft(previous, { now });
    expect(collection.cases.every(row => row.source === 'assistant' && row.split === 'dev'
      && row.authorNativeDarijaSpeaker === null && row.reviewStatus === 'pending'
      && row.reviewerId === null && row.reviewedAt === null && row.reviewBlind === null)).toBe(true);
    expect(inspectNativeIntake(collection, previous)).toMatchObject({ cases: 960, heldOutCases: 0,
      reviewedHeldOutCases: 0, declaredNativeAuthoredReviewedCases: 0, readyForExport: false });
    expect(() => exportNativeHeldout(collection, previous, {})).toThrow('not ready');
    expect(worksheet.cases.every(row => row.intent === null && row.isWrite === null
      && row.reviewStatus === 'pending' && /^[a-f0-9]{64}$/.test(row.reviewQuestionSha256))).toBe(true);
    expect(worksheet.cases.some(row => 'source' in row || 'confidence' in row || 'probabilities' in row)).toBe(false);
  });
  it('registers the seen AI corpus so human relabeling cannot make it fresh held-out material', () => {
    const { development, collection } = buildMoroccanDraft(previous, { now });
    expect(NATIVE_PREVIOUS_CORPORA).toContain(DEVELOPMENT_PATH);
    const record = collection.cases[0];
    const relabeled = { ...collection, cases: [{ ...record, id: 'new-human-id', familyId: 'new-human-family',
      source: 'native_author', authorId: 'new-author', authorNativeDarijaSpeaker: null, split: 'test' }] };
    expect(() => inspectNativeIntake(relabeled, [...previous, ...development.cases])).toThrow('spent ID, query or family');
  });
  it('ships the real draft, blind worksheet and probe-compatible development file with truthful metadata', async () => {
    const development = await Bun.file(DEVELOPMENT_PATH).json();
    const intake = await Bun.file('datasets/chatbot-latency/jev-native-collection.json').json();
    const worksheet = await Bun.file('datasets/chatbot-latency/jev-moroccan-review-worksheet.json').json();
    expect(validateFreshCorpus(development, previous).cases).toBe(960);
    expect(intake.cases).toHaveLength(960);
    expect(worksheet.cases).toHaveLength(960);
    const child = Bun.spawn([Bun.which('bun'), 'scripts/chatbot-jev-probe.mjs', `--cases=${DEVELOPMENT_PATH}`,
      '--acceptance-policy=core', '--validate'], { env: { ...process.env, OPENROUTER_API_KEY: '', OPENROUTER_KEY: '' }, stdout: 'pipe', stderr: 'pipe' });
    const [code, text] = await Promise.all([child.exited, new Response(child.stdout).text()]);
    expect(code).toBe(0);
    expect(JSON.parse(text)).toMatchObject({ valid: true, cases: 960, freshness: { nativeReviewedCases: 0 } });
  });
  it('refuses a second write without replacing the collection, labels or review worksheet', async () => {
    const paths = [DEVELOPMENT_PATH, 'datasets/chatbot-latency/jev-native-collection.json', 'datasets/chatbot-latency/jev-moroccan-review-worksheet.json'];
    const hashes = async () => Promise.all(paths.map(async path => createHash('sha256').update(new Uint8Array(await Bun.file(path).arrayBuffer())).digest('hex')));
    const before = await hashes();
    const child = Bun.spawn([Bun.which('bun'), 'scripts/chatbot-jev-draft.mjs', '--write'], { stdout: 'pipe', stderr: 'pipe' });
    const [code, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(code).toBe(1);
    expect(stderr).toContain('Draft output exists');
    expect(await hashes()).toEqual(before);
  });
});
