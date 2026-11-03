import { describe, expect, test } from 'bun:test';
import {
  buildStudentPickerOptions,
  scoreStudentPickerOption,
} from '@/features/Students/config/studentPickerOptions';

const namesakes = [
  { id: 'b', name: 'Zidane Aya', studentCode: 'F2', class: { name: '3AC' }, section: { name: 'B' } },
  { id: 'a', name: 'Zidane Aya', studentCode: 'F1', class: { name: '1AC' }, section: { name: 'A' } },
  { id: 'c', name: 'Amrani Élodie', arabicName: 'إلودي', studentCode: 'F3', class: { name: '2AC' }, section: null },
];

describe('student picker options', () => {
  test('two students with one name differ by class, section and code', () => {
    const [, first, second] = buildStudentPickerOptions(namesakes);
    expect(first.name).toBe(second.name);
    expect([first.placement, second.placement].sort()).toEqual(['1AC · A', '3AC · B']);
    expect([first.code, second.code].sort()).toEqual(['F1', 'F2']);
  });

  test('sorts by name so namesakes sit side by side', () => {
    expect(buildStudentPickerOptions(namesakes).map(option => option.name)).toEqual([
      'Amrani Élodie', 'Zidane Aya', 'Zidane Aya',
    ]);
  });

  test('a missing placement or code stays empty, never "undefined"', () => {
    const [unplaced] = buildStudentPickerOptions([{ id: 'x', name: 'Sara', class: null, section: null }]);
    expect(unplaced.placement).toBeNull();
    expect(unplaced.code).toBeNull();
    expect(buildStudentPickerOptions([{ id: 'y', name: 'Omar', class: { name: '1AC' }, section: null }])[0].placement).toBe('1AC');
    expect(buildStudentPickerOptions(undefined)).toEqual([]);
  });

  describe('search', () => {
    const keywordsOf = (id: string) => buildStudentPickerOptions(namesakes).find(option => option.value === id)!.keywords;

    test.each([
      ['zidane', 'a', 1],
      ['F1', 'a', 1],
      ['1ac', 'a', 1],
      ['3ac', 'a', 0],
      ['aya 3ac', 'b', 1],
      ['aya 1ac', 'b', 0],
      ['elodie', 'c', 1],
      ['إلودي', 'c', 1],
      ['', 'a', 1],
    ] as const)('"%s" against %s scores %d', (search, id, score) => {
      expect(scoreStudentPickerOption(search, keywordsOf(id))).toBe(score);
    });

    test('never matches the hidden record id', () => {
      const [option] = buildStudentPickerOptions([{ id: 'qX7kP', name: 'Sara', studentCode: 'F9' }]);
      expect(scoreStudentPickerOption('qx7kp', option.keywords)).toBe(0);
    });
  });
});
