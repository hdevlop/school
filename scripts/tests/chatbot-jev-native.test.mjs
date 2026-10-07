import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { buildNativeReviewWorksheet, exportNativeHeldout, inspectNativeIntake,
  NATIVE_LANGUAGES, NATIVE_PREVIOUS_CORPORA, assessNativeStudy, validateNativeHeldout,
  importNativeReviews, nativeReviewQuestionSha256 } from '../chatbot-jev-native.mjs';

// These are synthetic unit fixtures, not collected human/native evidence.
const now = Date.parse('2026-10-05T12:00:00Z');
const previous = [{ id: 'spent-1', query: 'Élèves ici ?', familyId: 'spent-family' }];
const hashes = Object.fromEntries(NATIVE_PREVIOUS_CORPORA.map(path => [path, 'a'.repeat(64)]));
const question = (id, intent = 'student_count', language = 'fr') => {
  const item = { id, query: `Offline fixture ${id}`,
  familyId: `family-${id}`, language, intent, isWrite: intent === 'write_request', split: 'test',
  source: 'native_author', authorId: `author-${id}`, authoredAt: '2026-10-05T09:00:00Z',
  authorNativeDarijaSpeaker: ['ary', 'ary-latn'].includes(language), reviewerId: 'reviewer-other',
  reviewedAt: '2026-10-05T10:00:00Z', reviewStatus: 'agreed', reviewBlind: true,
    anonymization: { confirmed: true, notes: 'Synthetic fixture only' } };
  return { ...item, reviewQuestionSha256: nativeReviewQuestionSha256(item) };
};
const intake = cases => ({ version: 1, purpose: 'native-intake', acceptancePolicy: 'core', cases });
const inspect = corpus => inspectNativeIntake(corpus, previous, { now });
const readyFixture = () => intake([
  ...NATIVE_LANGUAGES.flatMap(language => Array.from({ length: 30 }, (_, index) => question(`write-${language}-${index}`, 'write_request', language))),
  ...Array.from({ length: 31 }, (_, index) => question(`count-${index}`)),
  ...['small_talk', 'teacher_count', 'student_and_teacher_count', 'class_list', 'attendance_today', 'needs_llm'].map(intent => question(`scope-${intent}`, intent)),
]);
const exportFixture = corpus => exportNativeHeldout(corpus, previous, { now, intakeSha256: 'b'.repeat(64), previousCorpusSha256: hashes });

