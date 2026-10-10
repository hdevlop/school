import { describe, expect, it } from 'bun:test';
import { NextRequest } from 'next/server';
import { withChatAcademicYear } from '@/lib/chatAcademicYear';

describe('the chat widget year transport', () => {
  it('forwards the URL year to MCP without losing the stream request or authentication', async () => {
    const controller = new AbortController();
    const body = JSON.stringify({ messages: [{ role: 'user', parts: [{ type: 'text', text: 'List students' }] }] });
    const input = new NextRequest('http://school.local/api/chat?academicYear=2025-2026', {
      method: 'POST', body, signal: controller.signal,
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json', 'X-Language': 'ar' },
    });
    const output = withChatAcademicYear(input);
    expect(output.headers.get('X-Academic-Year')).toBe('2025-2026');
    expect(output.headers.get('Authorization')).toBe('Bearer test-token');
    expect(output.headers.get('X-Language')).toBe('ar');
    expect(output.url).toBe(input.url);
    expect(output.method).toBe('POST');
    expect(await output.text()).toBe(body);
    controller.abort();
    expect(output.signal.aborted).toBe(true);
  });

  it('leaves an explicit header and a conflicting query for the shared validator', () => {
    const input = new Request('http://school.local/api/chat?academicYear=2025-2026', {
      method: 'POST', headers: { 'X-Academic-Year': '2026-2027' },
    });
    expect(withChatAcademicYear(input)).toBe(input);
  });

  it('does not intercept other API routes, methods or the active-year default', () => {
    for (const [method, path] of [
      ['POST', '/api/students?academicYear=2025-2026'],
      ['POST', '/api/chat/debug?academicYear=2025-2026'],
      ['GET', '/api/chat?academicYear=2025-2026'],
      ['POST', '/api/chat'],
    ]) {
      const input = new Request(`http://school.local${path}`, { method });
      expect(withChatAcademicYear(input)).toBe(input);
    }
  });
});
