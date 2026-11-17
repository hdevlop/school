import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getMcpToolGroup, getMcpTools } from 'najm-mcp';
import * as modules from '../../src/modules';
import { TOOL_DEPENDENCIES } from '../../src/modules/chat/routing/toolDependencies';

// A renamed or removed tool would otherwise drop out of the table silently:
// najm-rag offers only names that exist. Names are built as in
// tests/security/ChatReadOnlyTools.test.ts.
function registeredTools() {
  const names = new Set<string>();
  for (const value of Object.values(modules)) {
    if (typeof value !== 'function' || getRoutes(value).length === 0) continue;
    const group = getMcpToolGroup(value);
    for (const tool of getMcpTools(value)) names.add(group ? `${group}_${tool.name}` : tool.name);
  }
  return names;
}

test('every tool dependency names a registered MCP tool', () => {
  const registered = registeredTools();
  expect(registered.size).toBeGreaterThan(400);
  const named = Object.entries(TOOL_DEPENDENCIES).flatMap(([tool, dependencies]) => [tool, ...dependencies]);
  expect([...new Set(named)].filter(name => !registered.has(name))).toEqual([]);
});
