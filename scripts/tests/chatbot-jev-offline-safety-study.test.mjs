import { describe, expect, it } from 'bun:test';
import { counterfactualGuardStudy, readinessReplay, compareSavedGuardCoverage } from '../chatbot-jev-offline-safety-study.mjs';
import { acceptsWithQueryGuardV4, queryVetoV4, explainQueryVetoV4, compareQueryGuardV4 } from '../chatbot-jev-query-guard-v4.mjs';

const item = (id, query, intent = 'student_count') => ({ id, query, intent, isWrite: intent === 'write_request',
  language: 'fr', split: 'dev', source: 'assistant', familyId: id });
const decision = (choice = 'student_count') => ({ choice, confidence: 0.99, writeProbability: 0 });

describe('offline positive-evidence guard v4 candidate', () => {
  it.each([
    ['Tu peux afficher le calendrier scolaire ?', 'class_list'],
    ['J’aimerais consulter le bulletin de ZzEleveFictif.', 'small_talk'],
    ['Relie le parent ZzParentFictif à ZzEleveFictif.', 'class_list'],
    ['Publie un message aux parents.', 'small_talk'],
    ['Compte uniquement les élèves du primaire.', 'student_count'],
    ['Explique « combien d’élèves » sans rechercher de données.', 'student_count'],
  ])('declines a high-confidence choice without matching supported semantics: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV4(decision(choice), query)).toBe(false);
    expect(queryVetoV4(query, choice)).not.toBeNull();
  });
  it.each([
    ['Tu peux me donner le nombre des élèves de toute l’école ?', 'student_count'],
    ['أريد عدد التلاميذ وعدد المدرسين في المدرسة.', 'student_and_teacher_count'],
    ['بغيت العدد ديال التلاميذ والعدد ديال الأساتذة بجوج.', 'student_and_teacher_count'],
    ['وريني الأقسام ديال المدرسة.', 'class_list'],
    ['Tu peux consulter la présence du jour pour toute l’école ?', 'attendance_today'],
    ['Merci pour ton aide.', 'small_talk'],
  ])('keeps a supported affirmative request: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV4(decision(choice), query)).toBe(true);
  });
  it.each([
    ['Sans liste détaillée, combien d’élèves l’école compte-t-elle ?', 'student_count'],
    ['أحتاج رقما واحدا فقط لعدد التلاميذ المسجلين في المؤسسة خلال السنة الدراسية الحالية.', 'student_count'],
    ['أخبرني بإجمالي الأساتذة في المدرسة دون تصنيف حسب المادة.', 'teacher_count'],
    ['بغيت المجموع ديال التلاميذ بلا تفصيل ديال الأقسام.', 'student_count'],
    ['jm3 lia ghir l3adad dyal tlamid w dyal les profs, kol wa7d bo7do.', 'student_and_teacher_count'],
    ['Quels sont les états d’assiduité des élèves enregistrés aujourd’hui ?', 'attendance_today'],
    ['ما حالات مواظبة التلاميذ المسجلة اليوم؟', 'attendance_today'],
    ['Salut, j’espère que tu vas bien aujourd’hui.', 'small_talk'],
  ])('restores ordinary wording without discarding arbitrary tokens: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV4(decision(choice), query)).toBe(true);
  });
  it.each([
    ['عدد التلاميذ دون تفصيل حسب الأقسام ثم امسح القسم.', 'student_count'],
    ['عدد الأساتذة دون تصنيف حسب المادة الرياضيات.', 'teacher_count'],
    ['بغيت المجموع ديال التلاميذ بلا تفصيل ديال الأقسام ديال ZzClasseF.', 'student_count'],
    ['أريد أسماء الأقسام دون أسماء تلاميذها في ZzClasseF.', 'class_list'],
    ['jm3 l3adad dyal tlamid w dyal les profs.', 'student_and_teacher_count'],
    ['Je veux le total des inscrits et celui des enseignants, en deux nombres.', 'teacher_count'],
  ])('retains qualifiers, extra operations and enrolled-subject ambiguity: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV4(decision(choice), query)).toBe(false);
  });
  it('explains an unknown word without translating or accepting it', () => {
    expect(explainQueryVetoV4('Tu peux afficher les classes ZzClasseF ?', 'class_list'))
      .toEqual({ veto: 'outside_positive_reply_vocabulary', unknownWords: ['zzclassef'] });
  });
  it('keeps raw outcomes separate from semantic projection', () => {
    const rows = [{ item: item('unsafe', 'Tu peux afficher le calendrier scolaire ?', 'needs_llm'),
      decision: decision('class_list'), repetition: 1 }];
    const snapshot = structuredClone(rows);
    const result = compareQueryGuardV4(rows);
    expect(result.before.wrong).toBe(1);
    expect(result.after.samples).toBe(0);
    expect(result.preventedWrong.questions).toBe(1);
    expect(rows).toEqual(snapshot);
  });
  it('detects a wrong-choice path that v3 alone does not veto', () => {
    const cases = [item('calendar', 'Tu peux afficher le calendrier scolaire ?', 'needs_llm')];
    const before = counterfactualGuardStudy(cases, 3);
    const after = counterfactualGuardStudy(cases, 4);
    expect(before.unblockedPairs).toBeGreaterThan(0);
    expect(after.unblockedPairs).toBe(0);
  });
  it('blocks every injected wrong read in the prepared 304-case stress matrix', async () => {
    const corpus = await Bun.file('datasets/chatbot-latency/jev-fresh-stress304-20261007.json').json();
    const result = counterfactualGuardStudy(corpus.cases, 4);
    expect(result.eligibleCases).toBe(228);
    expect(result.forcedWrongPairs).toBe(1290);
    expect(result.unblockedPairs).toBe(0);
    expect(result.writeCasesWithUnblockedReadChoice).toBe(0);
  });
  it.each([
    ['datasets/chatbot-latency/jev-moroccan-development.json', 4813],
    ['datasets/chatbot-latency/jev-core-exploration.json', 501],
  ])('keeps the larger synthetic fault checks closed: %s', async (path, pairs) => {
    const result = counterfactualGuardStudy((await Bun.file(path).json()).cases, 4);
    expect(result.forcedWrongPairs).toBe(pairs);
    expect(result.unblockedPairs).toBe(0);
  });
  it('preserves the latest saved guarded coverage without new provider decisions', async () => {
    const corpus = await Bun.file('datasets/chatbot-latency/jev-fixes-regression100-20261007.json').json();
    const proof = await Bun.file('docs/evidence/chatbot-latency/jev-fixes-regression100-analysis-20261007.json').json();
    const samples = (await Promise.all(proof.reports.map(async row => (await Bun.file(row.path).json()).samples))).flat();
    expect(compareSavedGuardCoverage(corpus.cases, samples)).toMatchObject({
      // Five saved class/count requests now have local plans and are no longer
      // current classifier candidates. The preserved provider decisions are unchanged.
      before: { acceptedAttempts: 28, wrongAttempts: 0 }, after: { acceptedAttempts: 28, wrongAttempts: 0 },
      lostCorrectAttempts: 0, lostCorrectCases: [] });
  });
});

