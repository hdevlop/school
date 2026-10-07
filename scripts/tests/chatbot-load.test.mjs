import { describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runLoad, summarizeLoad, validateCorrelation, validateLoadOptions } from '../chatbot-load.mjs';

describe('bounded benchmark load', () => {
  it('stops scheduling after a failure and drains work already in flight', async () => {
    const started = [];
    const finished = [];
    let release;
    const pending = new Promise((done) => { release = done; });
    const run = runLoad([0, 1, 2, 3], 2, async (job) => {
      started.push(job);
      if (job === 0) throw new Error('worker failed');
      await pending;
      finished.push(job);
    });
    await Promise.resolve();
    expect(started).toEqual([0, 1]);
    release();
    await expect(run).rejects.toThrow('worker failed');
    expect(finished).toEqual([1]);
    expect(started).toEqual([0, 1]);
  });

  it('rejects unsafe modes and discards both request and embedding cross-talk', () => {
    expect(() => validateLoadOptions({ concurrency: 3 })).toThrow();
    expect(() => validateLoadOptions({ concurrency: 2, compareModel: 'other' })).toThrow();
    expect(() => validateLoadOptions({ concurrency: 4, transportProbe: true })).toThrow();
    expect(validateCorrelation('a', { correlationId: 'b' })).toBe('request_id_mismatch');
    expect(validateCorrelation('a', { correlationId: 'a', embeddings: [{ correlationId: 'b' }] }))
      .toBe('embedding_id_mismatch');
    expect(validateCorrelation('a', { correlationId: 'a', embeddings: [] })).toBeNull();
    expect(summarizeLoad([{ requestId: 'a', httpStatus: 429 }, { requestId: 'a', correlationError: 'request_id_mismatch' }], 2))
      .toMatchObject({ duplicateRequestIds: 1, http429: 1, requestsWithoutDiagnostics: 2, correlationErrors: 1 });
  });
});

// Execute the actual CLI against an ephemeral loopback server, never a provider.
async function withMock(run) {
  const directory = await mkdtemp(join(tmpdir(), 'school-chat-load-'));
  const casesPath = join(directory, 'cases.json');
  await Bun.write(casesPath, JSON.stringify({ role: 'admin', academicYear: '2026-2027', cases:
    Array.from({ length: 6 }, (_, index) => ({ id: `case-${index}`, language: 'en', kind: 'small-talk',
      query: `Hello ${index}`, replyLanguage: null })) }));
  const records = new Map();
  const state = { chats: 0, active: 0, peak: 0, puts: 0, requests: 0, fault: false, model: 'mock-model',
    cost: 0.001, unknownCost: false, resets: 0, cacheEnabled: true, cacheHit: false };
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, async fetch(request) {
    state.requests++;
    const path = new URL(request.url).pathname;
    if (path === '/api/chat-benchmark/provider-usage') {
      return Response.json({ data: { selectedKeyVerified: true, matchesEnvironmentKey: true,
        usage: state.chats * 0.005, limit: 50, limitRemaining: 50 - state.chats * 0.005 } });
    }
    if (path === '/api/chat-benchmark/status' || path === '/api/chat-benchmark/reset-caches') {
      if (request.method === 'POST') state.resets++;
      return Response.json({ data: { enabled: state.cacheEnabled, instanceId: 'mock-instance',
        resetCount: state.resets, caches: ['query-embedding', 'knowledge-context'] } });
    }
    if (path === '/api/health/status') return Response.json({ data: { status: 'healthy' } });
    if (path === '/api/auth/login') return Response.json({ data: { accessToken: 'mock-token' } });
    if (path === '/api/ai-settings') {
      if (request.method === 'PUT') {
        state.puts++;
        state.model = (await request.json()).model;
      }
      return Response.json({ data: { provider: state.provider ?? 'mock', model: state.model, isEnabled: true, hasKey: true } });
    }
    if (path.startsWith('/api/chat-diagnostics/')) {
      const id = decodeURIComponent(path.split('/').at(-1));
      return Response.json({ data: records.get(id) });
    }
    if (path !== '/api/chat') return new Response(null, { status: 404 });
    const body = await request.json();
    const id = request.headers.get('x-request-id');
    if (body.id !== id) throw new Error('Request and session ID differ');
    const ordinal = state.chats++;
    const requestModel = state.model;
    state.active++;
    state.peak = Math.max(state.peak, state.active);
    // Reverse completion order within a worker group.
    await Bun.sleep(80 + (3 - ordinal % 4) * 20);
    state.active--;
    const embedding = { correlationId: state.fault && ordinal === 2 ? 'wrong-embedding' : id,
      cache: state.cacheHit ? 'hit' : 'miss', purpose: 'query', operation: 'tool-routing', outcome: 'completed', durationMs: 10,
      attempts: [{ outcome: 'completed', durationMs: 10 }] };
    records.set(id, { correlationId: state.fault && ordinal === 1 ? 'wrong-chat' : id,
      outcome: 'completed', provider: state.wrongProvider ? 'other' : state.provider ?? 'mock',
      model: state.wrongModel ? 'wrong-model' : requestModel, spans: { prepareMs: 10 },
      benchmark: { instanceId: 'mock-instance', resetCount: state.resets },
      marks: { firstTextMs: 20, finishMs: 30 }, tools: [], steps: [], embeddings: [embedding] });
    if (state.fault && ordinal === 0) return new Response(null, { status: 429 });
    const events = [{ type: 'text-delta', delta: 'Hello! How can I help you today?' },
      { type: 'finish', finishReason: 'stop', messageMetadata: state.unknownCost ? null
        : state.unpricedCandidate && requestModel === 'mock-candidate'
          ? { totalTokens: 1500, promptTokens: 1000, completionTokens: 500,
            pricingFound: false, totalCost: 0, provider: 'openrouter', model: requestModel }
        : { totalTokens: 10, promptTokens: 5, completionTokens: 5, pricingFound: true, totalCost: state.cost,
          provider: state.provider ?? 'mock', model: requestModel } }, '[DONE]'];
    return new Response(events.map((event) => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`).join(''), {
      headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
    });
  } });
  let serial = 0;
  const cli = async (...options) => {
    const output = join(directory, `report-${serial++}.json`);
    const process = Bun.spawn([Bun.which('bun'), resolve('scripts/chatbot-benchmark.mjs'),
      `--base-url=http://127.0.0.1:${server.port}`, `--cases=${casesPath}`, `--output=${output}`, ...options], {
      env: { ...globalThis.process.env, ADMIN_EMAIL: 'mock@example.invalid', ADMIN_PASSWORD: 'mock-password' },
      stdout: 'pipe', stderr: 'pipe',
    });
    const [exitCode, stdout, stderr] = await Promise.all([process.exited,
      new Response(process.stdout).text(), new Response(process.stderr).text()]);
    return { exitCode, stdout, stderr, report: await Bun.file(output).exists() ? await Bun.file(output).json() : null };
  };
  try { await run({ cli, state, directory }); } finally { server.stop(true); await rm(directory, { recursive: true, force: true }); }
}

