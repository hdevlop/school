import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { AlertValidator } from '../../src/modules/alerts/AlertValidator';
import { AttendanceValidator } from '../../src/modules/attendance/AttendanceValidator';
import { BehaviorRewardValidator } from '../../src/modules/behaviorRewards/BehaviorRewardValidator';
import { DisciplineValidator } from '../../src/modules/discipline/DisciplineValidator';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';
import { withEnglishMessages } from '../support/englishMessages';

// One monitor runs class `managed-class`, whose section is `managed`.
const monitors = {
  managesSection: async (userId: string, sectionId: string) => userId === 'manager' && sectionId === 'managed',
  managesClass: async (userId: string, classId: string) => userId === 'manager' && classId === 'managed-class',
} as any;
const manager = { id: 'manager', role: 'monitor' };
const forbidden = { status: 403 };

describe('a monitor marks attendance', () => {
  const validator = withEnglishMessages(new AttendanceValidator(
    { isTeacherInSection: async () => false } as any,
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    monitors,
    {} as any,
  ));

  it('in the sections of their classes only', async () => {
    await expect(validator.ensureAssignedSection(manager, 'managed')).resolves.toBeUndefined();
    await expect(validator.ensureAssignedSection(manager, 'elsewhere')).rejects.toMatchObject(forbidden);
    await expect(validator.ensureAssignedSection(manager, null)).rejects.toMatchObject(forbidden);
  });

  it('leaves other roles to their own checks', async () => {
    await expect(validator.ensureAssignedSection({ id: 'teacher', role: 'teacher' }, 'elsewhere')).resolves.toBeUndefined();
  });

  it('corrects any transition in their sections, and nothing elsewhere', async () => {
    await expect(validator.validateStatusCorrection('managed', 'present', 'absent', manager)).resolves.toBeUndefined();
    await expect(validator.validateStatusCorrection('elsewhere', 'absent', 'present', manager)).rejects.toMatchObject(forbidden);
  });
});

describe('a monitor reports discipline', () => {
  const validator = withEnglishMessages(new DisciplineValidator(
    { isTeacherAssignedToSection: async () => false } as any,
    monitors,
    {} as any,
  ));

  it('for students of their classes only', async () => {
    await expect(validator.ensureTeacherMayReport(manager, 'managed')).resolves.toBeUndefined();
    await expect(validator.ensureTeacherMayReport(manager, 'elsewhere')).rejects.toMatchObject(forbidden);
  });

  it('never reopens or deletes, like a teacher', () => {
    expect(() => validator.ensureAdministrator(manager)).toThrow();
    expect(() => validator.ensureAdministrator({ id: 'supervisor', role: 'supervisor' })).not.toThrow();
  });
});

describe('a monitor recognizes behavior', () => {
  const placedIn = (classId: string) => withEnglishMessages(new BehaviorRewardValidator(
    { getStudentPlacementOn: async () => ({ inSelectedYear: true, classId, sectionId: 'section' }) } as any,
    monitors,
    {} as any,
  ));

  it('of students placed in their classes on the day', async () => {
    await expect(placedIn('managed-class').ensureStudentEligible('student', '2026-03-15T09:00:00Z', manager))
      .resolves.toEqual({ classId: 'managed-class', sectionId: 'section' });
    await expect(placedIn('elsewhere').ensureStudentEligible('student', '2026-03-15T09:00:00Z', manager))
      .rejects.toMatchObject(forbidden);
  });

  it('but deletes none', () => {
    expect(() => placedIn('managed-class').ensureSchoolWide(manager)).toThrow();
  });
});

describe('a monitor handles alerts', () => {
  const validator = withEnglishMessages(new AlertValidator(...(Array(6).fill({}) as [any, any, any, any, any, any])));

  it('about their students, as a teacher does, and leaves shared notices to staff', () => {
    expect(() => validator.ensureCanHandle({ studentId: 'student' }, 'resolved', manager)).not.toThrow();
    expect(() => validator.ensureCanHandle({}, 'resolved', manager)).toThrow();
    expect(() => validator.ensureCanEdit(manager)).toThrow();
  });
});

describe('a monitor staff record', () => {
  const validator = withEnglishMessages(new StaffValidator({} as any, {} as any, {} as any));

  it('names a grade in each assignment', () => {
    expect(() => validator.ensureAssignments('monitor', [{ className: 'CP' }])).not.toThrow();
    expect(() => validator.ensureAssignments('monitor', [{ notes: 'second floor' }])).toThrow('Monitor assignment requires a grade');
  });
});
