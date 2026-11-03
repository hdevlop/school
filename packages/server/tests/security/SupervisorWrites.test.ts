import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { AttendanceValidator } from '../../src/modules/attendance/AttendanceValidator';
import { BehaviorRewardValidator } from '../../src/modules/behaviorRewards/BehaviorRewardValidator';
import { DisciplineValidator } from '../../src/modules/discipline/DisciplineValidator';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';
import { withEnglishMessages } from '../support/englishMessages';

const supervisor = { id: 'supervisor', role: 'supervisor' };
const assignments = {
  managesSection: async (_userId: string, sectionId: string) => sectionId === 'assigned-section',
  managesClass: async (_userId: string, classId: string) => classId === 'assigned-class',
} as any;

describe('supervisor writes', () => {
  it('requires a class for every assignment, while allowing an unassigned account', () => {
    const validator = withEnglishMessages(new StaffValidator({} as any, {} as any, {} as any));
    expect(() => validator.ensureAssignments('supervisor', [])).not.toThrow();
    expect(() => validator.ensureAssignments('supervisor', [{ classId: 'assigned-class' }])).not.toThrow();
    expect(() => validator.ensureAssignments('supervisor', [{ notes: 'missing class' }])).toThrow();
  });

  it('marks and corrects attendance only in assigned sections', async () => {
    const validator = withEnglishMessages(new AttendanceValidator(
      { isTeacherInSection: async () => false } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      assignments,
    ));
    await expect(validator.ensureAssignedSection(supervisor, 'assigned-section')).resolves.toBeUndefined();
    await expect(validator.ensureAssignedSection(supervisor, 'other-section')).rejects.toMatchObject({ status: 403 });
    await expect(validator.ensureAssignedSection(supervisor, null)).rejects.toMatchObject({ status: 403 });
    await expect(validator.validateStatusCorrection('assigned-section', 'present', 'absent', supervisor)).resolves.toBeUndefined();
    await expect(validator.validateStatusCorrection('other-section', 'absent', 'present', supervisor)).rejects.toMatchObject({ status: 403 });
  });

  it('reports incidents only in assigned sections', async () => {
    const validator = withEnglishMessages(new DisciplineValidator({} as any, {} as any, assignments));
    await expect(validator.ensureTeacherMayReport(supervisor, 'assigned-section')).resolves.toBeUndefined();
    await expect(validator.ensureTeacherMayReport(supervisor, 'other-section')).rejects.toMatchObject({ status: 403 });
  });

  it('recognizes behavior only in the class where the student sat on that day', async () => {
    const placedIn = (classId: string) => withEnglishMessages(new BehaviorRewardValidator(
      { getStudentPlacementOn: async () => ({ inSelectedYear: true, classId, sectionId: 'section' }) } as any,
      {} as any, assignments,
    ));
    await expect(placedIn('assigned-class').ensureStudentEligible('student', '2026-11-03T08:00:00Z', supervisor))
      .resolves.toEqual({ classId: 'assigned-class', sectionId: 'section' });
    await expect(placedIn('other-class').ensureStudentEligible('student', '2026-11-03T08:00:00Z', supervisor))
      .rejects.toMatchObject({ status: 403 });
  });
});
