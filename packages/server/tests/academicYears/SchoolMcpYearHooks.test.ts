import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { Container } from 'diject';
import { McpErrorCode, McpException } from 'najm-mcp';
import { Err, USER } from '../../src/najm';
import { schoolMcpYearHooks } from '../../src/modules/academicYears/requestYear';

describe('School MCP year hook prepared for the published Najm API', () => {
  it('reuses the charged year in fee write bodies as their MCP selection', async () => {
    const hooks = schoolMcpYearHooks(['fees']);
    expect(hooks.toolInput({ group: 'fees', methodKey: 'getFees' })).toHaveProperty('academicYear');
    expect(hooks.toolInput({ group: 'fees', methodKey: 'create' })).toBeUndefined();
    expect(hooks.toolInput({ group: 'fees', methodKey: 'update' })).toBeUndefined();
    const container = Container.create();
    let input: unknown;
    (container as any).resolve = async () => ({
      resolveSelection: async (selection: unknown) => {
        input = selection;
        return { id: 'year-2025', label: '2025-2026' };
      },
    });
    await container.run({ [USER.key]: { role: 'admin' } }, () => hooks.aroundInvoke({
      tool: { group: 'fees', methodKey: 'create' },
      input: { academicYear: '2025-2026' }, toolInput: {}, container,
      header: () => undefined,
    }, async () => null));
    expect(input).toEqual({ header: undefined, query: '2025-2026' });
  });

  it('declares year input for migrated modules and keeps the resolved year inside its call', async () => {
    const hooks = schoolMcpYearHooks(['alerts', 'announcements']);
    expect(Object.keys(hooks.toolInput({ group: 'alerts' }) ?? {})).toEqual(['academicYear']);
    expect(Object.keys(hooks.toolInput({ group: 'announcements' }) ?? {})).toEqual(['academicYear']);
    expect(hooks.toolInput({ group: 'settings' })).toBeUndefined();
    expect(hooks.invocationScope({ group: 'alerts' }))
      .toEqual({ 'school:resolvedAcademicYear': undefined });

    const container = Container.create();
    let selected: unknown;
    (container as any).resolve = async () => ({
      resolveSelection: async (input: unknown, role: string) => {
        selected = { input, role };
        return { id: 'year-2025', label: '2025-2026' };
      },
    });
    const call = async () => hooks.aroundInvoke({
      tool: { group: 'alerts' },
      toolInput: { academicYear: '2025-2026' },
      container,
      header: () => '2025-2026',
    }, async () => container.store.get('school:resolvedAcademicYear'));

    const result = await container.run({ [USER.key]: { role: 'admin' } }, call);
    expect(selected).toEqual({
      input: { header: '2025-2026', query: '2025-2026' }, role: 'admin',
    });
    expect(result).toEqual({ id: 'year-2025', label: '2025-2026' });
    expect(container.store.get('school:resolvedAcademicYear')).toBeUndefined();
  });

  it('maps selection failures to MCP errors and leaves the handler uncalled', async () => {
    const hooks = schoolMcpYearHooks(['alerts', 'announcements']);
    const container = Container.create();
    (container as any).resolve = async () => ({
      resolveSelection: async () => Err(400, 'The academic year header and query value disagree'),
    });
    let called = false;
    const context = {
      tool: { group: 'alerts' }, toolInput: { academicYear: '2025-2026' }, container,
      header: () => '2026-2027',
    };
    try {
      await hooks.aroundInvoke(context, async () => { called = true; });
      throw new Error('Expected the year selection to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(McpException);
      expect((error as McpException).code).toBe(McpErrorCode.INVALID_ARGS);
    }
    expect(called).toBe(false);
  });

  it('does not rewrite errors thrown by the alert handler', async () => {
    const hooks = schoolMcpYearHooks(['alerts', 'announcements']);
    const container = Container.create();
    (container as any).resolve = async () => ({
      resolveSelection: async () => ({ id: 'year-2025', label: '2025-2026' }),
    });
    const handlerError = new Error('alert handler failed');
    await expect(hooks.aroundInvoke({
      tool: { group: 'alerts' }, toolInput: {}, container,
      header: () => undefined,
    }, async () => { throw handlerError; })).rejects.toBe(handlerError);
  });
});