describe('offline human/native intake', () => {
  it('keeps an empty collection explicitly unready and does not count its template', () => {
    const result = inspect({ ...intake([]), caseTemplate: question('not-collected') });
    expect(result).toMatchObject({ cases: 0, declaredNativeAuthoredReviewedCases: 0, readyForExport: false, productionAcceptance: false });
    expect(result.blockers).toContain('no_held_out_cases');
    expect(() => exportFixture(intake([]))).toThrow('not ready');
  });

  it('retains pending/disputed labels as blockers instead of inventing review', () => {
    const pending = { ...question('pending', 'class_list', 'ary'), intent: null, isWrite: null,
      reviewerId: null, reviewedAt: null, reviewStatus: 'pending', reviewBlind: null };
    const disputed = { ...question('disputed'), reviewStatus: 'disputed' };
    const corpus = intake([pending, disputed]);
    const before = structuredClone(corpus);
    expect(inspect(corpus)).toMatchObject({ heldOutCases: 2, reviewedHeldOutCases: 0,
      declaredNativeAuthoredReviewedCases: 0, blockedCaseCount: 2, readyForExport: false });
    expect(corpus).toEqual(before);
  });

  it('requires independent blind review, author records and confirmed anonymization', () => {
    for (const change of [{ reviewerId: null }, { authorId: null }, { authoredAt: null }, { reviewedAt: null },
      { reviewerId: 'author-one' }, { reviewBlind: false }, { anonymization: { confirmed: false, notes: '' } }]) {
      expect(inspect(intake([{ ...question('one'), ...change }])).blockedCaseCount).toBe(1);
    }
    expect(inspect(intake([question('one')])).reviewedHeldOutCases).toBe(1);
  });

  it('does not turn reviewed assistant text into human/native authorship', () => {
    const assistant = { ...question('assistant', 'class_list', 'ary'), source: 'assistant', authorNativeDarijaSpeaker: false };
    expect(inspect(intake([assistant]))).toMatchObject({ declaredNativeAuthoredReviewedCases: 0, reviewedHeldOutCases: 0 });
    expect(() => inspect(intake([{ ...assistant, authorNativeDarijaSpeaker: true }]))).toThrow('assistant authorship');
  });

  it('rejects malformed fields, invalid UTC dates and inconsistent labels', () => {
    for (const change of [{ id: {} }, { familyId: {} }, { query: '  ' }, { language: 'en' }, { source: 'unknown' },
      { reviewStatus: 'done' }, { intent: 'teacher_count', isWrite: true }, { authorId: 12 },
      { authorNativeDarijaSpeaker: 'true' }, { reviewBlind: 'true' },
      { authoredAt: '2026-02-30T09:00:00Z' }, { reviewedAt: '2026-10-05T08:00:00Z' },
      { authoredAt: '2026-10-06T09:00:00Z' }, { anonymization: { confirmed: 'true', notes: '' } }]) {
      expect(() => inspect(intake([{ ...question('one'), ...change }]))).toThrow();
    }
  });

  it('rejects spent held-out IDs, canonical text, families and duplicate fresh text', () => {
    for (const change of [{ id: 'spent-1' }, { query: 'ELEVES — ici!' }, { familyId: 'spent-family' }]) {
      expect(() => inspect(intake([{ ...question('new'), ...change }]))).toThrow('spent');
    }
    expect(() => inspect(intake([question('a'), { ...question('b'), query: 'Offline fixture a!' }]))).toThrow('canonical query');
    const dev = { ...question('dev'), split: 'dev', query: 'Élèves ici ?', familyId: 'spent-family' };
    expect(inspect(intake([dev])).heldOutCases).toBe(0);
  });

  it('keeps linked translations in one split and counts one supported family', () => {
    const a = question('a');
    const b = { ...question('b', 'student_count', 'ar'), familyId: a.familyId };
    expect(inspect(intake([a, b])).reviewedSupportedFamilies).toBe(1);
    expect(() => inspect(intake([a, { ...b, split: 'dev' }]))).toThrow('family crosses');
    expect(() => inspect(intake([a, { ...b, intent: 'teacher_count' }]))).toThrow('family labels');
  });

  it('checks independent supported families, native declarations, writes and intent scope before export', () => {
    const corpus = readyFixture();
    expect(inspect(corpus)).toMatchObject({ readyForExport: true, reviewedSupportedFamilies: 156,
      declaredNativeAuthoredReviewedCases: 60, productionAcceptance: false });
    const insufficient = structuredClone(corpus);
    insufficient.cases = insufficient.cases.filter(row => row.id !== 'write-ary-0');
    expect(inspect(insufficient).blockers).toContain('fewer_than_30_reviewed_write_families:ary');
    const noNative = structuredClone(corpus);
    noNative.cases.forEach(row => { row.authorNativeDarijaSpeaker = false; });
    expect(inspect(noNative).blockers).toContain('fewer_than_40_declared_native_darija_arabizi_cases');
    const missingIntent = structuredClone(corpus);
    missingIntent.cases = missingIntent.cases.filter(row => row.intent !== 'teacher_count');
    expect(inspect(missingIntent).blockers).toContain('missing_reviewed_intent:teacher_count');
  });

  it('exports a blind worksheet without labels, previous reviews or model scores', () => {
    const corpus = intake([{ ...question('one'), confidence: 0.99, decision: { choice: 'teacher_count' } }]);
    const worksheet = buildNativeReviewWorksheet(corpus);
    expect(worksheet.cases[0]).toMatchObject({ id: expect.stringMatching(/^q-[a-f0-9]{24}$/), intent: null, isWrite: null,
      reviewerId: null, reviewedAt: null, reviewStatus: 'pending', reviewBlind: null });
    expect(worksheet.cases[0]).not.toHaveProperty('confidence');
    expect(worksheet.cases[0]).not.toHaveProperty('decision');
    expect(corpus.cases[0].intent).toBe('student_count');
    expect(() => buildNativeReviewWorksheet(intake([]))).toThrow();
  });

  it('hides label-bearing identifiers, author metadata and original ordering behind stable opaque review IDs', () => {
    const first = { ...question('student_count-fr-01'), query: 'Combien de personnes sont inscrites ?',
      familyId: 'student_count-family', authorId: 'teacher_count-author', reviewStatus: 'pending' };
    const second = { ...question('student_count-ar-01', 'student_count', 'ar'), query: 'كم شخصا مسجلا؟', familyId: first.familyId };
    const corpus = intake([first, second]);
    const worksheet = buildNativeReviewWorksheet(corpus);
    expect(worksheet.version).toBe(3);
    expect(worksheet.cases.map(row => row.id)).toEqual(worksheet.cases.map(row => row.id).toSorted());
    expect(new Set(worksheet.cases.map(row => row.familyId)).size).toBe(1);
    for (const row of worksheet.cases) {
      expect(row.id).toMatch(/^q-[a-f0-9]{24}$/);
      expect(row.familyId).toMatch(/^f-[a-f0-9]{24}$/);
      expect(row).not.toHaveProperty('authorId');
      expect(row).not.toHaveProperty('split');
      expect([first.id, second.id]).not.toContain(row.id);
      expect(row.familyId).not.toBe(first.familyId);
    }
    const relabeled = structuredClone(corpus);
    relabeled.cases[0].intent = 'needs_llm';
    relabeled.cases[0].decision = { choice: 'teacher_count', confidence: 0.99 };
    expect(buildNativeReviewWorksheet(relabeled)).toEqual(worksheet);
  });

  it('maps opaque review IDs back to original records even after reviewer row reordering', () => {
    const pending = id => ({ ...question(id), intent: null, isWrite: null, reviewerId: null,
      reviewedAt: null, reviewStatus: 'pending', reviewBlind: null, reviewQuestionSha256: null });
    const corpus = intake([pending('write_request-encoded'), pending('student_count-encoded')]);
    const worksheet = buildNativeReviewWorksheet(corpus);
    const row = worksheet.cases.find(value => value.reviewQuestionSha256 === nativeReviewQuestionSha256(corpus.cases[1]));
    Object.assign(row, { intent: 'class_list', isWrite: false, reviewerId: 'reviewer-other',
      reviewedAt: '2026-10-05T10:00:00Z', reviewStatus: 'agreed', reviewBlind: true });
    worksheet.cases.reverse();
    const imported = importNativeReviews(corpus, worksheet, previous, { now });
    expect(imported.cases[0]).toEqual(corpus.cases[0]);
    expect(imported.cases[1]).toMatchObject({ id: 'student_count-encoded', familyId: 'family-student_count-encoded',
      source: 'native_author', authorId: 'author-student_count-encoded', intent: 'class_list', reviewStatus: 'agreed' });
    const edited = structuredClone(worksheet);
    edited.cases[0].id = corpus.cases[0].id;
    expect(() => importNativeReviews(corpus, edited, previous, { now })).toThrow();
    const unblinded = structuredClone(worksheet);
    unblinded.version = 2;
    expect(() => importNativeReviews(corpus, unblinded, previous, { now })).toThrow();
  });

  it('imports the full real v3 draft packet with no completed reviews and preserves all original records', async () => {
    const corpus = await Bun.file('datasets/chatbot-latency/jev-native-collection.json').json();
    const worksheet = await Bun.file('datasets/chatbot-latency/jev-moroccan-review-worksheet-v3.json').json();
    const previousCases = [];
    for (const path of NATIVE_PREVIOUS_CORPORA) previousCases.push(...(await Bun.file(path).json()).cases);
    const clock = Math.max(...corpus.cases.map(item => Date.parse(item.authoredAt))) + 1000;
    expect(worksheet.version).toBe(3);
    expect(worksheet.cases).toHaveLength(960);
    expect(importNativeReviews(corpus, worksheet, previousCases, { now: clock })).toEqual(corpus);
    expect(inspectNativeIntake(corpus, previousCases, { now: clock })).toMatchObject({
      reviewedHeldOutCases: 0, declaredNativeAuthoredReviewedCases: 0, readyForExport: false });
  });

  it('invalidates an existing review when the collected question changes', () => {
    const corpus = readyFixture();
    expect(inspect(corpus).readyForExport).toBe(true);
    corpus.cases[0].query += ' altered after review';
    expect(inspect(corpus).readyForExport).toBe(false);
    expect(inspect(corpus).blockedCases[0].reasons).toContain('review_not_bound_to_current_question');
  });

  it('requires a current question binding even when the other review declarations are complete', () => {
    const item = question('bound');
    delete item.reviewQuestionSha256;
    expect(inspect(intake([item])).reviewedHeldOutCases).toBe(0);
    for (const change of [{ language: 'ar' }, { familyId: 'another-family' }, { authorId: 'another-author' },
      { authoredAt: '2026-10-05T08:00:00Z' }, { source: 'real_user' },
      { anonymization: { confirmed: true, notes: 'Edited collection record' } }]) {
      const changed = { ...question('bound'), ...change };
      expect(inspect(intake([changed])).reviewedHeldOutCases).toBe(0);
    }
  });

  it('imports only completed declared review fields and preserves the original and untouched rows', () => {
    const pending = id => ({ ...question(id), intent: null, isWrite: null, reviewerId: null,
      reviewedAt: null, reviewStatus: 'pending', reviewBlind: null, reviewQuestionSha256: null });
    const corpus = intake([pending('a'), pending('b')]);
    const before = structuredClone(corpus);
    const worksheet = buildNativeReviewWorksheet(corpus);
    const reviewedRow = worksheet.cases.find(row => row.reviewQuestionSha256 === nativeReviewQuestionSha256(corpus.cases[0]));
    Object.assign(reviewedRow, { intent: 'teacher_count', isWrite: false, reviewerId: 'reviewer-human',
      reviewedAt: '2026-10-05T10:00:00Z', reviewStatus: 'agreed', reviewBlind: true });
    const merged = importNativeReviews(corpus, worksheet, previous, { now });
    expect(merged.cases[0]).toMatchObject({ intent: 'teacher_count', source: 'native_author', authorId: 'author-a',
      reviewerId: 'reviewer-human', reviewStatus: 'agreed', reviewBlind: true });
    expect(merged.cases[0].reviewQuestionSha256).toBe(nativeReviewQuestionSha256(merged.cases[0]));
    expect(merged.cases[1]).toEqual(corpus.cases[1]);
    expect(corpus).toEqual(before);
    expect(inspect(merged)).toMatchObject({ reviewedHeldOutCases: 1, readyForExport: false });
    for (const change of [{ reviewerId: null }, { reviewerId: 'author-a' }, { reviewedAt: null }, { reviewBlind: false }]) {
      const invalid = structuredClone(worksheet);
      Object.assign(invalid.cases.find(row => row.id === reviewedRow.id), change);
      expect(() => importNativeReviews(corpus, invalid, previous, { now })).toThrow('agreed imported review');
    }
  });

  it('rejects stale/edited worksheets, missing/duplicate IDs, unexpected fields and legacy unbound files', () => {
    const corpus = intake([question('a'), question('b')]);
    const worksheet = buildNativeReviewWorksheet(corpus);
    for (const mutate of [
      value => { value.version = 1; },
      value => { value.version = 2; },
      value => { value.questionsSha256 = '0'.repeat(64); },
      value => { value.acceptancePolicy = 'full'; },
      value => { value.cases.pop(); },
      value => { value.cases[1] = structuredClone(value.cases[0]); },
      value => { value.cases[0].query += ' edited'; },
      value => { value.cases[0].authorId = 'other'; },
      value => { value.cases[0].familyId = 'other'; },
      value => { value.cases[0].reviewQuestionSha256 = null; },
      value => { value.cases[0].decision = { confidence: 0.99 }; },
    ]) {
      const changed = structuredClone(worksheet);
      mutate(changed);
      expect(() => importNativeReviews(corpus, changed, previous, { now })).toThrow();
    }
    const changedCorpus = structuredClone(corpus);
    changedCorpus.cases[0].query += ' changed during review';
    expect(() => importNativeReviews(changedCorpus, worksheet, previous, { now })).toThrow('stale');
  });

  it('keeps labels/scores out of question fingerprints and refuses replacing completed reviews', () => {
    const corpus = intake([question('a')]);
    const value = { ...corpus.cases[0], intent: 'teacher_count', isWrite: false, decision: { confidence: 1 } };
    expect(nativeReviewQuestionSha256(value)).toBe(corpus.cases[0].reviewQuestionSha256);
    const worksheet = buildNativeReviewWorksheet(corpus);
    expect(importNativeReviews(corpus, worksheet, previous, { now })).toEqual(corpus);
    Object.assign(worksheet.cases[0], { intent: 'teacher_count', isWrite: false, reviewerId: 'another-reviewer',
      reviewedAt: '2026-10-05T10:00:00Z', reviewStatus: 'agreed', reviewBlind: true });
    expect(() => importNativeReviews(corpus, worksheet, previous, { now })).toThrow('existing completed review');
  });

  it('preserves actual declared provenance and verifies export hashes and previous-corpus snapshots', () => {
    const corpus = readyFixture();
    const before = structuredClone(corpus);
    const exported = exportFixture(corpus);
    expect(exported.cases).toEqual(corpus.cases);
    expect(corpus).toEqual(before);
    expect(validateNativeHeldout(exported, previous, { now, previousCorpusSha256: hashes })).toMatchObject({ readyForExport: true });
    const changed = structuredClone(exported);
    changed.cases[0].query += ' changed';
    expect(() => validateNativeHeldout(changed, previous, { now, previousCorpusSha256: hashes })).toThrow('changed');
    expect(() => validateNativeHeldout(exported, previous, { now, previousCorpusSha256: {} })).toThrow('different previous corpora');
    const dev = { ...question('dev'), split: 'dev', reviewStatus: 'pending' };
    expect(exportFixture({ ...corpus, cases: [...corpus.cases, dev] }).cases).toHaveLength(corpus.cases.length);
  });

  it('separates a numerical classifier gate from runtime/human production acceptance', () => {
    const rows = readyFixture().cases.filter(item => item.intent !== 'needs_llm').map(item => ({ item,
      decision: { choice: item.intent, confidence: 1, writeProbability: item.isWrite ? 1 : 0 }, durationMs: 100 }));
    const result = assessNativeStudy(rows, rows, { threshold: 0.8, policy: 'core', plannedRequests: rows.length, complete: true });
    expect(result).toMatchObject({ classificationGatePassed: true, productionAcceptance: false, acceptedFamilies: 156 });
    rows[0].decision = { choice: 'teacher_count', confidence: 0.8, writeProbability: 0.1 };
    expect(assessNativeStudy(rows, rows, { threshold: 0.8, policy: 'core', plannedRequests: rows.length, complete: true }).reasons)
      .toContain('write_accepted_as_read');
    const correlated = rows.map(row => ({ ...row, item: { ...row.item, familyId: 'one-family' } }));
    expect(assessNativeStudy(correlated, correlated, { threshold: 0.8, policy: 'core', plannedRequests: rows.length, complete: true }).reasons)
      .toContain('fewer_than_150_accepted_families');
  });
});

