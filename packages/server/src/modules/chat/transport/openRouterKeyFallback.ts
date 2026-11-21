import { AiSettingsService } from 'najm-chatbot';
import { StudioAssistantProviderService } from 'najm-chatbot/studio-assistant';
import { env } from '../../../env';

/**
 * OPENROUTER_API_KEY as the key of last resort. najm-chatbot reads the AI
 * settings from the database only, and every OpenRouter caller (the answer
 * model, Jev's classifier and tool rerank, the RAG studio's assistant) goes
 * through `AiSettingsService.getInternal()`, so the fallback is applied there.
 *
 * A key saved in the AI settings always wins. The env key is filled in only
 * for provider OpenRouter on OpenRouter's own address, so it is never sent to
 * another host. The settings screen still shows "no key": `hasKey` describes
 * the database row, not this fallback.
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface KeyedSettings { provider?: string | null; apiKey?: string | null; baseUrl?: string | null }
type SettingsClass = { name: string; prototype: { getInternal: () => Promise<unknown> } };

export function withOpenRouterKeyFallback<T extends KeyedSettings | null | undefined>(
  settings: T, key: string | undefined = env.chat.openRouterApiKey,
): T {
  if (!settings || !key || settings.apiKey || settings.provider !== 'openrouter') return settings;
  if (settings.baseUrl && settings.baseUrl.replace(/\/+$/u, '') !== OPENROUTER_BASE_URL) return settings;
  return { ...settings, apiKey: key };
}

/**
 * najm-chatbot/studio-assistant bundles its own copy of AiSettingsService and
 * does not export it; it is the first constructor parameter of
 * StudioAssistantProviderService, which TypeScript's decorator metadata records.
 */
export function studioAssistantSettingsClass(): SettingsClass | undefined {
  const getMetadata = (Reflect as { getMetadata?: (key: string, target: object) => unknown }).getMetadata;
  const params = getMetadata?.('design:paramtypes', StudioAssistantProviderService) as unknown[] | undefined;
  const candidate = params?.[0] as SettingsClass | undefined;
  return candidate?.name === 'AiSettingsService' && typeof candidate.prototype?.getInternal === 'function'
    ? candidate : undefined;
}

const patched = new WeakSet<object>();

function patch(settingsClass: SettingsClass) {
  const proto = settingsClass.prototype;
  if (patched.has(proto)) return;
  patched.add(proto);
  const getInternal = proto.getInternal;
  proto.getInternal = async function schoolGetInternal(this: unknown) {
    return withOpenRouterKeyFallback(await getInternal.call(this) as KeyedSettings | null);
  };
}

/** Called once at boot, before any chat; calling it again does nothing. */
export function installOpenRouterKeyFallback() {
  patch(AiSettingsService as unknown as SettingsClass);
  const studioCopy = studioAssistantSettingsClass();
  if (studioCopy && studioCopy !== (AiSettingsService as unknown)) patch(studioCopy);
}
