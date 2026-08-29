import { describe, expect, it } from 'bun:test';
import { getErrorStatus, isPermissionDenied } from './queryError';

/**
 * Two clients, two error shapes. Reading only one of them was how a refused
 * request reached the tables as an ordinary failure — and before that, as an
 * empty list.
 */
describe('the status of a failed request', () => {
  it('reads najm-auth AuthError', () => {
    // What `auth.api.get` throws, and so what every list query sees.
    const authError = Object.assign(new Error('Forbidden'), { status: 403, body: {} });
    expect(getErrorStatus(authError)).toBe(403);
  });

  it('reads the axios-shaped error from the upload path', () => {
    // `fetchWithAuth` in services/http.ts builds this one.
    const httpError = Object.assign(new Error('Unauthorized'), {
      response: { status: 401, data: { message: 'Unauthorized' } },
    });
    expect(getErrorStatus(httpError)).toBe(401);
  });

  it('prefers the direct status when both are present', () => {
    const both = { status: 403, response: { status: 500 } };
    expect(getErrorStatus(both)).toBe(403);
  });

  it.each([null, undefined, 'a string', 42, {}, { status: 'nope' }, { response: {} }])(
    'has no status to report for %p',
    (value) => {
      expect(getErrorStatus(value)).toBeNull();
    },
  );
});

describe('a refusal is told apart from a failure', () => {
  it.each([401, 403])('%p is a refusal', (status) => {
    expect(isPermissionDenied({ status })).toBe(true);
    expect(isPermissionDenied({ response: { status } })).toBe(true);
  });

  it.each([400, 404, 409, 422, 500, 502, 503])('%p is not', (status) => {
    expect(isPermissionDenied({ status })).toBe(false);
  });

  it('treats an error with no status as a failure, not a refusal', () => {
    // A network error or a thrown TypeError has no status. Calling that
    // "access denied" would blame the user for the server being unreachable.
    expect(isPermissionDenied(new Error('Failed to fetch'))).toBe(false);
    expect(isPermissionDenied(null)).toBe(false);
  });
});
