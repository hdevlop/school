import { composeNajmProxy } from 'najm-next/security';

import { auth } from '@/najm.auth';
import { schoolApp, schoolLocation } from '@/najm.config';

export default composeNajmProxy({
  auth,
  app: schoolApp,
  resolveLocationCsp: (env) =>
    schoolLocation.resolve(env, {
      isDevelopment: env.NODE_ENV === 'development',
    }).csp,
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|storage|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)',
  ],
};
