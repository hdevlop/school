import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getMcpConfirmation, getMcpControllerTools } from 'najm-mcp';
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
  'AttendanceController.getToday',
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
});
