import { ACADEMIC_YEAR_HEADER, ACADEMIC_YEAR_QUERY } from '@sms/contracts/academic-years';

/**
 * The published chat widget can set its URL, but cannot set request headers.
 * Forward that selection to internal MCP tools through the normal year header.
 * Keep both inputs: the shared year boundary rejects malformed/conflicting values.
 */
export function withChatAcademicYear(request: Request): Request {
  const url = new URL(request.url);
  const year = url.searchParams.get(ACADEMIC_YEAR_QUERY);
  if (request.method !== 'POST' || url.pathname !== '/api/chat'
    || year === null || request.headers.has(ACADEMIC_YEAR_HEADER)) return request;

  const headers = new Headers(request.headers);
  headers.set(ACADEMIC_YEAR_HEADER, year);
  // NextRequest and the server's Request can use different fetch implementations.
  // Forward the body stream explicitly instead of cloning their internal state.
  const init: RequestInit & { duplex: 'half' } = {
    method: request.method, headers, body: request.body, signal: request.signal, duplex: 'half',
  };
  return new Request(request.url, init);
}
