import { describe, expect, it } from 'bun:test';
import {
  addDays,
  datesBetween,
  entriesOn,
  hasRegister,
  rankAssessments,
  ratePercent,
  schoolClock,
  sessionStatus,
  weekdayOf,
} from '../../src/modules/dashboard/teacher/teacherDashboardMetrics';

describe('school clock', () => {
  it('reads the date and time of day in the school time zone', () => {
    // 23:30 UTC on Sunday is already 00:30 on Monday in Casablanca (UTC+1).
    const clock = schoolClock('Africa/Casablanca', new Date('2026-09-27T23:30:00Z'));
    expect(clock).toEqual({ date: '2026-09-28', weekday: 'monday', minutes: 30 });
  });

  it('lets the business-date override pick the day but keeps the real time', () => {
    const clock = schoolClock('UTC', new Date('2026-09-28T10:15:00Z'), '2026-10-02');
    expect(clock).toEqual({ date: '2026-10-02', weekday: 'friday', minutes: 615 });
  });

  it('falls back to the server clock for an unknown zone', () => {
    expect(() => schoolClock('Not/AZone', new Date('2026-09-28T10:15:00Z'))).not.toThrow();
  });
});

describe('calendar helpers', () => {
  it('steps whole days across month ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-01', -7)).toBe('2026-09-24');
    expect(weekdayOf('2026-09-26')).toBe('saturday');
    expect(datesBetween('2026-09-29', '2026-10-01')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
  });
});

describe('lesson status', () => {
  it('counts down to the start, then runs until the end', () => {
    expect(sessionStatus('10:00:00', '10:50:00', 575)).toEqual({ status: 'upcoming', minutesUntilStart: 25 });
    expect(sessionStatus('10:00', '10:50', 600)).toEqual({ status: 'inProgress', minutesUntilStart: null });
    expect(sessionStatus('10:00', '10:50', 650)).toEqual({ status: 'completed', minutesUntilStart: null });
  });

  it('keeps lessons on days the routine does not run out of the day', () => {
    const entries = [
      { id: 'mon', dayOfWeek: 'monday', activeDays: ['monday', 'tuesday'] },
      { id: 'mon-off', dayOfWeek: 'monday', activeDays: ['tuesday'] },
      { id: 'tue', dayOfWeek: 'tuesday', activeDays: ['monday', 'tuesday'] },
    ];
    expect(entriesOn(entries, '2026-09-28').map((entry) => entry.id)).toEqual(['mon']);
  });
});

describe('registers', () => {
  const registers = [{ date: '2026-09-28', sectionId: 's1', teacherAssignmentId: 'other' }];

  it('accepts any teacher\'s daily register for the section', () => {
    expect(hasRegister(registers, { sectionId: 's1', teacherAssignmentId: 'a1' }, '2026-09-28', 'daily')).toBe(true);
    expect(hasRegister(registers, { sectionId: 's1', teacherAssignmentId: 'a1' }, '2026-09-29', 'daily')).toBe(false);
  });

  it('requires the lesson\'s own assignment in per-lesson mode', () => {
    expect(hasRegister(registers, { sectionId: 's1', teacherAssignmentId: 'a1' }, '2026-09-28', 'per_class')).toBe(false);
    expect(hasRegister(registers, { sectionId: 's9', teacherAssignmentId: 'other' }, '2026-09-28', 'per_class')).toBe(true);
  });
});

describe('assessment ranking', () => {
  it('puts grading work first, then what is coming, then what is finished', () => {
    const today = '2026-09-28';
    const ranked = rankAssessments([
      { id: 'done', date: '2026-09-20', gradedCount: 30, studentCount: 30 },
      { id: 'next', date: '2026-10-02', gradedCount: 0, studentCount: 30 },
      { id: 'grading-new', date: '2026-09-27', gradedCount: 5, studentCount: 30 },
      { id: 'grading-old', date: '2026-09-15', gradedCount: 0, studentCount: 30 },
      { id: 'empty-section', date: '2026-09-10', gradedCount: 0, studentCount: 0 },
    ], today, 4);
    expect(ranked.map((item) => item.id)).toEqual(['grading-old', 'grading-new', 'next', 'done']);
  });

  it('reports no rate rather than zero when nothing was marked', () => {
    expect(ratePercent(0, 0)).toBeNull();
    expect(ratePercent(46, 50)).toBe(92);
  });
});
