import { afterEach, describe, expect, it } from 'bun:test';
import { AiSettingsService } from 'najm-chatbot';
import { installOpenRouterKeyFallback, studioAssistantSettingsClass, withOpenRouterKeyFallback } from '../../src/modules/chat/transport/openRouterKeyFallback';

const original = process.env.OPENROUTER_API_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = original;
});

const openrouter = { provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', apiKey: null, isEnabled: true };

describe('OPENROUTER_API_KEY fallback', () => {
  it('fills in the env key when the AI settings choose OpenRouter and store none', () => {
    expect(withOpenRouterKeyFallback(openrouter, 'sk-or-env')).toEqual({ ...openrouter, apiKey: 'sk-or-env' });
    expect(withOpenRouterKeyFallback({ ...openrouter, baseUrl: null }, 'sk-or-env')?.apiKey).toBe('sk-or-env');
    expect(withOpenRouterKeyFallback({ ...openrouter, baseUrl: 'https://openrouter.ai/api/v1/' }, 'sk-or-env')?.apiKey).toBe('sk-or-env');
  });

  it('keeps a saved key', () => {
    expect(withOpenRouterKeyFallback({ ...openrouter, apiKey: 'sk-or-saved' }, 'sk-or-env')?.apiKey).toBe('sk-or-saved');
  });

  it('never sends the key to another provider or host', () => {
    expect(withOpenRouterKeyFallback({ ...openrouter, provider: 'openai' }, 'sk-or-env')?.apiKey).toBeNull();
    expect(withOpenRouterKeyFallback({ ...openrouter, baseUrl: 'https://proxy.example.test/v1' }, 'sk-or-env')?.apiKey).toBeNull();
  });

  it('changes nothing without an env key or settings', () => {
    expect(withOpenRouterKeyFallback(openrouter, undefined)).toBe(openrouter);
    expect(withOpenRouterKeyFallback(null, 'sk-or-env')).toBeNull();
  });

  it('reads OPENROUTER_API_KEY by default, blank as unset', () => {
    process.env.OPENROUTER_API_KEY = ' sk-or-from-env ';
    expect(withOpenRouterKeyFallback(openrouter)?.apiKey).toBe('sk-or-from-env');
    process.env.OPENROUTER_API_KEY = '  ';
    expect(withOpenRouterKeyFallback(openrouter)?.apiKey).toBeNull();
  });

  it('applies to every AiSettingsService.getInternal caller once installed', async () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-installed';
    installOpenRouterKeyFallback();
    installOpenRouterKeyFallback();
    const service = Object.create(AiSettingsService.prototype) as AiSettingsService & Record<string, unknown>;
    Object.assign(service, {
      internalCache: { expiresAt: Date.now() + 60_000, value: openrouter },
      internalLoad: null,
    });
    expect((await service.getInternal())?.apiKey).toBe('sk-or-installed');
  });

  it("also covers the RAG studio assistant's bundled copy of AiSettingsService", async () => {
    const studioCopy = studioAssistantSettingsClass();
    // If najm-chatbot stops bundling a copy (or renames it), this fails so the patch is revisited.
    expect(studioCopy).toBeDefined();
    process.env.OPENROUTER_API_KEY = 'sk-or-studio';
    installOpenRouterKeyFallback();
    const service = Object.create(studioCopy!.prototype) as Record<string, unknown> & { getInternal: () => Promise<{ apiKey?: string } | null> };
    Object.assign(service, { internalCache: { expiresAt: Date.now() + 60_000, value: openrouter }, internalLoad: null });
    expect((await service.getInternal())?.apiKey).toBe('sk-or-studio');
  });
});
