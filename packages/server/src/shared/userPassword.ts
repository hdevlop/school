const DEFAULT_USER_PASSWORD = 'ChangeMe123';

/**
 * True while a seed script is running (set in the seed runner). Seeding sets an
 * explicit password so accounts are created without sending an invite email,
 * keeping demo users log-in-able and avoiding an invite blast.
 */
export const isSeeding = () => process.env.SEED_MODE === 'true';

export function resolveUserPassword(password?: string | null) {
  if (typeof password === 'string') {
    const trimmedPassword = password.trim();
    if (trimmedPassword.length > 0) {
      return trimmedPassword;
    }
  }

  const configuredPassword = process.env.DEFAULT_USER_PASSWORD?.trim();
  if (configuredPassword) {
    return configuredPassword;
  }

  return DEFAULT_USER_PASSWORD;
}
