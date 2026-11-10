import { describe, expect, it } from 'bun:test';
import { defaultCredentialSetupPasswordSchema } from 'najm-auth';
import { newPasswordSchema } from '@/app/(auth)/authMessages';

const t = (key: string) => key;
const form = newPasswordSchema(t);
const submit = (password: string) => form.safeParse({ newPassword: password, confirmPassword: password });
const firstError = (password: string) => {
  const result = submit(password);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('newPasswordSchema (invitation, reset and first-login links)', () => {
  it('refuses on the page what the server would refuse, with the reason', () => {
    expect(firstError('abcdefgh')).toBe('auth.validation.passwordNumber');
    expect(firstError('12345678')).toBe('auth.validation.passwordLetter');
    expect(firstError('abc123')).toBe('auth.validation.passwordMinLength');
  });

  it('accepts a password of 8 characters with a letter and a number, in any case', () => {
    expect(submit('motdepasse1').success).toBe(true);
    expect(submit('MOTDEPASSE1').success).toBe(true);
  });

  // A password the page accepts but the server refuses comes back as a 400,
  // which the page shows as a dead link.
  it('agrees with the server rule School configures', () => {
    for (const password of ['abcdefgh', '12345678', 'abc123', 'motdepasse1', 'MOTDEPASSE1', 'Pass word 9']) {
      expect(submit(password).success).toBe(defaultCredentialSetupPasswordSchema.safeParse(password).success);
    }
  });

  it('still asks for the same password twice', () => {
    expect(form.safeParse({ newPassword: 'motdepasse1', confirmPassword: 'motdepasse2' }).success).toBe(false);
  });
});
