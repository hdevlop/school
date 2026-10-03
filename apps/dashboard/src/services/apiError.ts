/**
 * The HTTP status of a failed API call. najm-auth bundles each entry point
 * separately, so School's `auth.api` (from `najm-auth/client/server`) throws a
 * different `AuthError` class than `najm-auth/client` exports, and
 * `instanceof` never matches; the error's name and status survive bundling.
 */
function httpStatusOf(error: unknown): number | undefined {
  if (!(error instanceof Error) || error.name !== 'AuthError') return undefined;
  const { status } = error as Error & { status?: unknown };
  return typeof status === 'number' ? status : undefined;
}

/** Keep stale rows after a transient failure; an auth refusal hides them. */
export function hasFailedToLoad(error: unknown, rows?: readonly unknown[] | null) {
  return Boolean(error) && (isAuthorizationError(error) || !(Array.isArray(rows) && rows.length > 0));
}

/**
 * A list header has no count to show while its first load is pending (a new
 * page, or another school year) or after it failed: a `0` then reads as a
 * real, empty result. `isLoading` is the query's first-load flag, so a
 * background refetch keeps the count on screen.
 */
export function isCountUnknown(error: unknown, rows: readonly unknown[] | null | undefined, isLoading: boolean) {
  return isLoading || hasFailedToLoad(error, rows);
}

/** Authentication failures use Najm's dedicated forbidden state. */
export function isAuthorizationError(error: unknown) {
  const status = httpStatusOf(error);
  return status === 401 || status === 403;
}

/**
 * The record does not exist for this reader: deleted, outside the viewed
 * school year, or not theirs (owned reads answer 404, not 403).
 */
export function isNotFoundError(error: unknown) {
  return httpStatusOf(error) === 404;
}

/** The server refused because the state changed first, e.g. a second install. */
export function isConflictError(error: unknown) {
  return httpStatusOf(error) === 409;
}
