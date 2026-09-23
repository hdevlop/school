import { cancel, intro, isCancel, password, text } from '@clack/prompts';
import { resolveAdminSeedCredentials } from './adminSeedConfig';

export async function readAdminSeedCredentials() {
  if (process.env.NODE_ENV !== 'production' || !process.stdin.isTTY || !process.stdout.isTTY) {
    return resolveAdminSeedCredentials();
  }

  intro('School administrator seed');
  const email = await text({
    message: 'Administrator email',
    initialValue: process.env.ADMIN_EMAIL?.trim() || undefined,
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.trim() ?? '')
      ? undefined
      : 'Enter a valid administrator email.',
  });
  if (isCancel(email)) {
    cancel('Admin seed cancelled; no data was changed.');
    return undefined;
  }

  const enteredPassword = await password({
    message: 'New administrator password (at least 8 characters)',
    clearOnError: true,
    validate: (value) => {
      try {
        resolveAdminSeedCredentials({
          ...process.env,
          ADMIN_EMAIL: email,
          ADMIN_PASSWORD: value,
        });
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    },
  });
  if (isCancel(enteredPassword)) {
    cancel('Admin seed cancelled; no data was changed.');
    return undefined;
  }

  const confirmation = await password({
    message: 'Confirm administrator password',
    clearOnError: true,
    validate: (value) => value === enteredPassword
      ? undefined
      : 'Administrator password confirmation must match exactly.',
  });
  if (isCancel(confirmation)) {
    cancel('Admin seed cancelled; no data was changed.');
    return undefined;
  }
  if (enteredPassword !== confirmation) {
    throw new Error('Administrator password confirmation must match exactly.');
  }

  return resolveAdminSeedCredentials({
    ...process.env,
    ADMIN_EMAIL: email,
    ADMIN_PASSWORD: enteredPassword,
  });
}
