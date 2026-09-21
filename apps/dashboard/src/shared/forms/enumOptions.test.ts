import { describe, expect, it } from 'bun:test';

import { optionsFromValues, withStoredValue } from './enumOptions';

const echo = (key: string) => key;

describe('optionsFromValues', () => {
  it('keeps the order of the tuple it is given', () => {
    expect(optionsFromValues(['b', 'a', 'c'] as const, echo, 'x').map((o) => o.value)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('builds each label from the prefix and the value', () => {
    expect(optionsFromValues(['quiz'] as const, echo, 'assessments.type')).toEqual([
      { value: 'quiz', label: 'assessments.type.quiz' },
    ]);
  });

  it('returns nothing for an empty tuple rather than throwing', () => {
    expect(optionsFromValues([] as const, echo, 'x')).toEqual([]);
  });
});

describe('withStoredValue', () => {
  const options = optionsFromValues(['a', 'b'] as const, echo, 'x');

  it('appends a value the list does not offer', () => {
    expect(withStoredValue(options, 'legacy', (v) => `kept:${v}`)).toEqual([
      { value: 'a', label: 'x.a' },
      { value: 'b', label: 'x.b' },
      { value: 'legacy' as never, label: 'kept:legacy' },
    ]);
  });

  it('leaves the list alone when the value is already offered', () => {
    expect(withStoredValue(options, 'a', () => 'unused')).toBe(options);
  });

  it('leaves the list alone for a record with nothing stored', () => {
    for (const empty of [undefined, null, '']) {
      expect(withStoredValue(options, empty, () => 'unused')).toBe(options);
    }
  });

  it('never appends the same value twice', () => {
    const once = withStoredValue(options, 'legacy', (v) => v);
    const twice = withStoredValue(once, 'legacy', (v) => v);

    expect(twice).toHaveLength(3);
  });
});
