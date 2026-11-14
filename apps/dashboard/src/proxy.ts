import { composeNajmProxy } from 'najm-next/security';

import { auth } from '@/najm.auth';
import { schoolApp } from '@/najm.config';

const proxy = composeNajmProxy({
  auth,
  app: schoolApp,
});

/**
 * Reports how long the session check took, recovery call included, as a
 * Server-Timing entry: DevTools shows it, and subtracting it from the page's
 * server wait leaves the render.
 */
export default async function schoolProxy(request: Request) {
  const started = performance.now();
  const response = await proxy(request);
  response.headers.append('Server-Timing', `session;dur=${(performance.now() - started).toFixed(1)}`);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images|storage|.*\\.(?:css|js|map|json|txt|xml|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|webmanifest|apk)$).*)',
  ],
};
