type SeedEnvironment = Record<string, string | undefined>;

const LOCAL_ADMIN_EMAIL = 'admin@admin.com';
const LOCAL_ADMIN_PASSWORD = 'ChangeMe123456';
const TEMPLATE_ADMIN_PASSWORD = 'replace-before-any-shared-environment';

export function resolveAdminSeedCredentials(env: SeedEnvironment = process.env) {
  const production = env.NODE_ENV === 'production';
  const email = (env.ADMIN_EMAIL?.trim() || (production ? '' : LOCAL_ADMIN_EMAIL)).toLowerCase();
  const password = env.ADMIN_PASSWORD || (production ? '' : LOCAL_ADMIN_PASSWORD);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be set to a valid email address before seeding an admin.');
  }
  if (!password) {
    throw new Error('ADMIN_PASSWORD must be set before seeding an admin.');
  }
  if (production) {
    if (password === LOCAL_ADMIN_PASSWORD || password === TEMPLATE_ADMIN_PASSWORD) {
      throw new Error('ADMIN_PASSWORD must not use a local or template password in production.');
    }
    if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) || !/\d/.test(password)) {
      throw new Error('ADMIN_PASSWORD must be 8–72 characters and contain upper- and lowercase letters and a number.');
    }
  }

  return { email, password };
}
