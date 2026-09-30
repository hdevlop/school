import { describe, expect, it } from 'bun:test';
import { AuthError } from 'najm-auth/client';
import { isAuthorizationError, isNotFoundError } from './apiError';

// najm-auth builds each entry point without code splitting, so the client
// behind `najm-auth/client/server` (School's `auth.api`) throws its own copy
// of this class, which `instanceof` against `najm-auth/client` never matches.
class BundledAuthError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'AuthError';
  }
}

describe('API error helpers', () => {
  it('recognize an error from either copy of najm-auth\'s client', () => {
    for (const make of [
      (status: number) => new AuthError(status, 'x'),
      (status: number) => new BundledAuthError(status, 'x'),
    ]) {
      expect(isAuthorizationError(make(401))).toBe(true);
      expect(isAuthorizationError(make(403))).toBe(true);
      expect(isAuthorizationError(make(404))).toBe(false);
      expect(isNotFoundError(make(404))).toBe(true);
      expect(isNotFoundError(make(500))).toBe(false);
    }
  });

  it('ignore other errors', () => {
    for (const error of [new Error('Session expired'), null, undefined, { status: 404 }]) {
      expect(isAuthorizationError(error)).toBe(false);
      expect(isNotFoundError(error)).toBe(false);
    }
  });
});
