import { describe, expect, it } from 'bun:test';
import {
  INTENT_NAMES, accepts, buildDecisionRequest, chooseThreshold, labelBaseCase, parseDecision, summarize,
  templateIntent, validateAcceptancePolicy, validateCases,
} from '../chatbot-jev.mjs';

const decision = (choice, confidence, writeProbability = choice === 'write_request' ? 0.9 : 0.1) =>
  ({ choice, confidence, writeProbability });
const sample = (id, intent, language, choice, confidence) => ({
  item: { id, intent, language, isWrite: intent === 'write_request' },
  decision: decision(choice, confidence),
  durationMs: 100,
});
const response = () => ({ model: 'typesafe/jev-1.13-20260917',
  usage: { input_tokens: 500, output_tokens: 70, cost: 0.000021 },
  answers: { intent: { type: 'choice', choice: 'class_list', confidence: 0.8,
    probabilities: { ...Object.fromEntries(INTENT_NAMES.map(name => [name, 0])), class_list: 0.9, needs_llm: 0.1 } },
  is_write: { type: 'noul', noul: 0.02 } } });
const invalidProbabilities = [-0.1, 1.1, NaN, Infinity, -Infinity, null, undefined, '0.8'];

describe('Jev request and response', () => {
  it('asks one closed choice over every intent plus a yes/no write question', () => {
    const request = buildDecisionRequest('شحال من تلميذ مسجل هاد العام؟');
    expect(request.model).toBe('typesafe/jev-1.13');
    expect(Object.keys(request.questions.intent.criteria)).toEqual(INTENT_NAMES);
    expect(request.questions.is_write.type).toBe('noul');
    expect(() => buildDecisionRequest('  ')).toThrow();
  });

  it('parses a documented answer and refuses an unknown choice', () => {
    const body = response();
    expect(parseDecision(body)).toMatchObject({ choice: 'class_list', confidence: 0.8, topProbability: 0.9, costUsd: 0.000021 });
    body.answers.intent.choice = 'delete_everything';
    expect(() => parseDecision(body)).toThrow();
  });

  it('rejects out-of-range/nonfinite/missing confidence, write scores and probabilities', () => {
    for (const value of invalidProbabilities) {
      const confidence = response();
      confidence.answers.intent.confidence = value;
      expect(() => parseDecision(confidence)).toThrow('Malformed Jev decision');
      const write = response();
      write.answers.is_write.noul = value;
      expect(() => parseDecision(write)).toThrow('Malformed Jev decision');
      const distribution = response();
      distribution.answers.intent.probabilities.class_list = value;
      expect(() => parseDecision(distribution)).toThrow('Malformed Jev decision');
    }
    const overflow = JSON.parse(JSON.stringify(response()).replace('"confidence":0.8', '"confidence":1e400'));
    expect(() => parseDecision(overflow)).toThrow();
  });

  it('requires the full closed distribution, a plausible sum and a maximal selected choice', () => {
    for (const probabilities of [null, [], {}, { class_list: 1 }]) {
      const body = response();
      body.answers.intent.probabilities = probabilities;
      expect(() => parseDecision(body)).toThrow();
    }
    const unknown = response();
    delete unknown.answers.intent.probabilities.needs_llm;
    unknown.answers.intent.probabilities.other = 0.1;
    expect(() => parseDecision(unknown)).toThrow();
    const zero = response();
    zero.answers.intent.probabilities = Object.fromEntries(INTENT_NAMES.map(name => [name, 0]));
    expect(() => parseDecision(zero)).toThrow();
    const excessive = response();
    excessive.answers.intent.probabilities.needs_llm = 0.9;
    expect(() => parseDecision(excessive)).toThrow();
    const wrongTop = response();
    wrongTop.answers.intent.choice = 'needs_llm';
    expect(() => parseDecision(wrongTop)).toThrow();
  });

  it('accepts numeric endpoints, valid ties and retained provider rounding without mutating input', () => {
    const body = response();
    body.model = 'typesafe/jev-1.13';
    body.usage = { input_tokens: 0, cost: 0 };
    body.answers.intent.confidence = 1;
    body.answers.is_write.noul = 0;
    body.answers.intent.probabilities.class_list = 1;
    body.answers.intent.probabilities.needs_llm = 0;
    expect(parseDecision(body)).toMatchObject({ confidence: 1, writeProbability: 0, inputTokens: 0, costUsd: 0 });
    body.answers.intent.confidence = 0;
    body.answers.is_write.noul = 1;
    body.answers.intent.probabilities = Object.fromEntries(INTENT_NAMES.map(name => [name, 0.11]));
    const before = structuredClone(body);
    const parsed = parseDecision(body);
    expect(parsed.topProbability).toBe(0.11);
    expect(body).toEqual(before);
    parsed.probabilities.class_list = 0;
    expect(body).toEqual(before);
  });

  it('rejects missing/invalid usage and a model outside the pinned release family', () => {
    for (const model of [undefined, null, '', 'typesafe/jev-1.14', '~typesafe/jev-latest',
      'typesafe/jev-1.130-20260917', 'typesafe/jev-1.13-anything', 'typesafe/jev-1.13-20260917-extra']) {
      expect(() => parseDecision({ ...response(), model })).toThrow();
    }
    for (const usage of [undefined, null, [], {}, { input_tokens: 500 }]) {
      expect(() => parseDecision({ ...response(), usage })).toThrow();
    }
    for (const cost of [-1, NaN, Infinity, -Infinity, null, undefined, '0.01']) {
      const body = response();
      body.usage.cost = cost;
      expect(() => parseDecision(body)).toThrow();
    }
    for (const count of [-1, 1.5, NaN, Infinity, null, undefined, '500', Number.MAX_SAFE_INTEGER + 1]) {
      const input = response();
      input.usage.input_tokens = count;
      expect(() => parseDecision(input)).toThrow();
      const output = response();
      output.usage.output_tokens = count;
      expect(() => parseDecision(output)).toThrow();
    }
  });
});

