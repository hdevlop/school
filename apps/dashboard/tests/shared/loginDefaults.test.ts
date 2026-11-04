import { describe, expect, test } from 'bun:test';
import { LOGIN_DEFAULT_VALUES } from '@/app/(auth)/login/loginDefaults';

describe('login form defaults', () => {
  // Unchecked, the sign-in cookies end with the browser, and a phone closes a
  // backgrounded browser by itself: the next launch shows the login page again.
  test('"Keep me logged in" starts checked', () => {
    expect(LOGIN_DEFAULT_VALUES.rememberMe).toBe(true);
  });

  test('the credentials start empty', () => {
    expect(LOGIN_DEFAULT_VALUES.identifier).toBe('');
    expect(LOGIN_DEFAULT_VALUES.password).toBe('');
  });
});
