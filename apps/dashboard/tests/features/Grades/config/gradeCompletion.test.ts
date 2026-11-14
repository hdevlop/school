import { describe, expect, it } from 'bun:test';
import type { MassarMark } from '@sms/contracts';
import {
  completionListCss, completionText, isComplete, isGradeDone, rosterCompletion, sheetComponentCompletion,
} from '../../../../src/features/Grades/config/gradeCompletion';

const student = (id: string) => ({ id, studentCode: id, name: id, dateOfBirth: '2018-01-01', massarStudentId: null, position: 0 });
const mark = (studentId: string, componentCode: string, value: number | null, absence: MassarMark['absence'] = 'none'): MassarMark =>
  ({ studentId, componentCode, mark: value, absence });

describe('Grade completion', () => {
  it('counts a mark or an absence as done, never an empty or half-cleared cell', () => {
    expect(isGradeDone({ marksObtained: 0 })).toBe(true);
    expect(isGradeDone({ marksObtained: '7.5' })).toBe(true);
    expect(isGradeDone({ marksObtained: null, status: 'missed' })).toBe(true);
    expect(isGradeDone({ marksObtained: null, status: 'pending' })).toBe(false);
    expect(isGradeDone({ marksObtained: '', status: 'pending' })).toBe(false);
  });

  it('counts only the students who can take a mark', () => {
    const rows = [
      { studentId: 'a', marksObtained: 8 },
      { studentId: 'b', marksObtained: null },
      { studentId: 'left', marksObtained: null },
    ];
    expect(rosterCompletion(rows, (row) => row.studentId !== 'left')).toEqual({ done: 1, total: 2 });
  });

  it('counts each component of a sheet over the sheet students only', () => {
    const completion = sheetComponentCompletion({
      components: [{ code: 'chant', name: 'Comptine/Chant' }, { code: 'dictee', name: 'Dictée' }],
      students: [student('a'), student('b')],
      marks: [
        mark('a', 'chant', 9), mark('b', 'chant', null, 'justified'),
        mark('a', 'dictee', null), mark('outsider', 'dictee', 6), mark('a', 'unknown', 5),
      ],
    });
    expect(completion.get('chant')).toEqual({ done: 2, total: 2 });
    expect(completion.get('dictee')).toEqual({ done: 0, total: 2 });
    expect(completion.has('unknown')).toBe(false);
  });

  it('shows a check once complete, otherwise the count', () => {
    expect(completionText({ done: 2, total: 2 })).toBe('✓');
    expect(completionText({ done: 14, total: 21 })).toBe('14/21');
    expect(completionText({ done: 0, total: 0 })).toBe('');
    expect(completionText(undefined)).toBe('');
    expect(isComplete({ done: 0, total: 0 })).toBe(false);
  });

  it('draws each count after its option, only in the exam picker, and cannot close the style element', () => {
    const css = completionListCss('Rechercher un examen', [
      { label: 'Graphisme', completion: { done: 0, total: 21 } },
      { label: 'Chant "A"</style>', completion: { done: 21, total: 21 } },
      { label: 'Not loaded', completion: undefined },
    ]).split('\n');
    expect(css).toHaveLength(2);
    expect(css[0]).toStartWith('[cmdk-root]:has(input[placeholder="Rechercher un examen"]) [cmdk-item][data-value="Graphisme"]::after{content:"0/21";');
    expect(css[1]).toContain('[data-value="Chant \\"A\\"\\3C /style>"]');
    expect(css[1]).toContain('content:"✓"');
    expect(css.join('')).not.toContain('</style');
  });
});
