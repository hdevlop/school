import { defineAuth } from 'najm-auth/client/server';

export const auth = defineAuth({
  apiBaseURL: '/api',
  authPrefix: '/auth',
  refreshThreshold: 0.8,
  tabSync: true,
  loginRoute: '/login',
  publicRoutes: ['/login', '/register', '/forgot-password', '/reset-password', '/manifest.webmanifest'],
  protectedRoutes: ['/', '/:path*'],
  verifyAlways: true,
});
