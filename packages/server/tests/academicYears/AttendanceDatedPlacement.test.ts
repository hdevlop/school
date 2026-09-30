import { describe, expect, it } from 'bun:test';
import { AttendanceValidator } from '../../src/modules/attendance/AttendanceValidator';
import { withEnglishMessages } from '../support/englishMessages';

function validator(hasEnrollment: boolean, isPlaced: boolean, legacyCalls: string[]) {
  return withEnglishMessages(new AttendanceValidator(
    {} as any,
    { ensureInSection: async (studentId: string, sectionId: string) => {
      legacyCalls.push(`${studentId}:${sectionId}`);
    } } as any,
    {} as any, {} as any, {} as any, {} as any,
    {
      hasAnyForStudent: async () => hasEnrollment,
      isPlacedInSectionOnDate: async () => isPlaced,
    } as any,
  ));
}

describe('attendance event-time placement', () => {
  it('allows the legacy current-section rule only before a dated enrollment exists', async () => {
    const legacyCalls: string[] = [];
    await validator(false, false, legacyCalls).ensureStudentPlacedInSectionOnDate('student-1', 'section-1', '2025-09-03');
    expect(legacyCalls).toEqual(['student-1:section-1']);
  });

  it('requires a dated section placement once a student has enrollment history', async () => {
    const legacyCalls: string[] = [];
    await expect(validator(true, false, legacyCalls)
      .ensureStudentPlacedInSectionOnDate('student-1', 'section-1', '2025-09-03')).rejects.toThrow();
    await validator(true, true, legacyCalls)
      .ensureStudentPlacedInSectionOnDate('student-1', 'section-1', '2025-09-03');
    expect(legacyCalls).toEqual([]);
  });
});