describe('labels', () => {
  it('maps base corpus cases to intents and keeps named lookups on the model', () => {
    expect(labelBaseCase({ id: 'a', kind: 'single-read', expectedToolGroups: [['classes_get_classes']] }).intent).toBe('class_list');
    expect(labelBaseCase({ id: 'b', kind: 'single-read', expectedToolGroups: [['search_search_students']] }).intent).toBe('needs_llm');
    expect(labelBaseCase({ id: 'c', kind: 'blocked-write' })).toMatchObject({ intent: 'write_request', isWrite: true, split: 'dev' });
  });

  it('rejects a write flag that disagrees with the intent', () => {
    expect(() => validateCases([{ id: 'x', language: 'fr', split: 'test', intent: 'class_list', isWrite: true, query: 'q' }])).toThrow();
  });

  it('maps template results onto the same intents', () => {
    expect(templateIntent(null)).toBe('needs_llm');
    expect(templateIntent({ text: 'refusal' })).toBe('write_request');
    expect(templateIntent({ calls: [{ name: 'students_get_student_count' }, { name: 'teachers_get_teacher_count' }] })).toBe('student_and_teacher_count');
  });
});

describe('scoring', () => {
  it('keeps the full default and declines exam choices only in the explicit core policy', () => {
    expect(accepts(decision('upcoming_exams', 1), 0.8, true)).toBe(true);
    expect(accepts(decision('upcoming_exams', 1), 0.8, true, 'core')).toBe(false);
    expect(accepts(decision('class_list', 0.9), 0.8, true, 'core')).toBe(true);
    expect(accepts(decision('class_list', 0.9, 0.7), 0.8, true, 'core')).toBe(false);
    expect(accepts(decision('write_request', 0.9, 0.9), 0.8, true, 'core')).toBe(true);
    expect(accepts(decision('class_list', 1), 0.8, true, 'missing')).toBe(false);
    expect(() => validateAcceptancePolicy('missing')).toThrow();
    expect(Object.keys(buildDecisionRequest('test').questions.intent.criteria)).toEqual(INTENT_NAMES);
  });

  it('reports coverage for supported intents without relabeling excluded exam cases', () => {
    const rows = [sample('a', 'class_list', 'fr', 'class_list', 0.9),
      sample('b', 'upcoming_exams', 'fr', 'upcoming_exams', 0.9),
      sample('c', 'needs_llm', 'ary', 'upcoming_exams', 0.9)];
    expect(summarize(rows, 0.8, true, 'core')).toMatchObject({ acceptancePolicy: 'core',
      accepted: 1, acceptedWrong: 0, coverage: 1, topChoiceAccuracy: 2 / 3 });
    expect(rows[1].item.intent).toBe('upcoming_exams');
    expect(summarize(rows, 0.8, true)).toMatchObject({ accepted: 3, acceptedWrong: 1 });
  });

  it('rejects malformed normalized decisions and thresholds in both guarded and raw modes', () => {
    for (const guarded of [false, true]) {
      for (const value of invalidProbabilities) {
        expect(accepts(decision('class_list', value), 0.8, guarded)).toBe(false);
        expect(accepts({ ...decision('class_list', 0.9), writeProbability: value }, 0.8, guarded)).toBe(false);
        expect(accepts(decision('class_list', 0.9), value, guarded)).toBe(false);
      }
      expect(accepts(decision('not_an_intent', 1), 0.8, guarded)).toBe(false);
      expect(accepts(null, 0.8, guarded)).toBe(false);
    }
  });

  it('keeps inclusive threshold endpoints and the existing write-agreement boundary', () => {
    expect(accepts(decision('class_list', 0, 0), 0, true)).toBe(true);
    expect(accepts(decision('write_request', 1, 1), 1, true)).toBe(true);
    expect(accepts(decision('class_list', 0.8, 0.49), 0.8, true)).toBe(true);
    expect(accepts(decision('class_list', 0.8, 0.5), 0.8, true)).toBe(false);
    expect(accepts(decision('write_request', 0.8, 0.5), 0.8, true)).toBe(true);
  });
  it('never accepts needs_llm or a choice below the threshold, and the guard needs agreement', () => {
    expect(accepts(decision('needs_llm', 1), 0.5)).toBe(false);
    expect(accepts(decision('class_list', 0.6), 0.7)).toBe(false);
    expect(accepts({ choice: 'class_list', confidence: 0.9, writeProbability: 0.8 }, 0.7, true)).toBe(false);
    expect(accepts({ choice: 'class_list', confidence: 0.9, writeProbability: 0.8 }, 0.7, false)).toBe(true);
  });

  it('counts wrong accepted answers and writes answered as reads', () => {
    const rows = [sample('a', 'class_list', 'fr', 'class_list', 0.9), sample('b', 'write_request', 'fr', 'class_list', 0.9),
      sample('c', 'needs_llm', 'fr', 'needs_llm', 0.9)];
    expect(summarize(rows, 0.5)).toMatchObject({ accepted: 2, acceptedWrong: 1, precision: 0.5, writeAnsweredAsRead: 1 });
  });

  it('counts questions, not repetitions, for the precision bound', () => {
    const rows = [sample('a', 'class_list', 'fr', 'class_list', 0.9), sample('a', 'class_list', 'fr', 'class_list', 0.9),
      sample('b', 'teacher_count', 'fr', 'teacher_count', 0.9)];
    const clean = summarize(rows, 0.8);
    expect(clean).toMatchObject({ accepted: 3, acceptedCases: 2, wrongCaseCount: 0 });
    expect(clean.errorUpperBound95).toBeCloseTo(1 - Math.sqrt(0.05), 12);
    const withWrong = summarize([...rows, sample('a', 'class_list', 'fr', 'teacher_count', 0.9)], 0.8);
    expect(withWrong).toMatchObject({ acceptedCases: 2, wrongCaseCount: 1, errorUpperBound95: null });
    expect(summarize([], 0.8)).toMatchObject({ acceptedCases: 0, errorUpperBound95: null });
  });

  it('chooses the lowest threshold that meets the floor in every language', () => {
    const rows = [sample('a', 'class_list', 'fr', 'class_list', 0.9), sample('b', 'needs_llm', 'ary', 'class_list', 0.6),
      sample('c', 'teacher_count', 'ary', 'teacher_count', 0.95)];
    expect(chooseThreshold(rows, { grid: [0.5, 0.7, 0.9] })).toBe(0.7);
    expect(chooseThreshold([sample('d', 'needs_llm', 'fr', 'class_list', 0.99)], { grid: [0.5] })).toBeNull();
  });
});
