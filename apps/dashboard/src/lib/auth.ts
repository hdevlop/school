import { defineAuth } from 'najm-auth/client/server';

export const auth = defineAuth({
  apiBaseURL: '/api',
  authPrefix: '/auth',
  refreshThreshold: 0.8,
  tabSync: true,
  loginRoute: '/login',
  // Where `requireRole` sends someone who is signed in but holds the wrong
  // role. School has no dedicated forbidden page, and signing in again could
  // not change the answer, so the dashboard is the honest destination.
  forbiddenRoute: '/',
  // `/change-password` is public because a credential-setup user has no session
  // yet — they hold only Najm's one-time setup cookie.
  publicRoutes: ['/login', '/register', '/forgot-password', '/reset-password', '/change-password', '/manifest.webmanifest'],
  protectedRoutes: ['/', '/:path*'],
  proxySessionMode: 'authoritative',
});
