import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getMcpAnnotations, getMcpConfirmation, getMcpControllerTools, getMcpToolGroup, getMcpTools } from 'najm-mcp';
import * as modules from '../../src/modules';

// The chat assistant is read-only: najm-chatbot refuses any MCP tool that
// carries a confirmation and runs every other one. A tool that changes data
// therefore needs `confirm` on its @McpTool, or the chat can perform the change.

// najm-mcp adds a confirmation itself when the tool name contains one of these
// words (McpRegistryService.inferConfirmation).
const AUTO_CONFIRMED = /delete|remove|destroy|drop|purge|wipe|refund|revoke/i;

// Tools on POST routes that only read: a body carries their filters. Reviewed
// 2026-10-03; add a tool here only after checking it writes nothing.
const READ_ONLY_POSTS = new Set([
  'AttendanceController.getAll',
  'AttendanceController.getByDate',
  'AttendanceController.getTodayAll',
  'AttendanceController.getTodayStaff',
  'AttendanceController.getTodayStudents',
  'EventController.getByDateRangeMcp',
  'FeeController.getOverdueByStudent',
  'FinancialAuditController.list',
  'ParentController.search',
  'PaymentController.getMonthlyRevenue',
  'PaymentController.getRevenueByPaymentMethod',
  'PaymentController.getRevenueStats',
  'PaymentController.getTopPayingStudents',
  'PaymentController.getTotalRevenue',
]);

function controllers() {
  return Object.values(modules).filter((value): value is new (...args: any[]) => any =>
    typeof value === 'function' && getRoutes(value).length > 0);
}

describe('chat-callable tools', () => {
  it('confirm every tool that can change data, so the chat refuses it', () => {
    const unconfirmed: string[] = [];
    let writeTools = 0;
    for (const controller of controllers()) {
      const tools = new Set(getMcpControllerTools(controller).map(String));
      for (const route of getRoutes(controller)) {
        if (route.method === 'get' || !tools.has(route.methodName)) continue;
        const key = `${controller.name}.${route.methodName}`;
        if (READ_ONLY_POSTS.has(key)) continue;
        writeTools++;
        const handler = controller.prototype[route.methodName];
        if (!getMcpConfirmation(handler) && !AUTO_CONFIRMED.test(route.methodName)) {
          unconfirmed.push(`${key} (${route.method.toUpperCase()})`);
        }
      }
    }
    expect(writeTools).toBeGreaterThan(100);
    expect(unconfirmed).toEqual([]);
  });

  // najm-rag keeps the best-matching tool and drops every other candidate that
  // lacks readOnlyHint as a possible write, so an unmarked read is routed only
  // when it is the single best match.
  it('mark every read as read-only, so routing can offer it, and no write', () => {
    const unmarkedReads: string[] = [];
    const markedWrites: string[] = [];
    for (const controller of controllers()) {
      const tools = new Set(getMcpControllerTools(controller).map(String));
      for (const route of getRoutes(controller)) {
        if (!tools.has(route.methodName)) continue;
        const key = `${controller.name}.${route.methodName}`;
        const readOnly = getMcpAnnotations(controller.prototype[route.methodName])?.readOnlyHint === true;
        const isRead = route.method === 'get' || READ_ONLY_POSTS.has(key);
        if (isRead && !readOnly) unmarkedReads.push(key);
        if (!isRead && readOnly) markedWrites.push(`${key} (${route.method.toUpperCase()})`);
      }
    }
    expect(unmarkedReads).toEqual([]);
    expect(markedWrites).toEqual([]);
  });

  it('keep the reviewed read-only list current', () => {
    const tools = new Set<string>();
    for (const controller of controllers()) {
      const names = new Set(getMcpControllerTools(controller).map(String));
      for (const route of getRoutes(controller)) {
        if (route.method !== 'get' && names.has(route.methodName)) tools.add(`${controller.name}.${route.methodName}`);
      }
    }
    expect([...READ_ONLY_POSTS].filter((key) => !tools.has(key))).toEqual([]);
  });

  // Cerebras, OpenRouter's fastest gpt-oss-120b host, returned calls to
  // `teachers_get_teacher_count` as `teachers_get_teacher`: a real tool whose
  // name starts the other one. Renaming the shorter tool fixed it (6/6 probes,
  // 2026-10-04), so no tool name may begin another.
  it('keep every tool name from starting another tool name', () => {
    const names: string[] = [];
    for (const controller of controllers()) {
      const group = getMcpToolGroup(controller);
      for (const tool of getMcpTools(controller)) names.push(group ? `${group}_${tool.name}` : tool.name);
    }
    expect(names.length).toBeGreaterThan(400);
    const prefixes = names.flatMap((short) => names
      .filter((long) => long !== short && long.startsWith(short))
      .map((long) => `${short} < ${long}`));
    expect(prefixes).toEqual([]);
  });
});
