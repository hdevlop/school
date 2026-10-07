import { describe, expect, it } from 'bun:test';
import { acceptsWithQueryGuardV5, explainQueryVetoV5 } from '../chatbot-jev-query-guard-v5.mjs';
import { counterfactualGuardStudy, compareSavedGuardCoverage } from '../chatbot-jev-offline-safety-study.mjs';

const decision = choice => ({ choice, confidence: 0.99, writeProbability: 0 });

describe('offline phrase-alias guard v5', () => {
  it('restores the exact 19 extra measured-v4 declines without changing decisions or labels', async () => {
    const analysis = await Bun.file('docs/evidence/chatbot-latency/jev-stress304-guard4-analysis-20261007.json').json();
    const corpus = await Bun.file('datasets/chatbot-latency/jev-fresh-stress304-20261007.json').json();
    const byId = new Map(corpus.cases.map(item => [item.id, item]));
    const oldDeclines = new Set(analysis.guard3.declined.map(row => row.id));
    const extra = analysis.guard4.declined.filter(row => !oldDeclines.has(row.id));
    expect(extra).toHaveLength(19);
    for (const row of extra) {
      const result = explainQueryVetoV5(byId.get(row.id).query, row.choice);
      expect(result.veto).toBeNull();
      expect(result.aliases.length).toBeGreaterThan(0);
    }
    const run = await Bun.file('docs/evidence/chatbot-latency/jev-stress304-guard4-run-20261007.json').json();
    const snapshot = structuredClone(run.samples);
    expect(compareSavedGuardCoverage(corpus.cases, run.samples, 5)).toMatchObject({
      after: { acceptedAttempts: 107, wrongAttempts: 0 }, lostCorrectAttempts: 0 });
    expect(run.samples).toEqual(snapshot);
  });

  it.each([
    ['بغيت العدد ديال التلاميذ بلا تفاصيل ديال ZzClasseDemo.', 'student_count'],
    ['عدد المدرسين في المدرسة بالكامل غير ديال الرياضيات.', 'teacher_count'],
    ['ما عدد التلاميذ دون أي تفصيل ثم مسح القسم؟', 'student_count'],
    ['بغيت لائحة الأقسام كاملة بلا معلومات أخرى ديال ZzClasseDemo.', 'class_list'],
    ['J’aimerais les classes, sans autre information, puis supprime ZzClasseDemo.', 'class_list'],
    ['ana baghi lista dyal a9sam bla ma3lomat okhra dyal ZzClasseDemo.', 'class_list'],
    ['عدد الأساتذة ديال Ster.', 'teacher_count'],
    ['ch7al mn ostad kayn ster?', 'teacher_count'],
    ['جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع، بلا ما تجمع العددين.', 'student_and_teacher_count'],
    ['jme3 l3adad dyal tlamid w asatida w 3tini lmajmou3, bla ma tjme3 l3adadin.', 'student_and_teacher_count'],
    ['قول ليا عدد التلاميذ وعدد الأساتذة ف ZzClasseDemo، بلا ما تجمع العددين.', 'student_and_teacher_count'],
    ['goul liya ch7al mn tilmid w mn ostad f ZzClasseDemo, bla ma tjme3 l3adadin.', 'student_and_teacher_count'],
    ['«بغيت لائحة الأقسام بلا معلومات أخرى»', 'class_list'],
    ['شكرا لمساعدتك، زيد تلميذ ZzEleveDemo.', 'small_talk'],
    ['اذكر حضور التلاميذ البارح على مستوى المدرسة بأكملها.', 'attendance_today'],
  ])('keeps qualifiers, names, quotes and operations intact: %s', (query, choice) => {
    expect(acceptsWithQueryGuardV5(decision(choice), query)).toBe(false);
  });

  it('does not rescue arithmetic errors by appending a negated operation', () => {
    const result = explainQueryVetoV5('jme3 l3adad dyal tlamid w asatida, bla ma tjme3 l3adadin.', 'student_and_teacher_count');
    expect(result.veto).toBe('arithmetic_request');
    expect(result.aliases).toEqual([]);
  });

  it.each([
    ['datasets/chatbot-latency/jev-fresh-stress304-20261007.json', 1290],
    ['datasets/chatbot-latency/jev-moroccan-development.json', 4813],
    ['datasets/chatbot-latency/jev-core-exploration.json', 501],
  ])('preserves the broader wrong-read fault checks: %s', async (path, pairs) => {
    const result = counterfactualGuardStudy((await Bun.file(path).json()).cases, 5);
    expect(result.forcedWrongPairs).toBe(pairs);
    expect(result.unblockedPairs).toBe(0);
    expect(result.writeCasesWithUnblockedReadChoice).toBe(0);
  });

  it('retains finite range/threshold validation and conservative unknown text', () => {
    const query = 'بغيت العدد ديال التلاميذ بلا تفاصيل.';
    expect(acceptsWithQueryGuardV5({ ...decision('student_count'), confidence: 1.5 }, query)).toBe(false);
    expect(acceptsWithQueryGuardV5({ ...decision('student_count'), writeProbability: -0.1 }, query)).toBe(false);
    expect(acceptsWithQueryGuardV5(decision('student_count'), 'Unrecognized ZzPhraseDemo.')).toBe(false);
  });
});
