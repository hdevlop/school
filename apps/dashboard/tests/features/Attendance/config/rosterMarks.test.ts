import { describe, expect, it } from 'bun:test';
import { changedRosterMarks, rosterMark } from '@/features/Attendance/config/rosterMarks';

describe('explicit attendance marks', () => {
  const roster = [{ id: 'one' }, { id: 'two' }];
  it('leaves missing and invalid records unmarked', () => {
    expect(rosterMark(undefined, undefined)).toBe('unmarked');
    expect(rosterMark(undefined, 'invalid')).toBe('unmarked');
    expect(changedRosterMarks(roster, {}, new Map())).toEqual([]);
  });
  it('submits only explicitly marked people', () => {
    expect(changedRosterMarks(roster, { one: 'present' }, new Map())).toEqual([
      { person: roster[0], status: 'present', existing: undefined },
    ]);
  });
  it('preserves saved marks and omits unchanged or out-of-roster drafts', () => {
    const saved = new Map([['one', { id: 'saved', status: 'absent' }]]);
    expect(rosterMark(undefined, 'absent')).toBe('absent');
    expect(rosterMark('late', 'absent')).toBe('late');
    expect(changedRosterMarks(roster, { one: 'absent', other: 'present' }, saved)).toEqual([]);
    expect(changedRosterMarks(roster, { one: 'late' }, saved)[0].existing?.id).toBe('saved');
  });
});

describe('student attendance defaults', () => {
  const roster = [{ id: 'one' }, { id: 'two' }];

  it('selects Present for new students and includes them in the pending save', () => {
    expect(rosterMark(undefined, undefined, 'present')).toBe('present');
    expect(changedRosterMarks(roster, {}, new Map(), 'present')).toEqual([
      { person: roster[0], status: 'present', existing: undefined },
      { person: roster[1], status: 'present', existing: undefined },
    ]);
  });

  it('preserves recorded absence and lateness instead of replacing them with defaults', () => {
    const saved = new Map([
      ['one', { id: 'saved-one', status: 'absent' }],
      ['two', { id: 'saved-two', status: 'late' }],
    ]);
    expect(rosterMark(undefined, 'absent', 'present')).toBe('absent');
    expect(rosterMark(undefined, 'late', 'present')).toBe('late');
    expect(changedRosterMarks(roster, {}, saved, 'present')).toEqual([]);
  });

  it('lets a new student be marked absent while the rest remain Present', () => {
    expect(changedRosterMarks(roster, { one: 'absent' }, new Map(), 'present')).toEqual([
      { person: roster[0], status: 'absent', existing: undefined },
      { person: roster[1], status: 'present', existing: undefined },
    ]);
  });
});
