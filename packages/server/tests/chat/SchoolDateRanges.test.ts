import { expect, test } from 'bun:test';
import { schoolDateRanges } from '../../src/modules/chat/transport/schoolDateRanges';

test('relative periods come computed from the school date, weeks Monday to Sunday', () => {
  const text = schoolDateRanges('2026-11-21');
  expect(text).toContain('Today is Saturday 2026-11-21');
  expect(text).toContain('yesterday 2026-11-20');
  expect(text).toContain('this week 2026-11-16 to 2026-11-22');
  expect(text).toContain('last week 2026-11-09 to 2026-11-15');
  expect(text).toContain('this month 2026-11-01 to 2026-11-30');
  expect(text).toContain('last month 2026-10-01 to 2026-10-31');
});

test('a Sunday belongs to the week that started the Monday before; January looks back to December', () => {
  expect(schoolDateRanges('2026-11-22')).toContain('this week 2026-11-16 to 2026-11-22');
  expect(schoolDateRanges('2026-11-23')).toContain('last week 2026-11-16 to 2026-11-22');
  expect(schoolDateRanges('2027-01-04')).toContain('last month 2026-12-01 to 2026-12-31');
  expect(schoolDateRanges('not a date')).toBe('');
});
