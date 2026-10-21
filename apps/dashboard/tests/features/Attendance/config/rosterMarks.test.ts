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
