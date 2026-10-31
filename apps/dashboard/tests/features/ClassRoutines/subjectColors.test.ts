import { describe, expect, it } from 'bun:test';
import { colorFor, subjectColors } from '@/features/ClassRoutines/utils/subjectColors';

// Two ids whose character codes sum to the same value share a preferred color.
const clashing = [{ id: 'ab' }, { id: 'ba' }];
const maths = { id: 'm1', code: 'MATH' };
const french = { id: 'f1', code: 'FR' };

describe('subjectColors', () => {
  it('gives subjects that would share a color different ones on the same sheet', () => {
    expect(colorFor(clashing[0])).toBe(colorFor(clashing[1]));
    const colorOf = subjectColors(clashing);
    expect(colorOf('ab')).not.toBe(colorOf('ba'));
  });

  it('keeps a subject on its own color when nothing on the sheet clashes', () => {
    expect(subjectColors([{ id: 'ab' }, { id: 'zz' }])('zz')).toBe(colorFor({ id: 'zz' }));
  });

  it('gives the same colors whatever order the lessons come in', () => {
    const forward = subjectColors([...clashing, { id: 'c1' }, maths]);
    const reverse = subjectColors([maths, { id: 'c1' }, clashing[1], clashing[0], clashing[0]]);
    for (const id of ['ab', 'ba', 'c1', 'm1']) expect(forward(id)).toBe(reverse(id));
  });

  it('falls back to the preferred color for a subject not on the sheet', () => {
    expect(subjectColors([])('ab')).toBe(colorFor({ id: 'ab' }));
  });

  it('colors the printed subjects as the printed sheet does, whatever their id', () => {
    expect(colorFor(maths)).toContain('bg-[#dcf2e1]');
    expect(colorFor({ id: 'other', code: ' math ' })).toBe(colorFor(maths));
    expect(subjectColors([maths, french])('f1')).toContain('bg-[#dce9fb]');
  });

  it('never gives a printed subject\'s color to another subject on the sheet', () => {
    // An id whose hash lands on Maths' green.
    const rival = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id })).find((subject) => colorFor(subject) === colorFor(maths))!;
    const colorOf = subjectColors([rival, maths]);
    expect(colorOf('m1')).toBe(colorFor(maths));
    expect(colorOf(rival.id)).not.toBe(colorFor(maths));
  });
});
