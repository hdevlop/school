/**
 * What a failed request actually was.
 *
 * Two error shapes reach the query layer and they disagree about where the
 * status lives: `najm-auth`'s `AuthError` carries it as `error.status`, while
 * `fetchWithAuth` in `services/http.ts` — the path file uploads take — builds
 * an axios-shaped `error.response.status`. Reading only one of them is how a
 * refusal ends up looking like a generic failure.
 */
export function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  const status = candidate.status ?? candidate.response?.status;
  return typeof status === 'number' ? status : null;
}

/**
 * The server refused this request rather than failing to answer it.
 *
 * 401 counts: the HTTP client already retried once behind a token refresh, so
 * a 401 surfacing here is a request the session is genuinely not allowed to
 * make — not an expired access token.
 */
export function isPermissionDenied(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 401 || status === 403;
}
