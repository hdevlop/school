import { randomUUID } from 'node:crypto';

/** Per-process identity ties cache resets to the diagnostics they affect. */
export const chatBenchmarkState = {
  instanceId: randomUUID(),
  resetCount: 0,
};

export function chatBenchmarkControlsEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
    && process.env.CHATBOT_BENCHMARK_CONTROLS === 'true';
}

export function chatBenchmarkSnapshot() {
  return { instanceId: chatBenchmarkState.instanceId, resetCount: chatBenchmarkState.resetCount };
}
