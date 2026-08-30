import { handle } from '@sms/server/najm';
import server from '@sms/server';

import { auth } from '@/lib/auth';

const serverHandler = handle(server);

// Najm composes every supported Next.js verb and owns auth-cookie persistence.
// The cookie name remains School's stable Remember Me contract.
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = auth.routeHandlers(
  serverHandler,
  {
    rememberCookieName: 'sms.remember',
  },
);
