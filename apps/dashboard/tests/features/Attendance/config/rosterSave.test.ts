import { describe, expect, it } from 'bun:test';
import {
  reconcileRosterItems, rosterRequestBody, savedMarkFor, settleWithLimit,
} from '@/features/Attendance/config/rosterSave';

const day = '2026-11-04';
const item = (studentId: string, status: string, extra: Record<string, unknown> = {}) =>
  ({ type: 'student', studentId, sectionId: 'S1', date: day, status, ...extra });

describe('a register save over marks it did not know about', () => {
  // The register loaded before A was saved (a part-failed save, another tab,
  // a colleague): it offers A as new again alongside the B it was asked for.
  const held = [{ id: 'mark-a', studentId: 'A', sectionId: 'S1', date: day, status: 'absent' }];

  it('updates the held mark instead of re-creating it', () => {
    expect(reconcileRosterItems([item('A', 'late'), item('B', 'absent')], held)).toEqual([
      { ...item('A', 'late'), id: 'mark-a' },
      item('B', 'absent'),
    ]);
  });

  it('drops a create the held mark already matches', () => {
    expect(reconcileRosterItems([item('A', 'absent')], held)).toEqual([]);
  });

  it('keeps updates the register already knew about', () => {
    expect(reconcileRosterItems([item('A', 'present', { id: 'mark-a' })], held))
      .toEqual([item('A', 'present', { id: 'mark-a' })]);
  });
});

describe('which held mark a daily item duplicates', () => {
  it('is the same student, section and day', () => {
    const marks = [
      { id: 'other-day', studentId: 'A', sectionId: 'S1', date: '2026-11-03', status: 'absent' },
      { id: 'other-section', studentId: 'A', sectionId: 'S2', date: day, status: 'absent' },
    ];
    expect(savedMarkFor(item('A', 'absent'), marks)).toBeUndefined();
  });

  it('finds an older mark through the section of its lesson', () => {
    const legacy = { id: 'legacy', studentId: 'A', sectionId: null, section: { id: 'S1' }, date: day, status: 'late' };
    expect(savedMarkFor(item('A', 'absent'), [legacy])?.id).toBe('legacy');
  });
});

describe('which held mark a per-class item duplicates', () => {
  it('is the same student, lesson and day, never another lesson in the section', () => {
    const marks = [{ id: 'math', studentId: 'A', sectionId: 'S1', teacherAssignmentId: 'math', date: day, status: 'absent' }];
    expect(savedMarkFor(item('A', 'absent', { teacherAssignmentId: 'french' }), marks)).toBeUndefined();
    expect(savedMarkFor(item('A', 'absent', { teacherAssignmentId: 'math' }), marks)?.id).toBe('math');
  });

  it('does not send the lesson to the API', () => {
    expect(rosterRequestBody(item('A', 'absent', { id: 'x', teacherAssignmentId: 'math' }))).toEqual({
      id: 'x', body: { type: 'student', studentId: 'A', sectionId: 'S1', date: day, status: 'absent' },
    });
  });
});

describe('sending a register', () => {
  it('sends every item when one fails, never more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const results = await settleWithLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
      if (n === 2) throw new Error('refused');
      return n;
    });
    expect(peak).toBe(3);
    expect(results.map((result) => result.status)).toEqual(
      ['fulfilled', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled', 'fulfilled', 'fulfilled'],
    );
  });
});
