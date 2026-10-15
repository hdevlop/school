import { SCHOOL_HOME_PATH } from '@/najm.config';

// Auth/setup, public landing and asset routes cannot be a post-login home.
const INVALID_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password', '/change-password', '/_next', '/api', '/images', '/storage'];
const INVALID_PATHS = new Set(['/', '/welcome', '/manifest.webmanifest', '/favicon.ico', '/sw.js']);
const ASSET_EXTENSION = /\.(?:webmanifest|ico|png|jpe?g|svg|webp|gif|css|js|map)$/i;

/** Preserve a protected deep link, otherwise enter the authenticated home. */
export function loginRedirectPath(from: string | null | undefined): string {
  // Backslashes and control characters can turn an apparent path into another
  // origin when the browser normalizes a navigation URL.
  if (!from?.startsWith('/') || from.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(from)) {
    return SCHOOL_HOME_PATH;
  }

  const target = new URL(from, 'https://school.invalid');
  const pathname = target.pathname.replace(/\/+$/, '') || '/';
  if (INVALID_PATHS.has(pathname)
    || INVALID_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    || ASSET_EXTENSION.test(pathname)) {
    return SCHOOL_HOME_PATH;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}
