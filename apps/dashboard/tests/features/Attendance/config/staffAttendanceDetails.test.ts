import { describe, expect, it } from 'bun:test';
import { changedStaffRosterMarks, staffAttendanceDetails } from '@/features/Attendance/config/staffAttendanceDetails';

const roster = [{ id: 'one' }, { id: 'two' }];
const saved = new Map([['one', { id: 'record', status: 'late', arrivalTime: '09:15', notes: 'Bus delayed' }]]);

describe('staff arrival and notes drafts', () => {
  it('restores saved details and normalizes missing values', () => {
    expect(staffAttendanceDetails()).toEqual({ arrivalTime: '', notes: '' });
    expect(staffAttendanceDetails(saved.get('one'))).toEqual({ arrivalTime: '09:15', notes: 'Bus delayed' });
  });
  it('saves a details-only correction without changing the status or marking other people', () => {
    expect(changedStaffRosterMarks(roster, {}, { one: { arrivalTime: '09:20', notes: 'Traffic' } }, saved))
      .toEqual([{ person: roster[0], status: 'late', existing: saved.get('one') }]);
  });
  it('does not save unchanged details, out-of-roster details or an unmarked person', () => {
    expect(changedStaffRosterMarks(roster, {}, {
      one: { arrivalTime: '09:15', notes: 'Bus delayed' },
      two: { arrivalTime: '09:20', notes: 'Unmarked' },
      other: { arrivalTime: '09:25', notes: 'Not in roster' },
    }, saved)).toEqual([]);
  });
  it('keeps one correction for a simultaneous mark/detail change and permits clearing', () => {
    const changes = changedStaffRosterMarks(roster, { one: 'present' }, { one: { arrivalTime: '', notes: '' } }, saved);
    expect(changes).toHaveLength(1);
    expect(changes[0].status).toBe('present');
    expect(changedStaffRosterMarks(roster, {}, { one: { arrivalTime: '', notes: '' } }, saved)).toHaveLength(1);
  });
});
