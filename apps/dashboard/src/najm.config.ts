import { defineNajmApp } from 'najm-next/app';

export const SCHOOL_DEFAULT_CURRENCY = 'MAD' as const;
export const SCHOOL_HOME_PATH = '/home' as const;

export const schoolApp = defineNajmApp({
  id: 'school',
  appName: 'MyScolAI',
  auth: {
    apiBaseURL: '/api',
    authPrefix: '/auth',
    publicRoutes: [
      '/',
      '/welcome',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/change-password',
      // Google sign-in lands here to finish the session it opened.
      '/auth/oauth/callback',
      '/manifest.webmanifest',
    ],
    protectedRoutes: ['/:path*'],
    loginRoute: '/login',
    forbiddenRoute: SCHOOL_HOME_PATH,
    // A page request trusts the signed session snapshot until it expires (five
    // minutes), then the proxy checks the refresh session with the server
    // again. Checking on every request cost 0.2-0.7 s per page move on JHL.
    // A removed role or a deactivated account therefore still sees page frames
    // for up to five minutes; every API call is authorized on its own, so no
    // data is served. Agreed with the owner on 2026-11-05.
    proxySessionMode: 'optimistic',
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
    // react-international-phone (NajmKit PhoneInput) loads its flags from here.
    extraImgSrc: ['https://cdnjs.cloudflare.com'],
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
