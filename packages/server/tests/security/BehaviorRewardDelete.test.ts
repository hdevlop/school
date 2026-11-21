import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { BehaviorRewardValidator } from '../../src/modules/behaviorRewards/BehaviorRewardValidator';
import rolePermissions from '../../src/modules/seed-data/admin/rolePermissions.json';
import { withEnglishMessages } from '../support/englishMessages';

const validator = withEnglishMessages(new BehaviorRewardValidator({} as any, {} as any, {} as any));
const teacher = { id: 'teacher', role: 'teacher' };
const given = { awardedBy: 'teacher' };

describe('deleting a reward', () => {
  it('lets a teacher remove the rewards they gave, and only those', () => {
    expect(() => validator.ensureCanDelete(given, teacher)).not.toThrow();
    expect(() => validator.ensureCanDelete({ awardedBy: 'colleague' }, teacher)).toThrow();
  });

  it('lets school-wide roles remove any reward', () => {
    expect(() => validator.ensureCanDelete(given, { id: 'admin', role: 'admin' })).not.toThrow();
    expect(() => validator.ensureCanDelete(given, { id: 'principal', role: 'principal' })).not.toThrow();
  });

  it('leaves monitors and supervisors none, even their own', () => {
    for (const role of ['monitor', 'supervisor']) {
      expect(() => validator.ensureCanDelete({ awardedBy: role }, { id: role, role })).toThrow();
    }
  });

  it('grants a new database teacher the permission', () => {
    const grants = rolePermissions.find((entry) => entry.roleName === 'teacher')?.permissions ?? [];
    expect(grants).toContain('delete:behavior-rewards');
  });
});
