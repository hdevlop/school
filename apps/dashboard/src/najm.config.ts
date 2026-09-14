import { defineNajmApp } from 'najm-next/app';
import { defineNajmLocationRuntime } from 'najm-next/location/server';

export const schoolApp = defineNajmApp({
  id: 'school',
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
  location: { environmentPrefix: 'SCHOOL_LOCATION' },
});

export const schoolLocation = defineNajmLocationRuntime({
  environmentPrefix: schoolApp.location.environmentPrefix,
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
});
