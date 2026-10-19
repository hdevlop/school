import { describe, expect, it } from 'bun:test';
import { defaultFeeSection, resolveFeeRosterSelection } from '@/features/Financial/Fees/utils/feeRosterSelection';

const classes = [{ id: 'ce1', name: 'CE1' }, { id: 'cp', name: ' CP ' }];
const sections = [
  { id: 'cp-b', classId: 'cp', name: 'B' },
  { id: 'ce1-a', classId: 'ce1', name: 'A' },
  { id: 'cp-a', classId: 'cp', name: ' A ' },
];

describe('initial fees roster selection', () => {
  it('selects CP / A by name, regardless of catalog ordering', () => {
    expect(resolveFeeRosterSelection(classes, sections, null)).toEqual({ classId: 'cp', sectionId: 'cp-a' });
  });

  it('falls back within the selected year without automatically reading all students', () => {
    expect(resolveFeeRosterSelection(classes.slice(0, 1), sections, null)).toEqual({ classId: 'ce1', sectionId: 'ce1-a' });
    expect(resolveFeeRosterSelection(classes, sections.slice(0, 2), null)).toEqual({ classId: 'cp', sectionId: 'cp-b' });
    expect(resolveFeeRosterSelection([], [], null)).toEqual({ classId: '', sectionId: '' });
  });

  it('preserves an explicit section or All selection', () => {
    for (const selection of [
      { classId: 'cp', sectionId: 'cp-b' },
      { classId: 'cp', sectionId: '' },
      { classId: 'all', sectionId: '' },
      { classId: 'all', sectionId: 'ce1-a' },
    ]) expect(resolveFeeRosterSelection(classes, sections, selection)).toEqual(selection);
  });

  it('selects A on a class change and repairs a missing or mismatched selection', () => {
    expect(defaultFeeSection(sections, 'ce1')).toBe('ce1-a');
    expect(defaultFeeSection(sections, 'all')).toBe('');
    expect(resolveFeeRosterSelection(classes, sections, { classId: 'cp', sectionId: 'ce1-a' }))
      .toEqual({ classId: 'cp', sectionId: 'cp-a' });
    expect(resolveFeeRosterSelection(classes, sections, { classId: 'previous-year-class', sectionId: 'old-section' }))
      .toEqual({ classId: 'cp', sectionId: 'cp-a' });
  });
});
