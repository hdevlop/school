import { handle } from '@sms/server/najm';
import server from '@sms/server';

import { auth } from '@/najm.auth';

const serverHandler = handle(server);

const handlers = auth.routeHandlers(serverHandler);
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = handlers;
