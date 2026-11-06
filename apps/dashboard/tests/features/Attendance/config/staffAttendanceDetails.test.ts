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
  it('does not save unchanged or out-of-roster details', () => {
    expect(changedStaffRosterMarks(roster, {}, {
      one: { arrivalTime: '09:15', notes: 'Bus delayed' },
      other: { arrivalTime: '09:25', notes: 'Not in roster' },
    }, saved)).toEqual([]);
  });
  it('leaves default present staff out of the send count, including mark all present', () => {
    expect(changedStaffRosterMarks(roster, {}, {}, new Map())).toEqual([]);
    expect(changedStaffRosterMarks(roster, { one: 'present', two: 'present' }, {}, new Map())).toEqual([]);
  });
  it('sends only absent or late staff and cancels an unsaved exception marked present', () => {
    expect(changedStaffRosterMarks(roster, { one: 'absent', two: 'late' }, {}, new Map()).map(({ status }) => status))
      .toEqual(['absent', 'late']);
    expect(changedStaffRosterMarks(roster, { one: 'present', two: 'late' }, {}, new Map()).map(({ person }) => person.id))
      .toEqual(['two']);
  });
  it('saves intentional details for a default present staff member', () => {
    expect(changedStaffRosterMarks(roster, {}, { two: { arrivalTime: '09:20', notes: 'Office visit' } }, saved))
      .toEqual([{ person: roster[1], status: 'present', existing: undefined }]);
    expect(changedStaffRosterMarks(roster, {}, { two: { arrivalTime: '', notes: '' } }, saved)).toEqual([]);
  });
  it('keeps one correction for a simultaneous mark/detail change and permits clearing', () => {
    const changes = changedStaffRosterMarks(roster, { one: 'present' }, { one: { arrivalTime: '', notes: '' } }, saved);
    expect(changes).toHaveLength(1);
    expect(changes[0].status).toBe('present');
    expect(changedStaffRosterMarks(roster, {}, { one: { arrivalTime: '', notes: '' } }, saved)).toHaveLength(1);
  });
});
