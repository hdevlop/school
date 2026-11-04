type WorkerContainer = Pick<ServiceWorkerContainer, 'getRegistration' | 'register'>;

/**
 * Registers the worker push notifications arrive through, for a signed-in user.
 * A signed-out device is not given one, but one it already has is still kept
 * current, so an older worker is replaced even before the next sign-in.
 *
 * `register` returns an existing registration without checking its script, and
 * WebKit can skip its own check on navigation, so this asks for the check.
 */
export async function keepPushWorkerCurrent(container: WorkerContainer, signedIn: boolean) {
  const registration = signedIn
    ? await container.register('/sw.js', { scope: '/', updateViaCache: 'none' })
    : await container.getRegistration('/');
  if (registration && !registration.installing && !registration.waiting) {
    await registration.update().catch(() => undefined);
  }
}
