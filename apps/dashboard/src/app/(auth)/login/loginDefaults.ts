/**
 * "Keep me logged in" starts checked. Without it the sign-in cookies last only
 * until the browser closes, and phones close a backgrounded browser on their
 * own, so the next launch would land on the login page again. Someone on a
 * shared computer can still uncheck it.
 */
export const LOGIN_DEFAULT_VALUES = {
  identifier: '',
  password: '',
  rememberMe: true,
};
