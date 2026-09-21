import { defineNajmApp } from 'najm-next/app';

export const SCHOOL_DEFAULT_CURRENCY = 'MAD' as const;

export const schoolApp = defineNajmApp({
  id: 'school',
  appName: 'MyScolAI',
  auth: {
    apiBaseURL: '/api',
    authPrefix: '/auth',
    publicRoutes: [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/change-password',
      '/manifest.webmanifest',
    ],
    protectedRoutes: ['/', '/:path*'],
    loginRoute: '/login',
    forbiddenRoute: '/',
    proxySessionMode: 'authoritative',
    rememberCookieName: 'sms.remember',
    refreshThreshold: 0.8,
    tabSync: true,
  },
  preferences: {
    cookieNames: {
      language: 'school-ui-language',
      theme: 'school-ui-theme',
      timeZone: 'school-ui-timezone',
    },
    defaultTimeZone: 'Africa/Casablanca',
  },
  csp: {
    reportPath: '/api/csp-report',
    extraConnectSrc: ['https://*.google.com'],
    frameSrc: ["'self'", 'https://www.google.com'],
  },
  theme: true,
  branding: true,
  location: {
    environmentPrefix: 'SCHOOL_LOCATION',
    allowedProviders: ['google'],
    defaults: {
      provider: 'google',
      center: { latitude: 33.5731, longitude: -7.5898 },
      zoom: 12,
      google: {
        apiKeyEnvironmentFallbacks: ['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'],
        region: 'MA',
      },
    },
  },
});
