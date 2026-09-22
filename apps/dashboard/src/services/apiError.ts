import { AuthError } from 'najm-auth/client';

/** Keep usable stale rows visible when a background list refetch fails. */
export function hasFailedToLoad(error: unknown, rows?: readonly unknown[] | null) {
  return Boolean(error) && !(Array.isArray(rows) && rows.length > 0);
}

/** Authentication failures use Najm's dedicated forbidden state. */
export function isAuthorizationError(error: unknown) {
  return error instanceof AuthError && (error.status === 401 || error.status === 403);
}