describe('native intake CLI stays offline', () => {
  it('refuses incomplete export, emits a blind worksheet and preserves existing output', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'school-jev-native-'));
    try {
      const input = join(directory, 'intake.json');
      const output = join(directory, 'worksheet.json');
      const audit = join(directory, 'fetch.json');
      const preload = join(directory, 'offline.mjs');
      await Bun.write(input, JSON.stringify(intake([question('cli-question')])));
      await Bun.write(preload, `import { writeFileSync } from 'node:fs';
let calls = 0;
globalThis.fetch = async () => { calls++; throw new Error('Network forbidden'); };
process.on('exit', () => writeFileSync(${JSON.stringify(audit)}, JSON.stringify({ calls })));
`);
      const run = async flags => {
        const child = Bun.spawn([Bun.which('bun'), `--preload=${preload}`, resolve('scripts/chatbot-jev-native-intake.mjs'),
          `--cases=${input}`, ...flags], { env: { ...process.env, OPENROUTER_API_KEY: '' }, stdout: 'pipe', stderr: 'pipe' });
        const [exitCode, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(await Bun.file(audit).json()).toEqual({ calls: 0 });
        return { exitCode, stdout, stderr };
      };
      expect((await run(['--check'])).exitCode).toBe(1);
      expect((await run([`--export=${output}`])).exitCode).toBe(1);
      expect(await Bun.file(output).exists()).toBe(false);
      expect((await run([`--worksheet=${output}`])).exitCode).toBe(0);
      const original = await Bun.file(output).text();
      expect(JSON.parse(original).cases[0].intent).toBeNull();
      expect((await run([`--worksheet=${output}`])).exitCode).toBe(1);
      expect(await Bun.file(output).text()).toBe(original);
      const draft = { ...question('review-cli'), intent: null, isWrite: null, reviewStatus: 'pending',
        reviewerId: null, reviewedAt: null, reviewBlind: null, reviewQuestionSha256: null };
      await Bun.write(input, JSON.stringify(intake([draft])));
      const reviewPath = join(directory, 'review.json');
      expect((await run([`--worksheet=${reviewPath}`])).exitCode).toBe(0);
      const review = await Bun.file(reviewPath).json();
      Object.assign(review.cases[0], { intent: 'class_list', isWrite: false, reviewerId: 'reviewer-other',
        reviewedAt: '2026-10-05T10:00:00Z', reviewStatus: 'agreed', reviewBlind: true });
      await Bun.write(reviewPath, JSON.stringify(review));
      const mergedPath = join(directory, 'merged.json');
      const inputBefore = await Bun.file(input).text();
      expect((await run([`--import-review=${reviewPath}`, `--output=${mergedPath}`])).exitCode).toBe(0);
      const merged = await Bun.file(mergedPath).json();
      expect(merged.cases[0]).toMatchObject({ intent: 'class_list', source: 'native_author', reviewStatus: 'agreed' });
      expect(merged.reviewImport.worksheetSha256).toHaveLength(64);
      expect(await Bun.file(input).text()).toBe(inputBefore);
      expect((await run([`--import-review=${reviewPath}`, `--output=${mergedPath}`])).exitCode).toBe(1);
      expect((await run(['--output=orphan.json'])).exitCode).toBe(1);
      await Bun.write(input, JSON.stringify(readyFixture()));
      const exportedPath = join(directory, 'heldout.json');
      expect((await run([`--export=${exportedPath}`])).exitCode).toBe(0);
      const exported = await Bun.file(exportedPath).json();
      const probe = Bun.spawn([Bun.which('bun'), `--preload=${preload}`, resolve('scripts/chatbot-jev-probe.mjs'),
        `--cases=${exportedPath}`, '--validate', '--acceptance-policy=core'], {
        env: { ...process.env, OPENROUTER_API_KEY: '' }, stdout: 'pipe', stderr: 'pipe',
      });
      const [probeCode, probeOutput, probeError] = await Promise.all([probe.exited,
        new Response(probe.stdout).text(), new Response(probe.stderr).text()]);
      expect(probeError).toBe('');
      expect(probeCode).toBe(0);
      expect(JSON.parse(probeOutput).nativeCollection.readyForExport).toBe(true);
      expect(exported.productionAcceptance).toBe(false);
      expect(await Bun.file(audit).json()).toEqual({ calls: 0 });
      const development = await Bun.file('datasets/chatbot-latency/jev-count-guard-dev.json').json();
      await Bun.write(input, JSON.stringify(intake([{ ...question('heldout-but-seen-in-dev'), query: development.cases[1].query }])));
      const leaked = await run(['--check']);
      expect(leaked.exitCode).toBe(1);
      expect(leaked.stderr).toContain('held-out case reuses');
    } finally {
      if (dirname(directory) !== resolve(tmpdir()) || !basename(directory).startsWith('school-jev-native-')) throw new Error('Invalid cleanup target');
      await rm(directory, { recursive: true, force: true });
    }
  }, 15000);
});
