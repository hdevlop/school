import { env } from '../env';

const DEFAULT_USER_PASSWORD = 'ChangeMe123';

/**
 * True while a seed script is running (set in the seed runner). Seeding sets an
 * explicit password so accounts are created without sending an invite email,
 * keeping demo users log-in-able and avoiding an invite blast.
 */
export const isSeeding = () => env.seed.running;

export function resolveUserPassword(password?: string | null) {
  if (typeof password === 'string') {
    const trimmedPassword = password.trim();
    if (trimmedPassword.length > 0) {
      return trimmedPassword;
    }
  }

  const configuredPassword = env.seed.defaultUserPassword;
  if (configuredPassword) {
    return configuredPassword;
  }

  return DEFAULT_USER_PASSWORD;
}
