const SLOW_READ_MS = 500;

/**
 * Runs a read that holds up the first page render and logs it when it is slow.
 * Server components cannot add response headers once rendering has started, so
 * the log is what separates a slow database from a busy server on a slow page.
 */
export async function timedRead<T>(label: string, read: () => Promise<T>, log: (message: string) => void = console.warn): Promise<T> {
  const started = performance.now();
  try {
    return await read();
  } finally {
    const elapsed = Math.round(performance.now() - started);
    if (elapsed >= SLOW_READ_MS) log(`[school] slow first-render read: ${label} took ${elapsed} ms`);
  }
}
