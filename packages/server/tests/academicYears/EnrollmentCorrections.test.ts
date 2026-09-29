import { describe, expect, it } from 'bun:test';
import { StudentEnrollmentValidator } from '../../src/modules/studentEnrollments/StudentEnrollmentValidator';
import { correctEnrollmentDto, type CorrectEnrollmentDto } from '../../src/modules/studentEnrollments/StudentEnrollmentDto';

const validator = new StudentEnrollmentValidator();
const year = { id: 'old', status: 'closed', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };
const enrollment = { enrolledOn: '2025-09-01', leftOn: null, status: 'active' };
const placements = [
  { id: 'a', classId: 'old-class', sectionId: 'a', validFrom: '2025-09-01', validTo: '2026-01-15' },
  { id: 'b', classId: 'old-class', sectionId: 'b', validFrom: '2026-01-15', validTo: null },
];
const correction = (): CorrectEnrollmentDto => ({ ...enrollment, status: 'active',
  placement: { ...placements[0], sectionId: 'corrected' },
  expected: { ...enrollment, status: 'active', placements }, reason: 'Original register correction' });
const check = (data: CorrectEnrollmentDto) => validator.ensureCorrection(enrollment, placements, data, year, '2024-09-01');

describe('historical enrollment corrections', () => {
  it('corrects the identified placement in a closed year without requiring a transfer or reopening', () => {
    expect(() => check(correction())).not.toThrow();
    expect(() => validator.ensureCorrectionAllowed('principal')).not.toThrow();
  });
  it.each(['teacher', 'parent', 'student', 'accounting', 'custom'])('refuses correction by %s', (role) => {
    expect(() => validator.ensureCorrectionAllowed(role)).toThrow();
  });
  it('requires the full state read when the form opened, including every placement', () => {
    const data = correction(); data.expected.placements = [placements[0]];
    expect(() => check(data)).toThrow('Enrollment changed');
    data.expected.placements = placements; data.expected.status = 'withdrawn';
    expect(() => check(data)).toThrow('Enrollment changed');
  });
  it('rejects another enrollment placement and overlapping or out-of-year dates', () => {
    for (const change of [{ id: 'other' }, { validTo: '2026-01-16' }, { validFrom: '2024-09-01' }]) {
      const data = correction(); Object.assign(data.placement, change);
      expect(() => check(data)).toThrow();
    }
  });
  it('keeps enrollment status, exit date and all placement intervals consistent', () => {
    const data = correction(); data.status = 'withdrawn';
    expect(() => check(data)).toThrow();
    data.leftOn = '2026-02-01';
    expect(() => check(data)).toThrow('Placement intervals');
  });
  it('refuses draft placement, missing reason, impossible dates, and dated-record conflicts', () => {
    expect(() => validator.ensurePlacementYear('draft')).toThrow();
    expect(correctEnrollmentDto.safeParse({ ...correction(), reason: ' ' }).success).toBe(false);
    expect(correctEnrollmentDto.safeParse({ ...correction(), enrolledOn: '2025-02-30' }).success).toBe(false);
    expect(() => validator.ensureDatedRecordsRemainValid(true)).toThrow();
    expect(() => validator.ensureSelectedYear('other', 'selected')).toThrow();
  });
});
