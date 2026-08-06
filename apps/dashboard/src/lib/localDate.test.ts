import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shiftLocalISODate, toLocalISODate } from './localDate';

describe('local calendar date helpers', () => {
  it('formats the local calendar day without converting through UTC', () => {
    assert.equal(toLocalISODate(new Date(2026, 6, 12, 0, 30)), '2026-07-12');
  });

  it('shifts across month and year boundaries', () => {
    assert.equal(shiftLocalISODate('2026-12-31', 1), '2027-01-01');
    assert.equal(shiftLocalISODate('2026-03-01', -1), '2026-02-28');
  });
});
