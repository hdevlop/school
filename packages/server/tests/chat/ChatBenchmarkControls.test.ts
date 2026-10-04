import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import type { ChatDiagnostics } from 'najm-chatbot';
import type { EmbeddingService, KnowledgeContextProvider } from 'najm-rag';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { ChatBenchmarkController } from '../../src/modules/chat/ChatBenchmarkController';
import { ChatBenchmarkService } from '../../src/modules/chat/ChatBenchmarkService';
import { chatBenchmarkState } from '../../src/modules/chat/ChatBenchmarkState';
import { ChatDiagnosticsLog } from '../../src/modules/chat/ChatDiagnosticsLog';

const initialFlag = process.env.CHATBOT_BENCHMARK_CONTROLS;
const initialNodeEnv = process.env.NODE_ENV;
const initialResets = chatBenchmarkState.resetCount;
afterEach(() => {
  if (initialFlag === undefined) delete process.env.CHATBOT_BENCHMARK_CONTROLS;
  else process.env.CHATBOT_BENCHMARK_CONTROLS = initialFlag;
  if (initialNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = initialNodeEnv;
  chatBenchmarkState.resetCount = initialResets;
});

function controls() {
  const calls: string[] = [];
  const service = new ChatBenchmarkService(
    { clearQueryCache: () => calls.push('query') } as unknown as EmbeddingService,
    { clearCache: () => calls.push('knowledge') } as unknown as KnowledgeContextProvider,
  );
  return { service, calls };
}

describe('isolated chat benchmark cache controls', () => {
  it('requires sign-in and an administrator role on every control route', () => {
    const methods = getRoutes(ChatBenchmarkController).map((route) => route.methodName);
    expect(methods.sort()).toEqual(['resetCaches', 'status']);
    for (const method of methods) {
      const guards = getGuardMetadata(ChatBenchmarkController, method);
      expect(guards.some((guard) => guard.guardClass.name === 'AuthGuard')).toBe(true);
      expect(guards.find((guard) => guard.guardClass.name === 'RoleGuard')?.params).toEqual(['principal', 'admin']);
    }
  });
  it('does not touch caches unless explicitly enabled and never permits production resets', () => {
    for (const [environment, flag] of [['development', undefined], ['development', 'false'],
      ['development', '1'], ['production', 'true']]) {
      process.env.NODE_ENV = environment;
      if (flag === undefined) delete process.env.CHATBOT_BENCHMARK_CONTROLS;
      else process.env.CHATBOT_BENCHMARK_CONTROLS = flag;
      const { service, calls } = controls();
      expect(service.status().enabled).toBe(false);
      expect(() => service.resetCaches()).toThrow();
      expect(calls).toEqual([]);
      expect(chatBenchmarkState.resetCount).toBe(initialResets);
    }
  });

  it('clears supported caches on the injected instances and tracks each reset', () => {
    process.env.NODE_ENV = 'development';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
    const { service, calls } = controls();
    const before = service.status();
    const reset = service.resetCaches();
    expect(reset).toMatchObject({ enabled: true, instanceId: before.instanceId,
      resetCount: before.resetCount + 1, caches: ['query-embedding', 'knowledge-context'] });
    expect(calls).toEqual(['query', 'knowledge']);
    expect(service.resetCaches().resetCount).toBe(before.resetCount + 2);
  });

  it('tags diagnostics with the reset instance without modifying the shared record', () => {
    process.env.NODE_ENV = 'development';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
    const { service } = controls();
    const reset = service.resetCaches();
    const record = Object.freeze({ correlationId: 'request-a' }) as ChatDiagnostics;
    const log = new ChatDiagnosticsLog();
    log.record(record);
    expect(log.find('request-a')?.benchmark).toEqual({ instanceId: reset.instanceId, resetCount: reset.resetCount });
    expect(Object.hasOwn(record, 'benchmark')).toBe(false);
    service.resetCaches();
    expect(log.find('request-a')?.benchmark?.resetCount).toBe(reset.resetCount);
    process.env.NODE_ENV = 'production';
    log.record({ correlationId: 'request-b' } as ChatDiagnostics);
    expect(log.find('request-b')?.benchmark).toBeUndefined();
  });
});
