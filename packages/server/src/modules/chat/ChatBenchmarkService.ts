import { EmbeddingService, KnowledgeContextProvider } from 'najm-rag';
import { Err, Service } from '../../najm';
import { chatBenchmarkControlsEnabled, chatBenchmarkSnapshot, chatBenchmarkState } from './ChatBenchmarkState';

@Service()
export class ChatBenchmarkService {
  constructor(private embeddings: EmbeddingService, private knowledge: KnowledgeContextProvider) {}

  status() {
    return { enabled: chatBenchmarkControlsEnabled(), ...chatBenchmarkSnapshot(),
      caches: ['query-embedding', 'knowledge-context'] as const };
  }

  resetCaches() {
    if (!chatBenchmarkControlsEnabled()) Err(404, 'Benchmark controls are disabled');
    this.embeddings.clearQueryCache();
    this.knowledge.clearCache();
    chatBenchmarkState.resetCount++;
    return this.status();
  }
}
