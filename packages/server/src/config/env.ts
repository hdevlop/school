/**
 * Readers for School's environment variables.
 *
 * Call sites read `process.env.NAME` literally and pass the value in, with the
 * name for the error message. A reader never looks a name up itself, so every
 * variable the server uses stays a plain, greppable read the bundler can see.
 *
 * Unset and blank mean "use the default". A value that is set but malformed
 * stops startup with a message naming the variable, instead of reaching a
 * plugin as `NaN` or a silently ignored typo.
 */

export const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Next evaluates server modules while producing an image. That build phase is
 * not an application runtime and must not contact production services.
 */
export const isNextBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

/** The trimmed value, or `undefined` when unset or blank. */
export function envString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function requireEnv(name: string, value: string | undefined, reason: string): string {
  const resolved = envString(value);
  if (!resolved) throw new Error(`${name} is required ${reason}.`);
  return resolved;
}

/** `1` and `true` (any case) turn a flag on; anything else leaves it off. */
export function envFlag(value: string | undefined): boolean {
  const resolved = envString(value)?.toLowerCase();
  return resolved === '1' || resolved === 'true';
}

export function envInt(
  name: string,
  value: string | undefined,
  { fallback, min = 0, max = Number.MAX_SAFE_INTEGER }: { fallback: number; min?: number; max?: number },
): number {
  const resolved = envString(value);
  if (resolved === undefined) return fallback;

  const parsed = /^\d+$/.test(resolved) ? Number(resolved) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const range = max === Number.MAX_SAFE_INTEGER ? `${min} or more` : `from ${min} to ${max}`;
    throw new Error(`${name} must be an integer ${range}.`);
  }
  return parsed;
}

export function envChoice<const T extends string>(
  name: string,
  value: string | undefined,
  choices: readonly T[],
  fallback: T,
): T {
  const resolved = envString(value)?.toLowerCase();
  if (resolved === undefined) return fallback;
  if (!(choices as readonly string[]).includes(resolved)) {
    throw new Error(`${name} must be one of: ${choices.join(', ')}. Got '${resolved}'.`);
  }
  return resolved as T;
}
