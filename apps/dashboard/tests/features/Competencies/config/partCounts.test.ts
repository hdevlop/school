import { describe, expect, it } from 'bun:test';
import { classParts, PART_PRIORITY_RATE } from '@/features/Competencies/config/partCounts';

describe('the counts of a test\'s questions', () => {
  const questions = [
    { testId: 'exam-1', id: 'q1', label: 'السؤال 1' },
    { testId: 'exam-1', id: 'q2', label: 'السؤال 2' },
    { testId: 'exam-1', id: 'q3', label: 'السؤال 3' },
  ];
  const counts: Record<string, number> = { q1: 3, q2: 1 };

  it('rates each question against the pupils who sat the test, and leaves an uncounted one blank', () => {
    const parts = classParts(questions, (_test, part) => counts[part] ?? null, 3);
    expect(parts.map((part) => [part.partId, part.correct, part.rate])).toEqual([['q1', 3, 100], ['q2', 1, 33], ['q3', null, null]]);
    expect(PART_PRIORITY_RATE).toBe(50);
  });

  it('gives no rate when nobody has a mark yet', () => {
    expect(classParts(questions, () => 2, 0).map((part) => part.rate)).toEqual([null, null, null]);
  });
});
