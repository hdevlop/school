import { handle } from '@sms/server/najm';
import server from '@sms/server';

export const GET = handle(server);
export const POST = handle(server);
export const PUT = handle(server);
export const DELETE = handle(server);
export const PATCH = handle(server);
export const HEAD = handle(server);
export const OPTIONS = handle(server);
