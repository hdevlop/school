import { describe, expect, it } from 'bun:test';
import { updateUsersValidationSchema, usersValidationSchema } from '../../../../src/features/Users/config/usersValidateSchema';

const t = (key: string) => key;
const identity = { name: 'Salma El Amrani', email: 'salma@example.test', roleId: 'teacher-role' };

describe('user edit security fields', () => {
  it('preserves the selected account status and refuses unsupported statuses', () => {
    const schema = updateUsersValidationSchema(t);
    for (const status of ['active', 'inactive', 'pending'] as const) {
      expect(schema.parse({ ...identity, status }).status).toBe(status);
    }
    expect(schema.safeParse({ ...identity, status: 'suspended' }).success).toBe(false);
    expect(schema.safeParse(identity).success).toBe(false);
  });

  it('keeps password and verification changes out of the edit form payload', () => {
    const result = updateUsersValidationSchema(t).parse({
      ...identity, status: 'inactive', password: 'discard-me', emailVerified: true,
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('emailVerified');
  });

  it('does not add status or credentials to the invitation payload', () => {
    expect(usersValidationSchema(t).parse({ ...identity, status: 'active', password: 'discard-me' }))
      .toEqual(identity);
  });
});
