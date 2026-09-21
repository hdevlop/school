import { describe, expect, it } from 'bun:test';

import { AccessResetValidator } from '@server/modules/accessReset/AccessResetValidator';

/**
 * The eligibility matrix, exercised against a fake repository.
 *
 * These prove the *decision*: which account classes are supported, which are
 * refused, and that nothing a caller sends can steer it. They do not prove
 * atomicity or session revocation — those need a real PostgreSQL run, which is
 * a separate test.
 */

type Rows = {
  account?: any;
  parent?: any;
  student?: any;
  staff?: any;
  teacher?: any;
};

const validatorWith = (rows: Rows) => {
  const repository = {
    getAccount: async () => rows.account ?? null,
    getParentByUserId: async () => rows.parent ?? null,
    getStudentByUserId: async () => rows.student ?? null,
    getStaffByUserId: async () => rows.staff ?? null,
    getTeacherByStaffId: async () => rows.teacher ?? null,
    recordAudit: async () => undefined,
  };
  const validator = new AccessResetValidator(repository as any);
  // `@I18n` is injected by the framework; under a plain constructor the key
  // itself is the clearest assertion target.
  (validator as any).at = (key: string) => key;
  return validator;
};

const ACTOR = { id: 'actor-1', role: 'admin' };

const account = (over: Record<string, unknown> = {}) => ({
  id: 'user-1',
  name: 'Target',
  email: 'target@example.com',
  status: 'active',
  roleId: 'role-1',
  roleName: 'parent',
  ...over,
});

const expectRefusal = async (validator: AccessResetValidator, key: string) => {
  let thrown: any;
  try {
    await validator.resolveTarget('user-1', ACTOR);
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeDefined();
  expect(String(thrown?.message ?? thrown)).toContain(key);
};

describe('AccessResetValidator — supported account classes', () => {
  it('sends an active parent with a valid CIN down the credential path', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'parent', status: 'active' }),
      parent: { id: 'p1', cin: 'bb46123' },
    });
    const resolved = await validator.resolveTarget('user-1', ACTOR);
    expect(resolved.mode).toBe('parent_credential_setup');
    // Najm's canonical form for the `ma-cin` kind is lower case, which is what
    // gets hashed and what a login is compared against.
    expect(resolved.temporaryCredential).toBe('bb46123');
  });

  it('converges on one canonical CIN however it was stored', async () => {
    const forms = ['BB46123', 'bb46123', ' Bb46123 '];
    for (const cin of forms) {
      const validator = validatorWith({
        account: account({ roleName: 'parent', status: 'active' }),
        parent: { id: 'p1', cin },
      });
      const resolved = await validator.resolveTarget('user-1', ACTOR);
      expect(resolved.temporaryCredential).toBe('bb46123');
    }
  });

  it('resends the invitation for a pending parent rather than using the CIN', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'parent', status: 'pending' }),
      parent: { id: 'p1', cin: 'BB46123' },
    });
    const resolved = await validator.resolveTarget('user-1', ACTOR);
    expect(resolved.mode).toBe('invitation_resent');
    expect(resolved.temporaryCredential).toBeUndefined();
  });

  it('mails an active student', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'student', status: 'active' }),
      student: { id: 's1', status: 'active' },
    });
    expect((await validator.resolveTarget('user-1', ACTOR)).mode).toBe('reset_email_sent');
  });

  it('resends the invitation for a pending student', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'student', status: 'pending' }),
      student: { id: 's1', status: 'active' },
    });
    expect((await validator.resolveTarget('user-1', ACTOR)).mode).toBe('invitation_resent');
  });

  it('mails an active teacher whose staff chain resolves to the same account', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'teacher', status: 'active' }),
      staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'teacher', accessRoleId: 'role-1' },
      teacher: { id: 't1', staffId: 'st1' },
    });
    expect((await validator.resolveTarget('user-1', ACTOR)).mode).toBe('reset_email_sent');
  });

  it('mails login-enabled staff', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'secretary', status: 'active' }),
      staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'secretary', accessRoleId: 'role-1' },
    });
    expect((await validator.resolveTarget('user-1', ACTOR)).mode).toBe('reset_email_sent');
  });

  it('treats staff on leave as still holding a working login', async () => {
    const validator = validatorWith({
      account: account({ roleName: 'nurse', status: 'active' }),
      staff: { id: 'st1', userId: 'user-1', status: 'onLeave', role: 'nurse', accessRoleId: 'role-1' },
    });
    expect((await validator.resolveTarget('user-1', ACTOR)).mode).toBe('reset_email_sent');
  });
});

