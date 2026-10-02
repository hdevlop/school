import { handle } from '@sms/server/najm';
import server from '@sms/server';

import { auth } from '@/najm.auth';
import { withChatAcademicYear } from '@/lib/chatAcademicYear';

const serverHandler = handle(server);

const handlers = auth.routeHandlers((request) => serverHandler(withChatAcademicYear(request)));
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = handlers;
