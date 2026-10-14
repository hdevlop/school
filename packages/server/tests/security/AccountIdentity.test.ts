import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { StudentValidator } from '../../src/modules/students/StudentValidator';
import { StudentService } from '../../src/modules/students/StudentService';
import { withEnglishMessages } from '../support/englishMessages';
import { loginIdentity, loginIdentityUpdate } from '../../src/shared/loginIdentity';

// najm-auth 6.4.0 reaches an account by its email, its phone, or both, and
// refuses one with neither. School used to hand it the email alone, so every
// account created without an email was stored as "" and the second such
// account failed with "User identity already exists".
const input = {
  name: 'Yassine El Amrani', studentCode: 'S-0042', email: '',
  classId: 'class', sectionId: 'section', gender: 'M' as const,
  enrollmentDate: '2026-09-01', yearEnrolledOn: '2026-09-01',
};
const validator = withEnglishMessages(new StudentValidator({} as never, {} as never, {} as never, {} as never, {} as never));

function studentHarness() {
  const accounts: Array<Record<string, unknown>> = [];
  const checks = Object.assign(Object.create(validator), Object.fromEntries([
    'ensureCodeUnique', 'ensureEmailUnique', 'ensurePhoneUnique', 'ensureClassAndSectionValid',
  ].map((name) => [name, async () => {}])));
  const service = new StudentService(
    { create: async (data: object) => ({ id: 'student', ...data }) } as never,
    checks, {} as never,
    {
      inviteUser: async (body: Record<string, unknown>) => {
        accounts.push(body);
        return { id: 'student-user', emailSent: false };
      },
    } as never,
    { processParents: async () => {} } as never,
    { processFees: async () => {} } as never,
    { assign: async () => {} } as never,
    { resolveNewStudentPlacement: async () => ({ id: 'year', label: '2026-2027' }), create: async () => {} } as never,
    { processFile: async () => null } as never,
  );
  return { service, accounts };
}

describe('a student login is reached by its email, or by its phone without one', () => {
  it('creates the account with the phone when there is no email', async () => {
    const { service, accounts } = studentHarness();
    await service.create({ ...input, phone: '+212612345678' }, { id: 'admin', role: 'admin' });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ email: null, phone: '+212612345678', role: 'student' });
  });

  // users.phone is unique across every account and families share numbers:
  // a student given a parent's phone must not be refused when it has an email.
  it('keeps the phone off an account that has an email', async () => {
    const { service, accounts } = studentHarness();
    await service.create({ ...input, email: 'yassine@example.ma', phone: '+212612345678' }, { id: 'admin', role: 'admin' });
    expect(accounts[0]).toMatchObject({ email: 'yassine@example.ma', phone: null });
  });
});

describe('loginIdentity', () => {
  it('treats a blank email as none', () => {
    expect(loginIdentity({ email: '  ', phone: '+212612345678' })).toEqual({ email: null, phone: '+212612345678' });
    expect(loginIdentity({ email: '', phone: '' })).toEqual({ email: null, phone: null });
  });

  it('leaves the login alone when an edit names neither', () => {
    expect(loginIdentityUpdate({}, { email: 'a@example.ma', phone: '+212612345678' })).toEqual({});
  });

  it('moves the login to the stored phone when an edit removes the email', () => {
    expect(loginIdentityUpdate({ email: '' }, { email: 'a@example.ma', phone: '+212612345678' }))
      .toEqual({ email: null, phone: '+212612345678' });
  });

  it('takes the phone off the login when an edit adds an email', () => {
    expect(loginIdentityUpdate({ email: 'a@example.ma' }, { email: null, phone: '+212612345678' }))
      .toEqual({ email: 'a@example.ma', phone: null });
  });
});
