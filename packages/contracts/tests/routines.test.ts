import { describe, expect, it } from 'bun:test';
import { describeRoutineContent } from '../src/routines';

describe('routine content summary', () => {
  it('keeps a plain lesson as its assigned subject', () => {
    expect(describeRoutineContent([], 'Maths', 'OR')).toBe('Maths');
  });

  it('describes fixed content and teacher-managed alternatives in the same hour', () => {
    expect(describeRoutineContent([
      { kind: 'fixed', label: 'التعبير الكتابي' },
      { kind: 'alternative', options: ['مشروع الوحدة', 'الاجتماعيات'] },
    ], 'Arabic', 'OR')).toBe('التعبير الكتابي · مشروع الوحدة OR الاجتماعيات');
  });
});
