import { composeNajmProxy } from 'najm-next/security';

import { auth } from '@/najm.auth';
import { schoolApp } from '@/najm.config';

export default composeNajmProxy({
  auth,
  app: schoolApp,
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|storage|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest)$).*)',
  ],
};
