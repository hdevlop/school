import { describe, expect, it } from 'bun:test';
import { compareHomeworkGiven, NEWEST_FIRST } from '@/features/Homework/config/homeworkOrder';

describe('the homework list order', () => {
  it('starts newest first', () => {
    expect(NEWEST_FIRST).toEqual([{ id: 'date', desc: true }]);
  });

  it('orders by the day given, then by when each was added that day', () => {
    const rows = [
      { id: 'b', date: '2026-11-26', createdAt: '2026-11-26T08:00:00.000Z' },
      { id: 'old', date: '2026-11-20', createdAt: '2026-11-26T09:00:00.000Z' },
      { id: 'c', date: '2026-11-26', createdAt: '2026-11-26T10:30:00.000Z' },
      { id: 'a', date: '2026-11-26', createdAt: null },
    ];
    expect([...rows].sort(compareHomeworkGiven).map(row => row.id)).toEqual(['old', 'a', 'b', 'c']);
  });
});
