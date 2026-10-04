import { describe, expect, it } from 'bun:test';
import { matchesAnyChild, matchesClassSection } from './classSectionScope';

describe('class and section filters', () => {
  it('uses IDs even when different classes share the same section name', () => {
    const rows = [
      { class: { id: 'c1' }, section: { id: 's1' } },
      { class: { id: 'c2' }, section: { id: 's2' } },
    ];
    expect(rows.filter((row) => matchesClassSection(row, 'c1', 's1'))).toEqual([rows[0]]);
    expect(rows.filter((row) => matchesClassSection(row, 'c1', 's2'))).toEqual([]);
  });

  it('matches multi-section records and keeps unassigned rows when filters are cleared', () => {
    expect(matchesClassSection({ classId: 'c1', sectionIds: ['s1', 's2'] }, 'c1', 's2')).toBe(true);
    expect(matchesClassSection({}, '', '')).toBe(true);
    expect(matchesClassSection({}, 'c1', '')).toBe(false);
  });

  it('requires the same child to match both filters', () => {
    const children = [{ classId: 'c1', sectionId: 's1' }, { classId: 'c2', sectionId: 's2' }];
    expect(matchesAnyChild(children, 'c1', 's1')).toBe(true);
    expect(matchesAnyChild(children, 'c1', 's2')).toBe(false);
    expect(matchesAnyChild([], '', '')).toBe(true);
    expect(matchesAnyChild(undefined, 'c1', '')).toBe(false);
  });
});
