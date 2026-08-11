import { defineAuth } from 'najm-auth/client/server';

export const auth = defineAuth({
  apiBaseURL: '/api',
  authPrefix: '/auth',
  refreshThreshold: 0.8,
  tabSync: true,
  loginRoute: '/login',
  // `/change-password` is public because a credential-setup user has no session
  // yet — they hold only Najm's one-time setup cookie.
  publicRoutes: ['/login', '/register', '/forgot-password', '/reset-password', '/change-password', '/manifest.webmanifest'],
  protectedRoutes: ['/', '/:path*'],
  verifyAlways: true,
});
