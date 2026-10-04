import { describe, expect, it } from 'bun:test';
import { scoreSchoolFacts } from '../chatbot-facts.mjs';
import { analyzeReplyLanguage } from '../chatbot-language.mjs';
import { validateCorpus } from '../chatbot-scoring.mjs';
const historical = await Bun.file('datasets/chatbot-latency/morocco-regressions.json').json();
const corpus = await Bun.file('datasets/chatbot-latency/morocco.json').json();
const sample = (id, variant) => historical.samples.find((s) => s.id === id && s.variant === variant);
const fixture = (id) => corpus.cases.find((item) => item.id === id);
const language = (id, variant) => analyzeReplyLanguage(sample(id, variant).text,
  { storedNames: fixture(id).storedNames, expectedLanguage: fixture(id).language });

describe('previously missed real Moroccan benchmark defects', () => {
  it('includes the complete ten scenarios in each Moroccan school language', () => {
    expect(validateCorpus(corpus)).toBe(30);
    for (const lang of ['ary', 'ar', 'fr']) expect(corpus.cases.filter((c) => c.language === lang)).toHaveLength(10);
    expect(corpus.cases.every((c) => ['ary', 'ar', 'fr'].includes(c.language))).toBe(true);
    expect(fixture('classes-ary').storedNames).toContain('Cours Préparatoire');
    expect(fixture('upcoming-exams-ar').storedNames).toContain('Mathématiques');
  });
  it('catches Nemotron’s eight remaining exams and GPT-OSS’s prefixed sections', () => {
    expect(scoreSchoolFacts(sample('upcoming-exams-ar', 'candidate').text, fixture('upcoming-exams-ar').schoolFacts)
      .factFailures.some((f) => f.code === 'count')).toBe(true);
    expect(scoreSchoolFacts(sample('classes-ary', 'baseline').text, fixture('classes-ary').schoolFacts)
      .factFailures.filter((f) => f.code === 'class_sections')).toHaveLength(9);
  });
  it('accepts GPT-OSS’s real Arabic exam dates/times and stored English titles', () => {
    expect(scoreSchoolFacts(sample('upcoming-exams-ar', 'baseline').text, fixture('upcoming-exams-ar').schoolFacts).factFailures).toEqual([]);
    expect(language('upcoming-exams-ar', 'baseline').mixedLanguage).toBe(false);
    expect(language('upcoming-exams-ar', 'baseline').language).toBe('ar');
  });
  it('catches the English French-class tail, Arabic English tail and Chinese fragment', () => {
    for (const id of ['classes-fr', 'missing-student-ar', 'classes-ar']) expect(language(id, 'candidate').mixedLanguage).toBe(true);
  });
  it('flags formal Arabic for Darija without flagging GPT-OSS’s Darija exam prose', () => {
    expect(language('upcoming-exams-ary', 'candidate').wrongRegister).toBe(true);
    expect(language('upcoming-exams-ary', 'baseline').wrongRegister).toBe(false);
    expect(language('upcoming-exams-ary', 'baseline').mixedLanguage).toBe(false);
  });
});