describe('benchmark CLI load integration', () => {
  it('budgets from declared rates despite known SDK prices and stops on missing or mismatched evidence', async () => {
    await withMock(async ({ cli, state, directory }) => {
      state.provider = 'openrouter';
      const pricesPath = join(directory, 'prices.json');
      await Bun.write(pricesPath, JSON.stringify({ provider: 'openrouter', source: 'mock endpoint catalog',
        capturedAt: '2026-10-05T00:00:00Z', models: { 'mock-model': { inputUsdPerMillion: 500, outputUsdPerMillion: 500 } } }));
      const options = ['--limit=2', '--max-requests=2', '--max-estimated-usd=0.02', '--request-reserve-usd=0.01',
        '--pricing-mode=declared', '--capture-provider-usage', `--pricing-file=${pricesPath}`];
      const result = await cli(...options);
      expect(result.exitCode).toBe(0);
      expect(result.report.estimatedBudget.observedEstimatedUsd).toBe(0.01);
      expect(result.report.summary.usage.estimatedCostUsd).toBe(0.002);
      expect(result.report.summary.declaredCosts.estimatedCostUsd).toBe(0.01);
      expect(result.report.samples[0].metadata.totalCost).toBe(0.001);
      expect(result.report.providerUsageDelta).toMatchObject({ observedUsd: 0.01, matchesEnvironmentKeyAtBothReads: true });
      const stopped = await cli(...options.map(option => option.startsWith('--max-estimated-usd=')
        ? '--max-estimated-usd=0.01' : option.startsWith('--request-reserve-usd=') ? '--request-reserve-usd=0.006' : option));
      expect(stopped.report.samples).toHaveLength(1);
      expect(stopped.report.estimatedBudget.stoppedReason).toBe('insufficient_remaining_estimated_budget');
      for (const fault of ['unknownCost', 'wrongProvider', 'wrongModel']) {
        state[fault] = true;
        const failed = await cli(...options);
        expect(failed.exitCode).toBe(1);
        expect(failed.report.samples).toHaveLength(1);
        expect(failed.report.estimatedBudget.stoppedReason).toBe('unknown_request_cost');
        state[fault] = false;
      }
      expect(state.puts).toBe(0);
    });
  });
  it('uses declared prices for matched candidate usage, preserves unknown metadata and restores settings', async () => {
    await withMock(async ({ cli, state, directory }) => {
      state.unpricedCandidate = true;
      const pricesPath = join(directory, 'prices.json');
      await Bun.write(pricesPath, JSON.stringify({ provider: 'openrouter', source: 'https://openrouter.ai/api/v1/models',
        capturedAt: '2026-10-04T18:00:00Z', models: { 'mock-candidate': { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.2 } } }));
      const result = await cli('--limit=2', '--compare-model=mock-candidate', '--max-requests=4',
        '--max-estimated-usd=0.1', '--request-reserve-usd=0.01', `--pricing-file=${pricesPath}`);
      expect(result.exitCode).toBe(0);
      expect(state.model).toBe('mock-model');
      expect(result.report.declaredPricing.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.report.summary.comparison.candidate.declaredCosts).toMatchObject({ requestsWithDeclaredCost: 2, estimatedCostUsd: 0.0004 });
      expect(result.report.summary.comparison.candidate.usage.requestsWithoutKnownCost).toBe(2);
      expect(result.report.samples.filter((sample) => sample.variant === 'candidate')
        .every((sample) => sample.metadata.pricingFound === false && sample.metadata.totalCost === 0)).toBe(true);
      expect(result.report.estimatedBudget).toMatchObject({ observedEstimatedUsd: 0.0024, requestsWithUnknownCost: 0, stoppedReason: null });
      state.wrongModel = true;
      const mismatch = await cli('--limit=1', '--compare-model=mock-candidate', '--max-requests=2',
        '--max-estimated-usd=0.1', '--request-reserve-usd=0.01', `--pricing-file=${pricesPath}`);
      expect(mismatch.exitCode).toBe(1);
      expect(mismatch.report.samples).toHaveLength(1);
      expect(mismatch.report.samples[0].declaredCost).toBeUndefined();
      expect(mismatch.report.estimatedBudget.stoppedReason).toBe('unknown_request_cost');
      expect(state.model).toBe('mock-model');
    });
  });
  it('resets before each serial chat and verifies actual fresh routing spans', async () => {
    await withMock(async ({ cli, state }) => {
      const result = await cli('--cache-mode=fresh', '--max-requests=6');
      expect(result.exitCode).toBe(0);
      expect(state.resets).toBe(6);
      expect(result.report.samples.map((sample) => sample.cacheCondition.reset.resetCount)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.report.summary.cacheConditions).toMatchObject({ verifiedFresh: 6, failedVerification: 0 });
    });
  }, 10000);

  it('rejects disabled controls without chat calls and does not accept a routing cache hit as fresh', async () => {
    await withMock(async ({ cli, state }) => {
      state.cacheEnabled = false;
      const blocked = await cli('--cache-mode=fresh', '--max-requests=6');
      expect(blocked.exitCode).toBe(1);
      expect(state.chats).toBe(0);
      expect(state.resets).toBe(0);
      state.cacheEnabled = true;
      state.cacheHit = true;
      const failed = await cli('--cache-mode=fresh', '--max-requests=6');
      expect(failed.exitCode).toBe(1);
      expect(state.chats).toBe(1);
      expect(state.resets).toBe(1);
      expect(failed.report.samples[0].cacheCondition.verified).toBe(false);
    });
  });

  it('fresh preflight checks controls without resetting them or sending chats', async () => {
    await withMock(async ({ cli, state }) => {
      expect((await cli('--preflight', '--cache-mode=fresh')).exitCode).toBe(0);
      expect(state.chats).toBe(0);
      expect(state.resets).toBe(0);
    });
  });
  it('preflights without chats or model writes, even with no request budget', async () => {
    await withMock(async ({ cli, state }) => {
      const result = await cli('--preflight');
      expect(result.exitCode).toBe(0);
      expect(result.report).toMatchObject({ outcome: 'preflight_ok', plannedRequests: 0,
        readyForChat: true, samples: [], conditions: { applicationCaches: 'uncontrolled', embeddingModelResidency: 'unverified' } });
      expect(Object.values(result.report.configSourceSha256).every((hash) => /^[a-f0-9]{64}$/.test(hash))).toBe(true);
      expect(state.requests).toBe(3);
      expect(state.chats).toBe(0);
      expect(state.puts).toBe(0);
    });
  });

  it('stops concurrent dispatch using reservations and drains streams within their declared estimate', async () => {
    await withMock(async ({ cli, state }) => {
      const result = await cli('--concurrency=4', '--max-requests=6', '--max-estimated-usd=0.002', '--request-reserve-usd=0.001');
      expect(result.exitCode).toBe(1);
      expect(state.chats).toBe(2);
      expect(result.report.samples).toHaveLength(2);
      expect(result.report.estimatedBudget).toMatchObject({ observedEstimatedUsd: 0.002, reservedUsd: 0,
        inFlight: 0, requestsSettled: 2, stoppedReason: 'insufficient_remaining_estimated_budget' });
      expect(result.report.outcome).toBe('interrupted');
    });
  });

  it('stops on unknown cost and still restores comparison model settings', async () => {
    await withMock(async ({ cli, state }) => {
      state.unknownCost = true;
      const result = await cli('--compare-model=mock-candidate', '--max-requests=12',
        '--max-estimated-usd=0.01', '--request-reserve-usd=0.001');
      expect(result.exitCode).toBe(1);
      expect(state.chats).toBe(1);
      expect(state.model).toBe('mock-model');
      expect(result.report.samples).toHaveLength(1);
      expect(result.report.estimatedBudget).toMatchObject({ requestsWithUnknownCost: 1, reservedUsd: 0.001,
        stoppedReason: 'unknown_request_cost', inFlight: 0 });
    });
  });

  it('runs 2/4 overlapping streams within budget with stable order and correlated embeddings', async () => {
    await withMock(async ({ cli, state }) => {
      for (const concurrency of [2, 4]) {
        state.peak = 0;
        const result = await cli(`--concurrency=${concurrency}`, '--repeat=2', '--max-requests=12');
        expect(result.exitCode).toBe(0);
        expect(result.report.outcome).toBe('passed');
        expect(state.peak).toBe(concurrency);
        expect(result.report.samples).toHaveLength(12);
        expect(result.report.samples.map((sample) => sample.scheduleIndex)).toEqual(Array.from({ length: 12 }, (_, i) => i));
        expect(result.report.summary.load).toMatchObject({ concurrency, duplicateRequestIds: 0,
          requestsWithVerifiedDiagnostics: 12, requestsWithoutDiagnostics: 0, correlationErrors: 0 });
        expect(result.report.summary.embeddings).toMatchObject({ logicalCalls: 12, providerAttempts: 12 });
        expect(new Set(result.report.samples.map((sample) => sample.sessionId)).size).toBe(12);
        expect(result.report.samples.at(-1).clientQueueMs).toBeGreaterThan(0);
      }
      expect(state.chats).toBe(24);
      expect(state.puts).toBe(0);
    });
  }, 20000);

  it('rejects parallel shared-model mutations and insufficient budgets before any network call', async () => {
    await withMock(async ({ cli, state }) => {
      for (const options of [
        ['--concurrency=2', '--compare-model=other', '--max-requests=12'],
        ['--concurrency=4', '--transport-probe', '--max-requests=1'],
        ['--concurrency=3', '--max-requests=6'],
        ['--concurrency=4', '--max-requests=5'],
        ['--max-estimated-usd=0.01', '--max-requests=6'],
        ['--request-reserve-usd=0.001', '--max-requests=6'],
        ['--preflight', '--compare-model=other'],
        ['--cache-mode=fresh', '--concurrency=2', '--max-requests=6'],
        ['--cache-mode=fresh', '--transport-probe', '--max-requests=1'],
        ['--pricing-mode=declared', '--max-requests=6'],
        ['--pricing-mode=unknown', '--max-requests=6'],
      ]) {
        expect((await cli(...options)).exitCode).toBe(1);
      }
      expect(state.requests).toBe(0);
    });
  });

  it('preserves serial interleaving and restores the saved model', async () => {
    await withMock(async ({ cli, state }) => {
      const result = await cli('--limit=2', '--compare-model=mock-candidate',
        '--baseline-model=mock-baseline', '--max-requests=4');
      expect(result.exitCode).toBe(0);
      expect(state.peak).toBe(1);
      expect(state.chats).toBe(4);
      expect(state.model).toBe('mock-model');
      expect(result.report.samples.map((sample) => sample.variant)).toEqual(['candidate', 'baseline', 'baseline', 'candidate']);
      expect(result.report.summary.comparison.baseline.requests).toBe(2);
      expect(result.report.summary.comparison.candidate.requests).toBe(2);
      expect(result.report.summary.load.correlationErrors).toBe(0);
    });
  }, 10000);

  it('counts HTTP failures and rejects mismatched records without contaminating summaries', async () => {
    await withMock(async ({ cli, state }) => {
      state.fault = true;
      const result = await cli('--concurrency=4', '--max-requests=6');
      expect(result.exitCode).toBe(1);
      expect(result.report.outcome).toBe('failures');
      expect(result.report.summary.byOutcome).toEqual({ http_error: 1, completed: 5 });
      expect(result.report.summary.load).toMatchObject({ http429: 1, correlationErrors: 2,
        requestsWithVerifiedDiagnostics: 4, requestsWithoutDiagnostics: 2 });
      expect(result.report.samples[1].server).toBeNull();
      expect(result.report.samples[2].server).toBeNull();
      expect(result.report.summary.embeddings.logicalCalls).toBe(4);
    });
  }, 10000);
});
