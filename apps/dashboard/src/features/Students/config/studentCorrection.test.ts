import { describe, expect, it } from 'bun:test';
import type { StudentYearEnrollment } from '@/services/studentEnrollmentApi';
import { studentEnrollmentCorrection } from './studentCorrection';

const enrollment: StudentYearEnrollment = { id: 'old-enrollment', studentId: 's', status: 'active',
  enrolledOn: '2025-09-01', leftOn: null,
  academicYear: { id: 'old', label: '2025-2026', status: 'closed', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' },
  placements: [
    { id: 'second', classId: 'c', className: 'C', sectionId: 'b', sectionName: 'B', validFrom: '2026-01-15', validTo: null, reason: 'Transfer' },
    { id: 'first', classId: 'c', className: 'C', sectionId: 'a', sectionName: 'A', validFrom: '2025-09-01', validTo: '2026-01-15', reason: 'Admission' },
  ] };
const values = { correctionPlacementId: 'first', classId: 'c', sectionId: 'a',
  placementValidFrom: '2025-09-01', placementValidTo: '2026-01-15',
  yearEnrolledOn: '2025-09-01', yearLeftOn: '', yearStatus: 'active', correctionReason: 'Register correction' };

describe('Student Edit corrections', () => {
  it('keeps identity-only edits out of enrollment operations, including a year with no enrollment', () => {
    expect(studentEnrollmentCorrection(enrollment, values)).toBeUndefined();
    expect(studentEnrollmentCorrection(undefined, values)).toBeUndefined();
  });
  it('corrects the chosen earlier placement rather than transferring the latest placement', () => {
    const result = studentEnrollmentCorrection(enrollment, { ...values, sectionId: 'corrected' });
    expect(result?.placement.id).toBe('first');
    expect(result?.placement.validTo).toBe('2026-01-15');
    expect(result?.expected.placements).toHaveLength(2);
    expect(result?.expected.placements[0].sectionId).toBe('b');
    expect(enrollment.placements[1].sectionId).toBe('a');
  });
  it('retains exclusive exit dates, the original enrollment id and reason', () => {
    const result = studentEnrollmentCorrection(enrollment, { ...values, yearLeftOn: '2026-07-01', yearStatus: 'graduated' });
    expect(result?.leftOn).toBe('2026-07-01');
    expect(result?.enrollmentId).toBe('old-enrollment');
    expect(result?.reason).toBe(values.correctionReason);
    expect(() => studentEnrollmentCorrection(enrollment, { ...values, correctionPlacementId: 'foreign' })).toThrow();
  });
});
