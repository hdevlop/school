import { EmbeddingService, KnowledgeContextProvider } from 'najm-rag';
import { AiSettingsService } from 'najm-chatbot';
import { Err, I18n, Service } from '../../najm';
import { chatBenchmarkControlsEnabled, chatBenchmarkSnapshot, chatBenchmarkState } from './ChatBenchmarkState';

@Service()
export class ChatBenchmarkService {
  @I18n('chatBenchmark.errors') private bt!: (key: string) => string;

  constructor(private embeddings: EmbeddingService, private knowledge: KnowledgeContextProvider,
    private settings: AiSettingsService) {}

  status() {
    return { enabled: chatBenchmarkControlsEnabled(), ...chatBenchmarkSnapshot(),
      caches: ['query-embedding', 'knowledge-context'] as const };
  }

  resetCaches() {
    if (!chatBenchmarkControlsEnabled()) Err(404, this.bt('controlsDisabled'));
    this.embeddings.clearQueryCache();
    this.knowledge.clearCache();
    chatBenchmarkState.resetCount++;
    return this.status();
  }

  /** Read the selected key's ledger in-process; credentials never leave this service's response. */
  async providerUsage() {
    if (!chatBenchmarkControlsEnabled()) Err(404, this.bt('controlsDisabled'));
    const settings = await this.settings.getInternal();
    if (settings?.provider !== 'openrouter' || !settings.apiKey
      || (settings.baseUrl && settings.baseUrl !== 'https://openrouter.ai/api/v1')) {
      Err(400, this.bt('providerUsageUnsupported'));
    }
    let data: Record<string, unknown>;
    try {
      const response = await fetch('https://openrouter.ai/api/v1/key', {
        headers: { authorization: `Bearer ${settings.apiKey}` },
        redirect: 'error', signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Provider rejected usage read');
      data = (await response.json()).data;
      const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
      if (!data || !finite(data.usage) || (data.usage as number) < 0
        || (data.limit !== null && (!finite(data.limit) || (data.limit as number) < 0))
        || (data.limit_remaining !== null && !finite(data.limit_remaining))) {
        throw new Error('Invalid provider usage response');
      }
    } catch {
      // Neither provider bodies nor exceptions containing request headers are returned.
      Err(502, this.bt('providerUsageFailed'));
    }
    const environmentKey = process.env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_KEY?.trim();
    return { capturedAt: new Date().toISOString(), source: 'https://openrouter.ai/api/v1/key',
      credentialSource: 'selected School provider key', selectedKeyVerified: true,
      matchesEnvironmentKey: environmentKey ? environmentKey === settings.apiKey : null,
      provider: settings.provider, model: settings.model,
      usage: data.usage, limit: data.limit, limitRemaining: data.limit_remaining };
  }
}
