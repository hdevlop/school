import { describe, expect, it } from 'bun:test';
import { TeacherValidator } from '../../src/modules/teachers/TeacherValidator';

const validator = new TeacherValidator(undefined as any, undefined as any, undefined as any, undefined as any, undefined as any);
(validator as any).tt = (key: string) => key;

describe('new teacher account activation', () => {
  it.each(['', '   ', undefined])('refuses a mailbox-less invitation (%j)', email => {
    expect(() => validator.ensureInvitationEmail(email)).toThrow('invitationEmailRequired');
  });

  it('accepts invitations with a mailbox', () => {
    expect(() => validator.ensureInvitationEmail('teacher@example.com')).not.toThrow();
  });

  it('preserves explicit phone-only provisioning with a password', () => {
    expect(() => validator.ensureInvitationEmail('', 'A-provisioned-password')).not.toThrow();
    expect(() => validator.ensureInvitationEmail('', '  ')).toThrow('invitationEmailRequired');
  });
});
