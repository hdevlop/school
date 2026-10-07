import { describe, expect, it } from 'bun:test';
import { auditDraft } from '../chatbot-jev-draft-audit.mjs';
import { DEVELOPMENT_PATH } from '../chatbot-jev-draft.mjs';

const corpus = cases => ({ purpose: 'fresh-exploratory', acceptancePolicy: 'core', cases });
const item = (id, query, intent, language = 'fr', familyId = id) => ({ id, query, intent, language,
  familyId, source: 'assistant', split: 'test', isWrite: intent === 'write_request' });

describe('offline Moroccan draft coverage audit', () => {
  it('distinguishes a real regex hit, an eligible miss and an unknown-language skip', () => {
    const report = auditDraft(corpus([
      item('regex', 'Combien de professeurs ?', 'teacher_count'),
      item('miss', 'Tu peux me dire le nombre total d’élèves ?', 'student_count'),
      item('unknown', 'zzqvx', 'needs_llm'),
    ]));
    expect(report.rows[0]).toMatchObject({ baselineMatched: true, baselineIntent: 'teacher_count',
      baselineTools: ['teachers_get_teacher_count'], classifierEligibleUnderAssumedTurn: false });
    expect(report.rows[1]).toMatchObject({ baselineMatched: false, detectedLanguage: 'fr', classifierEligibleUnderAssumedTurn: true });
    expect(report.rows[2].skipReasons).toContain('unsupported_or_unknown_language');
    expect(report.summary).toMatchObject({ questions: 3, unknownLanguage: 1, baselineMatches: 1,
      classifierEligibleUnderAssumedTurn: 1, eligibleCoreSupportedLabels: 1, baselineLabelDisagreements: 0 });
    expect(report).toMatchObject({ providerCalls: 0, schoolToolCalls: 0, modelDecisions: 0, productionAcceptance: false });
  });
  it('reports provisional disagreement rather than pretending to verify correctness', () => {
    const report = auditDraft(corpus([
      item('conflict', 'Combien de professeurs ?', 'needs_llm'),
      item('count-veto', 'Tu peux me donner le nombre et les noms des enseignants ?', 'teacher_count'),
      item('variant', 'كم عدد الأساتذة؟', 'teacher_count', 'ar', 'count-veto'),
    ]));
    expect(report.summary).toMatchObject({ syntheticFamilyGroups: 2, baselineLabelDisagreements: 1, provisionalCountLabelsVetoed: 1 });
    expect(report.rows[1].countGuardVetoOnProvisionalLabel).toBe('name_or_list_signal');
    expect(report.rows[2].countGuardVetoOnProvisionalLabel).toBeNull();
  });
  it('rejects native intake, missing families, empty corpora and invalid years', () => {
    const data = corpus([item('one', 'Bonjour', 'small_talk')]);
    expect(() => auditDraft({ ...data, purpose: 'native-intake' })).toThrow();
    expect(() => auditDraft(corpus([]))).toThrow();
    expect(() => auditDraft(corpus([{ ...data.cases[0], familyId: null }]))).toThrow();
    expect(() => auditDraft(data, '2026-2028')).toThrow();
  });
  it('audits every shipped question without changing labels or corpus content', async () => {
    const data = await Bun.file(DEVELOPMENT_PATH).json();
    const before = JSON.stringify(data);
    const report = auditDraft(data);
    expect(report.rows).toHaveLength(960);
    expect(report.summary).toMatchObject({ questions: 960, syntheticFamilyGroups: 240 });
    expect(Object.values(report.byDeclaredLanguage).map(row => row.questions)).toEqual([240, 240, 240, 240]);
    expect(report.rows.every(row => row.classifierEligibleUnderAssumedTurn === (!row.baselineMatched && row.detectedLanguage !== null))).toBe(true);
    expect(JSON.stringify(data)).toBe(before);
  });
});
