import 'reflect-metadata';
import { describe, expect, it } from 'bun:test';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import type { ChatDiagnostics } from 'najm-chatbot';
import { chatbotConfig } from '../../src/config';
import { ChatDiagnosticsController } from '../../src/modules/chat/ChatDiagnosticsController';
import { ChatDiagnosticsLog, chatDiagnosticsLog } from '../../src/modules/chat/ChatDiagnosticsLog';

function diagnostics(correlationId: string | null): ChatDiagnostics {
  return {
    version: 1,
    correlationId,
    channel: 'web',
    provider: 'openrouter',
    model: 'openai/gpt-oss-120b',
    outcome: 'completed',
    error: null,
    routingStatus: 'routed',
    routedToolCount: 3,
    messages: { stored: 0, prompt: 1 },
    spans: { settingsMs: 1, historyMs: 1, routingMs: 40, contextMs: 5, prepareMs: 50, persistenceMs: 3 },
    marks: { firstTextMs: 900, finishMs: 1200 },
    steps: [],
    tools: [],
    usage: null,
    cost: null,
  };
}

describe('chat diagnostics', () => {
  it('are readable by administrators only', () => {
    const routes = getRoutes(ChatDiagnosticsController).map((route) => route.methodName);
    expect(routes.sort()).toEqual(['find', 'list']);
    for (const method of routes) {
      const names = getGuardMetadata(ChatDiagnosticsController, method).map((guard: any) => guard.guardClass?.name);
      expect(names.length, method).toBeGreaterThan(0);
      expect(names.some((name) => name !== 'AuthGuard'), method).toBe(true);
    }
  });

  it('go to the in-memory log, and the question-storing interaction log stays off', () => {
    const { chatLogging } = (chatbotConfig() as any).config ?? {};
    expect(chatLogging?.enabled).toBe(false);
    expect(chatLogging?.onDiagnostics).toBe(chatDiagnosticsLog.record);
  });

  it('keep the newest records up to capacity and find one by request id', () => {
    const log = new ChatDiagnosticsLog(2);
    log.record(diagnostics('a'));
    log.record(diagnostics('b'));
    log.record(diagnostics('c'));

    expect(log.find('a')).toBeNull();
    expect(log.find('c')?.correlationId).toBe('c');
    expect(log.recent(5).map((entry) => entry.correlationId)).toEqual(['c', 'b']);
    expect(log.recent(1).map((entry) => entry.correlationId)).toEqual(['c']);
  });

  it('return the newest record when a request id repeats', () => {
    const log = new ChatDiagnosticsLog();
    log.record({ ...diagnostics('same'), outcome: 'error' });
    log.record(diagnostics('same'));
    expect(log.find('same')?.outcome).toBe('completed');
  });
});
