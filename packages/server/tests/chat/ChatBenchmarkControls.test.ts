import 'reflect-metadata';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import type { ChatDiagnostics } from 'najm-chatbot';
import type { AiSettingsService } from 'najm-chatbot';
import type { EmbeddingService, KnowledgeContextProvider } from 'najm-rag';
import { getRoutes } from 'najm-core';
import { getGuardMetadata } from 'najm-guard';
import { getI18nInjections, translate } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';
import { ChatBenchmarkController } from '../../src/modules/chat/ChatBenchmarkController';
import { ChatBenchmarkService } from '../../src/modules/chat/ChatBenchmarkService';
import { chatBenchmarkState } from '../../src/modules/chat/ChatBenchmarkState';
import { ChatDiagnosticsLog } from '../../src/modules/chat/ChatDiagnosticsLog';
import { withEnglishMessages } from '../support/englishMessages';

const initialFlag = process.env.CHATBOT_BENCHMARK_CONTROLS;
const initialNodeEnv = process.env.NODE_ENV;
const initialResets = chatBenchmarkState.resetCount;
const initialProviderKey = process.env.OPENROUTER_API_KEY;
let fetchSpy: ReturnType<typeof spyOn> | undefined;
afterEach(() => {
  fetchSpy?.mockRestore();
  fetchSpy = undefined;
  if (initialProviderKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = initialProviderKey;
  if (initialFlag === undefined) delete process.env.CHATBOT_BENCHMARK_CONTROLS;
  else process.env.CHATBOT_BENCHMARK_CONTROLS = initialFlag;
  if (initialNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = initialNodeEnv;
  chatBenchmarkState.resetCount = initialResets;
});

function controls(provider = 'openrouter') {
  const calls: string[] = [];
  const service = withEnglishMessages(new ChatBenchmarkService(
    { clearQueryCache: () => calls.push('query') } as unknown as EmbeddingService,
    { clearCache: () => calls.push('knowledge') } as unknown as KnowledgeContextProvider,
    { getInternal: async () => ({ provider, apiKey: 'private-selected-key',
      model: 'openai/gpt-oss-120b', baseUrl: 'https://openrouter.ai/api/v1' }) } as unknown as AiSettingsService,
  ));
  return { service, calls };
}

describe('isolated chat benchmark cache controls', () => {
  it('requires sign-in and an administrator role on every control route', () => {
    const methods = getRoutes(ChatBenchmarkController).map((route) => route.methodName);
    expect(methods.sort()).toEqual(['providerUsage', 'resetCaches', 'status']);
    for (const method of methods) {
      const guards = getGuardMetadata(ChatBenchmarkController, method);
      expect(guards.some((guard) => guard.guardClass.name === 'AuthGuard')).toBe(true);
      expect(guards.find((guard) => guard.guardClass.name === 'RoleGuard')?.params).toEqual(['principal', 'admin']);
    }
  });
  it('does not touch caches unless explicitly enabled and never permits production resets', async () => {
    for (const [environment, flag] of [['development', undefined], ['development', 'false'],
      ['development', '1'], ['production', 'true']]) {
      process.env.NODE_ENV = environment;
      if (flag === undefined) delete process.env.CHATBOT_BENCHMARK_CONTROLS;
      else process.env.CHATBOT_BENCHMARK_CONTROLS = flag;
      const { service, calls } = controls();
      expect(service.status().enabled).toBe(false);
      expect(() => service.resetCaches()).toThrow();
      await expect(service.providerUsage()).rejects.toThrow();
      expect(calls).toEqual([]);
      expect(chatBenchmarkState.resetCount).toBe(initialResets);
    }
  });

  it('reads only the selected key ledger and returns an allowlist without credentials or provider bodies', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
    process.env.OPENROUTER_API_KEY = 'private-selected-key';
    const spy = spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({ data: {
      usage: 0.7, limit: 50, limit_remaining: 49.3, label: 'private-provider-label', secret: 'private-response-value',
    } }));
    fetchSpy = spy;
    const { service } = controls();
    const result = await service.providerUsage();
    expect(result).toMatchObject({ selectedKeyVerified: true, matchesEnvironmentKey: true,
      usage: 0.7, limit: 50, limitRemaining: 49.3 });
    expect(JSON.stringify(result)).not.toContain('private-');
    expect(spy.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/key');
    expect(spy.mock.calls[0][1]).toMatchObject({ redirect: 'error',
      headers: { authorization: 'Bearer private-selected-key' } });
    process.env.OPENROUTER_API_KEY = 'different-environment-key';
    expect((await service.providerUsage()).matchesEnvironmentKey).toBe(false);
  });

  it('rejects unsupported providers and sanitizes failed or malformed ledger reads', async () => {
    process.env.NODE_ENV = 'development';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
    const spy = spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('private-provider-error', { status: 401 }));
    fetchSpy = spy;
    await expect(controls('other').service.providerUsage()).rejects.toThrow('not supported');
    expect(spy).not.toHaveBeenCalled();
    await expect(controls().service.providerUsage()).rejects.toThrow('Provider usage read failed');
    spy.mockImplementation(async () => Response.json({ data: { usage: '0.7', limit: 50, limit_remaining: 49.3 } }));
    await expect(controls().service.providerUsage()).rejects.toThrow('Provider usage read failed');
    spy.mockImplementation(async () => { throw new Error('private-header-value'); });
    await expect(controls().service.providerUsage()).rejects.toThrow('Provider usage read failed');
  });

  it.each(['fr', 'ar', 'es'] as const)('translates refusals and sanitized usage errors in %s', async language => {
    process.env.NODE_ENV = 'development';
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'false';
    const localized = (provider = 'openrouter') => {
      const { service } = controls(provider);
      for (const { propertyKey, options } of getI18nInjections(ChatBenchmarkService)) {
        (service as unknown as Record<PropertyKey, unknown>)[propertyKey] = (key: string) =>
          translate(translations, language, `${options!.prefix}.${key}`);
      }
      return service;
    };
    const messages = translations[language].chatBenchmark.errors;
    const spy = spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('private-provider-error', { status: 401 }));
    fetchSpy = spy;
    expect(() => localized().resetCaches()).toThrow(messages.controlsDisabled);
    await expect(localized().providerUsage()).rejects.toThrow(messages.controlsDisabled);
    expect(spy).not.toHaveBeenCalled();
    process.env.CHATBOT_BENCHMARK_CONTROLS = 'true';
    await expect(localized('other').providerUsage()).rejects.toThrow(messages.providerUsageUnsupported);
    expect(spy).not.toHaveBeenCalled();
    await expect(localized().providerUsage()).rejects.toThrow(messages.providerUsageFailed);
    expect(messages.providerUsageFailed).not.toContain('private-');
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