describe('AccessResetValidator — refusals', () => {
  it('refuses an unknown account', async () => {
    await expectRefusal(validatorWith({}), 'notFound');
  });

  it('refuses the actor resetting themselves', async () => {
    const validator = validatorWith({ account: account({ id: 'actor-1' }) });
    let thrown: any;
    try {
      await validator.resolveTarget('actor-1', ACTOR);
    } catch (error) {
      thrown = error;
    }
    expect(String(thrown?.message ?? thrown)).toContain('selfReset');
  });

  it('refuses an administrator target', async () => {
    await expectRefusal(validatorWith({ account: account({ roleName: 'admin' }) }), 'adminTarget');
  });

  it('refuses an account with no role', async () => {
    await expectRefusal(validatorWith({ account: account({ roleName: null }) }), 'unknownRole');
  });

  it('refuses a role outside the supported set', async () => {
    await expectRefusal(validatorWith({ account: account({ roleName: 'auditor' }) }), 'unknownRole');
  });

  it('refuses an inactive account rather than reactivating it', async () => {
    await expectRefusal(
      validatorWith({ account: account({ status: 'inactive' }), parent: { id: 'p1', cin: 'BB46123' } }),
      'inactiveAccount',
    );
  });

  it('refuses a profileless account: School cannot prove where it came from', async () => {
    await expectRefusal(validatorWith({ account: account({ roleName: 'parent' }) }), 'profileMissing');
  });

  it('refuses a profileless pending account too', async () => {
    await expectRefusal(
      validatorWith({ account: account({ roleName: 'student', status: 'pending' }) }),
      'profileMissing',
    );
  });

  it('refuses an active parent with no CIN instead of quietly mailing them', async () => {
    await expectRefusal(
      validatorWith({ account: account({ roleName: 'parent' }), parent: { id: 'p1', cin: null } }),
      'parentCinMissing',
    );
  });

  it('refuses an active parent whose CIN is not a CIN', async () => {
    await expectRefusal(
      validatorWith({ account: account({ roleName: 'parent' }), parent: { id: 'p1', cin: '???' } }),
      'parentCinInvalid',
    );
  });

  it('refuses a student whose enrolment is no longer current', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'student' }),
        student: { id: 's1', status: 'graduated' },
      }),
      'profileNotCurrent',
    );
  });

  it('refuses a teacher whose staff row carries no teacher record', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'teacher' }),
        staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'teacher', accessRoleId: 'role-1' },
        teacher: null,
      }),
      'teacherChainMismatch',
    );
  });

  it('refuses a staff row whose login belongs to another account', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'secretary' }),
        staff: { id: 'st1', userId: 'someone-else', status: 'active', role: 'secretary', accessRoleId: 'r' },
      }),
      'profileMismatch',
    );
  });

  it('refuses a staff role mapped to a different account role', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'secretary' }),
        staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'secretary', accessRoleId: 'other-role' },
      }),
      'profileMismatch',
    );
  });

  it('refuses a staff role code that differs from the account role', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'teacher' }),
        staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'secretary', accessRoleId: 'role-1' },
      }),
      'profileMismatch',
    );
  });

  it('refuses an HR row whose staff role grants no app access', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'secretary' }),
        staff: { id: 'st1', userId: 'user-1', status: 'active', role: 'secretary', accessRoleId: null },
      }),
      'staffNoLogin',
    );
  });

  it('refuses a terminated staff member', async () => {
    await expectRefusal(
      validatorWith({
        account: account({ roleName: 'secretary' }),
        staff: { id: 'st1', userId: 'user-1', status: 'terminated', role: 'secretary', accessRoleId: 'r' },
      }),
      'profileNotCurrent',
    );
  });
});

describe('AccessResetValidator — stale confirmation', () => {
  it('accepts a confirmation that still matches', () => {
    const validator = validatorWith({});
    expect(() => validator.ensureConfirmationFresh('reset_email_sent', 'reset_email_sent')).not.toThrow();
  });

  it('refuses a confirmation the server no longer agrees with', () => {
    const validator = validatorWith({});
    expect(() => validator.ensureConfirmationFresh('parent_credential_setup', 'invitation_resent')).toThrow(
      /staleConfirmation/,
    );
  });

  it('refuses a client claiming mail for an account the server resolved to CIN', () => {
    const validator = validatorWith({});
    expect(() => validator.ensureConfirmationFresh('reset_email_sent', 'parent_credential_setup')).toThrow(
      /staleConfirmation/,
    );
  });
});
