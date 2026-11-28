import { handle } from '@sms/server/najm';
import server from '@sms/server';

/**
 * A fingerprint terminal's "Cloud Server" (ADMS) setting takes only a host and
 * port, and the device always calls /iclock/*. Its routes live under /api
 * (AdmsController), so this hands the request on with the /api prefix. A Next
 * rewrite keeps the original URL, which the server would not find. The device
 * sends no cookies, so no session handling wraps it.
 */
const serverHandler = handle(server);

async function forward(request: Request) {
  const url = new URL(request.url);
  url.pathname = `/api${url.pathname}`;
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  return serverHandler(new Request(url, { method: request.method, headers: request.headers, body }));
}

export const GET = forward;
export const POST = forward;
