import { describe, expect, it } from 'bun:test';
import { schoolDayPeriods } from '../src/routines';
import { email } from '../src/fixtures/fakers';

describe('school hours', () => {
  it('fits six lessons and a 30 minute lunch into 08:00-15:00', () => {
    const periods = schoolDayPeriods();
    expect(periods).toHaveLength(7);
    expect(periods[0].startTime).toBe('08:00');
    expect(periods.at(-1)?.endTime).toBe('15:00');
    expect(periods[3]).toMatchObject({ type: 'break', startTime: '11:15', endTime: '11:45' });
    periods.slice(1).forEach((period, index) => expect(period.startTime).toBe(periods[index].endTime));
  });
  it('honors a different configured day and distributes spare minutes', () => {
    const periods = schoolDayPeriods({ schoolStartTime: '08:30', schoolEndTime: '15:31', lunchBreakDuration: 60 });
    expect(periods[0].startTime).toBe('08:30');
    expect(periods[3]).toMatchObject({ startTime: '11:31', endTime: '12:31' });
    expect(periods.at(-1)?.endTime).toBe('15:31');
    expect(schoolDayPeriods({ schoolStartTime: '8:00' })[0].startTime).toBe('08:00');
  });
  it('rejects invalid or impossible days', () => {
    expect(() => schoolDayPeriods({ schoolStartTime: '25:00' })).toThrow();
    expect(() => schoolDayPeriods({ schoolEndTime: '08:20' })).toThrow();
  });
});

it('generates demo mailboxes only on the reserved test domain', () => {
  for (let i = 0; i < 100; i++) expect(email('Amine', 'Demo')).toMatch(/@school\.test$/);
});
