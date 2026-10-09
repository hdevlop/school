import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { z } from 'zod';
import { ChatAgent } from 'najm-chatbot';
import { scriptedModel } from 'najm-chatbot/testing';
import { McpTool, ToolGroup, TOOL_PROVIDER, MCP_REGISTRY } from 'najm-mcp';
import { Controller, Get, Params, Validate } from '../../src/najm';
import { isAdministrator } from '../../src/auth';
import { ChatDiagnosticsLog } from '../../src/modules/chat/diagnostics/ChatDiagnosticsLog';
import { schoolChatToolFailureText } from '../../src/modules/chat/transport/schoolChatResponse';
import { createJevFixture } from './jevFixture';

@Controller('/fixture-input-audit') @ToolGroup('input-audit')
class InputAuditController {
  reads = 0;
  @Get('/:studentId') @isAdministrator()
  @Validate({ params: z.object({ studentId: z.string().min(1) }) })
  @McpTool({ description: 'Fixture validated student identity read', readOnly: true })
  read(@Params('studentId') studentId: string) { this.reads++; return { studentId }; }
}
const cases = [
  { id: 'unknown', toolName: 'parents_missing', args: {}, rejected: true },
  { id: 'malformed-name', toolName: 'parents_search<|channel|>commentary', args: {}, rejected: true },
  { id: 'missing-id', toolName: 'input-audit_read', args: {}, rejected: true },
  { id: 'wrong-type', toolName: 'input-audit_read', args: { studentId: 123 }, rejected: true },
  { id: 'invalid-json', toolName: 'input-audit_read', args: '{', rejected: true },
  { id: 'blank-id', toolName: 'input-audit_read', args: { studentId: '' }, rejected: true },
  { id: 'unoffered', toolName: 'input-audit_read', args: { studentId: 'S1' }, rejected: true },
  { id: 'denied', toolName: 'input-audit_read', args: { studentId: 'S1' }, rejected: true },
  { id: 'valid', toolName: 'input-audit_read', args: { studentId: 'S1' }, rejected: false },
];
test.each(cases)('published SDK/MCP dispatch $id with validated arguments and preserved failures', async item => {
  const fixture = await createJevFixture({ extraControllers: { InputAuditController } });
  try {
    const registry = fixture.server.container.get(MCP_REGISTRY) as { tools: Array<{ name: string }> };
    fixture.server.container.set(TOOL_PROVIDER, { findRelevantTools: async () => ({ status: 'routed', tools: registry.tools.filter(tool => tool.name === (item.id === 'unoffered' ? 'students_get_student_count' : 'input-audit_read')) }) } as any);
    const model = scriptedModel({ cannedText: 'جواب من بعد المحاولة.', toolCalls: [{ toolName: item.toolName, args: item.args }] });
    let generations = 0;
    const generate = model.doStream.bind(model);
    model.doStream = async options => { generations++; return generate(options); };
    (fixture.server.container.get(ChatAgent) as any).buildModel = () => model;
    const query = 'بغيت تفاصيل النقط ديال تلميذ';
    const response = await fixture.call('/chat', { messages: [{ role: 'user', parts: [{ type: 'text', text: query }] }] }, item.id === 'denied' ? 'parent' : 'admin');
    const stream = await response.text();
    const events = stream.split(/\r?\n/u).filter(line => line.startsWith('data: {')).map(line => JSON.parse(line.slice(6)));
    const text = events.filter(event => event.type === 'text-delta').map(event => event.delta).join('');
    expect(response.status).toBe(200);
    expect(generations).toBe(2); // One scripted tool step, one scripted answer. No provider HTTP.
    const controller = await fixture.server.container.resolve(InputAuditController);
    expect(controller.reads).toBe(item.rejected ? 0 : 1);
    const log = new ChatDiagnosticsLog(); log.record(fixture.events.at(-1)!);
    const failures = log.recent(1)[0].toolFailures;
    if (item.rejected) {
      expect(failures?.reduce((sum, failure) => sum + failure.count, 0)).toBe(1);
      expect(text).toContain(schoolChatToolFailureText(query));
      expect(events.find(event => event.type === 'finish').messageMetadata.schoolFailedToolCalls).toBe(1);
    } else {
      expect(failures).toBeUndefined();
      expect(text).toBe('جواب من بعد المحاولة.');
    }
  } finally { await fixture.server.stop(); }
});

test.each([
  { query: 'ch7al mn bent kayna f lmdrasa?', name: 'students_get_students', fact: 'girl-a' },
  { query: 'werini lghiyab dyal tlamid', name: 'attendance_get_all', fact: 'Salma' },
  { query: 'werini forod had chher', name: 'exams_get_all', fact: '2025-10-31' },
])('former filtered request uses routed MCP results: $name', async item => {
  const fixture = await createJevFixture();
  try {
    const registry = fixture.server.container.get(MCP_REGISTRY) as { tools: Array<{ name: string }> };
    let routingCalls = 0;
    fixture.server.container.set(TOOL_PROVIDER, { findRelevantTools: async () => {
      routingCalls++;
      return { status: 'routed', tools: registry.tools.filter(tool => tool.name === item.name) };
    } } as any);
    const answer = 'جواب من المعطيات اللي رجعات الأداة.';
    const model = scriptedModel({ cannedText: answer, toolCalls: [{ toolName: item.name, args: { academicYear: '2025-2026' } }] });
    let generations = 0;
    const generate = model.doStream.bind(model);
    model.doStream = async options => {
      generations++;
      // Verify the second step receives actual MCP data, not local calculations.
      if (generations === 2) expect(JSON.stringify(options.prompt)).toContain(item.fact);
      return generate(options);
    };
    (fixture.server.container.get(ChatAgent) as any).buildModel = () => model;
    const response = await fixture.call('/chat', { messages: [{ role: 'user', content: item.query }] }, 'admin', '2025-2026');
    const stream = await response.text();
    expect(response.status).toBe(200);
    expect(routingCalls).toBe(1);
    expect(generations).toBe(2);
    expect(stream).toContain(answer);
    expect(fixture.events.at(-1)?.tools).toMatchObject([{ name: item.name, outcome: 'executed' }]);
  } finally { await fixture.server.stop(); }
});
