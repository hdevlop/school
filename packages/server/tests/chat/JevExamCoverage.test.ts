import { describe, expect, test } from 'bun:test';
import { acceptsWithQueryGuard } from '../../src/modules/chat/jev/guards/queryGuard';
import { jevReplyPlan } from '../../src/modules/chat/jev/jevReplyPlan';
import { INTENT_NAMES } from '../../src/modules/chat/jev/jevIntents';
import { jevDarijaCases } from './fixtures/jevDarijaCases';

const decision = (choice: any) => ({ choice, confidence: 0.99, writeProbability: 0 });
const examIds = ['q05', 'q06', 'q77', 'q78', 'q79', 'q80'];
const examCases = jevDarijaCases.filter(item => examIds.some(id => item.id.endsWith(id)));
describe('guarded upcoming exam coverage', () => {
  test.each(examCases)('keeps legacy exam classification $id on the router/model path', item => {
    expect(acceptsWithQueryGuard(decision(item.intent), item.query)).toBe(true);
    expect(jevReplyPlan(item.intent, 'ary', '2026-2027')).toBeNull();
  });
  test('preserves the write disagreement stop for the two correctly classified counts', () => {
    for (const id of ['q12', 'q50']) {
      const item = jevDarijaCases.find(item => item.id.endsWith(id))!;
      expect(acceptsWithQueryGuard({ ...decision(item.intent), writeProbability: 0.65 }, item.query)).toBe(false);
      expect(acceptsWithQueryGuard(decision(item.intent), item.query)).toBe(true);
    }
  });
  test('does not accept a forced wrong read choice on any of the 100 reviewed questions', () => {
    const reads = INTENT_NAMES.filter(choice => !['write_request', 'needs_llm'].includes(choice));
    for (const item of jevDarijaCases) for (const choice of reads) {
      if (item.intent !== choice) expect(acceptsWithQueryGuard(decision(choice), item.query)).toBe(false);
    }
  });
  test.each([' ديال ZzClasseDemo', ' غير الرياضيات', ' غدا', ' ف 2025-2026', ' ثم مسح القسم',
    ' و عدد التلاميذ', ' ديال التلميذ ZzEleveDemo', ' + 1', ' اليوم', ' هاد السيمانة'])('preserves exam qualifiers and operations: %s', suffix => {
    for (const item of examCases) expect(acceptsWithQueryGuard(decision('upcoming_exams'), item.query + suffix)).toBe(false);
  });
  test.each(['"إمتى الفرض الجاي؟"', 'imta lfard jay f l9ism A?', 'ch7al mn forod jayin?',
    'wach ma kayninch forod?', 'عطيني جميع الامتحانات', 'imta lfard jay dyal riyadiyat?'])('declines unsupported exam request %s', query => {
    expect(acceptsWithQueryGuard(decision('upcoming_exams'), query)).toBe(false);
    expect(jevReplyPlan('upcoming_exams', 'ary', '2026-2027')).toBeNull();
  });
});