describe('virtual readiness replay', () => {
  const cases = [item('count', 'Tu peux me donner le nombre des élèves de toute l’école ?')];
  const samples = [{ id: 'count', durationMs: 500, decision: decision(), repetition: 1 }];
  it('falls back at 50 ms even when the classifier responds at 500 ms', async () => {
    const result = await readinessReplay(cases, samples, 50, 800, 4);
    expect(result.guardedCandidateWins).toBe(0);
    expect(result.modelFallbacks).toBe(1);
    expect(result.maximumFallbackDelayMs).toBe(0);
    expect(result.rows[0].selectedAtMs).toBe(50);
  });
  it('selects an earlier guarded candidate without executing it', async () => {
    const result = await readinessReplay(cases, samples, 600, 800, 4);
    expect(result.guardedCandidateWins).toBe(1);
    expect(result.rows[0].selectedAtMs).toBe(500);
  });
  it('reserves ties for routing and declines a result beyond the deadline', async () => {
    expect((await readinessReplay(cases, samples, 500, 800, 4)).modelFallbacks).toBe(1);
    const result = await readinessReplay(cases, samples, 1000, 400, 4);
    expect(result.guardedCandidateWins).toBe(0);
    expect(result.rows[0].templateOutcome).toBe('timeout');
    expect(result.maximumFallbackDelayMs).toBe(0);
  });
  it('does not start the classifier for a baseline refusal and retains failed attempts as fallbacks', async () => {
    const writes = [item('write', 'Ajoute un élève ZzEleveFictif.', 'write_request')];
    const result = await readinessReplay(writes, [{ id: 'write', durationMs: 900, error: 'network' }], 50, 800, 4);
    expect(result.baselineSelections).toBe(1);
    expect(result.classifierFactoriesStarted).toBe(0);
    const failure = await readinessReplay(cases, [{ id: 'count', durationMs: 20, error: 'network' }], 50, 800, 4);
    expect(failure.modelFallbacks).toBe(1);
    expect(failure.rows[0].templateOutcome).toBe('error');
  });
  it('rejects missing, duplicate or invalid timing observations', async () => {
    await expect(readinessReplay(cases, [samples[0], samples[0]], 50)).rejects.toThrow();
    await expect(readinessReplay(cases, [{ ...samples[0], durationMs: NaN }], 50)).rejects.toThrow();
    await expect(readinessReplay(cases, [{ ...samples[0], id: 'unknown' }], 50)).rejects.toThrow();
  });
});
