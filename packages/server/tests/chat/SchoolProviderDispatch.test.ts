import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { z } from 'zod';
import { ChatAgent, buildModel } from 'najm-chatbot';
import { MCP_REGISTRY, McpTool, TOOL_PROVIDER, ToolGroup } from 'najm-mcp';
import { Controller, Get, Params, Validate } from '../../src/najm';
import { isAdministrator } from '../../src/auth';
import { schoolChatFetch, installSchoolChatTransport } from '../../src/modules/chat/transport/SchoolChatTransport';
import { schoolChatToolFailureText } from '../../src/modules/chat/transport/schoolChatResponse';
import { createJevFixture } from './jevFixture';

@Controller('/fixture-provider-audit') @ToolGroup('provider-audit')
class ProviderAudit {
  inputs: string[] = [];
  @Get('/:studentId') @isAdministrator()
  @Validate({ params: z.object({ studentId: z.string().min(1) }) })
  @McpTool({ description: 'Fixture authorized read', readOnly: true })
  read(@Params('studentId') studentId: string) { this.inputs.push(studentId); return { studentId }; }
}
const frame = (delta: unknown, finish: string | null = null) => 'data: ' + JSON.stringify({
  id: 'fixture', object: 'chat.completion.chunk', created: 0, model: 'openai/gpt-oss-20b',
  choices: [{ index: 0, delta, finish_reason: finish }],
}) + '\n\n';

test.each([
  { id: 'allowed', name: 'provider-audit_read<|channel|>commentary', input: { studentId: 'actual-id' }, role: 'admin', allowed: true },
  { id: 'invalid', name: 'provider-audit_read<|channel|>json', input: {}, role: 'admin', allowed: false },
  { id: 'denied', name: 'provider-audit_read<|channel|>', input: { studentId: 'actual-id' }, role: 'parent', allowed: false },
  { id: 'unoffered', name: 'students_get_student_count<|channel|>commentary', input: {}, role: 'admin', allowed: false },
])('real provider SDK/MCP adaptation preserves validation and authorization: $id', async item => {
  const originalFetch = globalThis.fetch;
  const originalFlow = process.env.CHATBOT_FLOW, originalMode = process.env.CHATBOT_JEV_MODE;
  process.env.CHATBOT_FLOW = 'jev-router-20b'; process.env.CHATBOT_JEV_MODE = 'off';
  const fixture = await createJevFixture({ extraControllers: { ProviderAudit } });
  let sends = 0;
  try {
    const registry = fixture.server.container.get(MCP_REGISTRY) as { tools: Array<{ name: string }> };
    fixture.server.container.set(TOOL_PROVIDER, { findRelevantTools: async () => ({ status: 'routed', tools: registry.tools.filter(tool => tool.name === 'provider-audit_read') }) } as any);
    globalThis.fetch = schoolChatFetch((async () => {
      sends++;
      const body = sends === 1
        ? frame({ content: 'We need private planning.' }) + frame({ tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: item.name, arguments: JSON.stringify(item.input) } }] }, 'tool_calls')
        : frame({ content: 'هادشي من القراءة المسموحة.' }, 'stop');
      return new Response(body + 'data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
    }) as typeof fetch);
    (fixture.server.container.get(ChatAgent) as any).buildModel = () => buildModel({ provider: 'openrouter', apiKey: 'fixture-only', model: 'openai/gpt-oss-20b' }, { openrouter: { reasoning: { exclude: true } } });
    const query = 'بغيت المعطيات ديال التلميذ';
    const response = await fixture.call('/chat', { messages: [{ role: 'user', content: query }] }, item.role);
    const body = await response.text();
    expect(sends).toBe(2);
    expect(body).not.toContain('We need private planning');
    const audit = await fixture.server.container.resolve(ProviderAudit);
    expect(audit.inputs).toEqual(item.allowed ? ['actual-id'] : []);
    expect(body).toContain('هادشي من القراءة المسموحة.');
    if (!item.allowed) expect(body).toContain(schoolChatToolFailureText(query));
    else expect(body).not.toContain('schoolFailedToolCalls');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of [['CHATBOT_FLOW', originalFlow], ['CHATBOT_JEV_MODE', originalMode]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
    await fixture.server.stop();
  }
});

test('a stale hot-reload adapter is replaced even when fetch itself has not changed', () => {
  const originalFetch = globalThis.fetch;
  const shared = globalThis as any;
  const previousAdapter = shared.__schoolChatTransport.adapter;
  try {
    installSchoolChatTransport();
    const before = globalThis.fetch;
    shared.__schoolChatTransport.adapter = () => before;
    installSchoolChatTransport();
    expect(globalThis.fetch).not.toBe(before);
    const after = globalThis.fetch;
    installSchoolChatTransport();
    expect(globalThis.fetch).toBe(after);
  } finally { globalThis.fetch = originalFetch; shared.__schoolChatTransport.adapter = previousAdapter; }
});

test('response formatting survives an absent request-local frame without changing other models', async () => {
  let sends = 0;
  const providerBody = frame({ content: 'We need planning.' }) + frame({ tool_calls: [{ index: 0, id: 'a', type: 'function', function: { name: 'read<|channel|>commentary', arguments: '{}' } }] }, 'tool_calls') + 'data: [DONE]\n\n';
  const fetcher = schoolChatFetch((async () => { sends++; return new Response(providerBody, { headers: { 'content-type': 'text/event-stream' } }); }) as typeof fetch);
  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const body = JSON.stringify({ model: 'openai/gpt-oss-20b', tools: [{ type: 'function', function: { name: 'read' } }] });
  const result = await (await fetcher(endpoint, { method: 'POST', body })).text();
  expect(result).not.toContain('We need planning');
  expect(result).not.toContain('<|channel|>');
  expect(result).toContain('"name":"read"');
  expect(sends).toBe(1);
  expect(await (await fetcher(endpoint, { method: 'POST', body: JSON.stringify({ model: 'openai/gpt-oss-120b' }) })).text()).toBe(providerBody);
  expect(await (await fetcher('/relative-unrelated-route')).text()).toBe(providerBody);
  expect(await (await fetcher(endpoint, { method: 'POST', body: 'invalid json' })).text()).toBe(providerBody);
});
