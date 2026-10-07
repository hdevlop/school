import { describe, expect, it } from 'bun:test';
import { createEstimatedBudget, summarizeUsage, validateDeclaredPrices, validatePricingMode, estimateDeclaredCost, summarizeDeclaredCosts } from '../chatbot-budget.mjs';

describe('explicit benchmark prices', () => {
  const prices = { provider: 'openrouter', source: 'https://openrouter.ai/api/v1/models',
    capturedAt: '2026-10-04T18:00:00Z', models: { candidate: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.2 } } };
  const metadata = { provider: 'openrouter', model: 'candidate', pricingFound: false,
    promptTokens: 1000, completionTokens: 500, totalTokens: 1500, totalCost: 0 };

  it('prices measured tokens without mutating raw unknown-cost metadata', () => {
    validateDeclaredPrices(prices);
    const original = structuredClone(metadata);
    const cost = estimateDeclaredCost(metadata, 'candidate', prices);
    expect(cost.totalCost).toBeCloseTo(0.0002, 10);
    expect(metadata).toEqual(original);
    const rows = [{ metadata, declaredCost: cost }];
    expect(summarizeUsage(rows).requestsWithoutKnownCost).toBe(1);
    expect(summarizeDeclaredCosts(rows)).toMatchObject({ requestsWithDeclaredCost: 1, estimatedCostUsd: 0.0002 });
    const budget = createEstimatedBudget(1, 0.01);
    budget.reserve('candidate');
    budget.settle('candidate', { pricingFound: true, totalCost: cost.totalCost });
    expect(budget.snapshot()).toMatchObject({ reservedUsd: 0, requestsWithUnknownCost: 0, stoppedReason: null });
  });

  it('refuses absent, mismatched or incomplete usage and leaves installed estimates alone', () => {
    for (const value of [null, {}, { ...metadata, model: 'other' }, { ...metadata, provider: 'other' },
      { ...metadata, pricingFound: true }, { ...metadata, completionTokens: undefined },
      { ...metadata, promptTokens: -1 }, { ...metadata, completionTokens: NaN },
      { ...metadata, totalTokens: 1501 }, { ...metadata, promptTokens: 1.5 }]) {
      expect(estimateDeclaredCost(value, 'candidate', prices)).toBeNull();
    }
    expect(estimateDeclaredCost(metadata, 'missing', prices)).toBeNull();
    expect(estimateDeclaredCost(metadata, 'candidate', null)).toBeNull();
  });

  it('rejects invalid rates or missing provenance before network calls', () => {
    for (const value of [null, {}, { ...prices, provider: 'other' }, { ...prices, source: '' },
      { ...prices, capturedAt: 'invalid' }, { ...prices, models: {} }, { ...prices, models: [] },
      ...[0, -1, Infinity, '0.1', 1000001].map((rate) => ({ ...prices,
        models: { candidate: { inputUsdPerMillion: rate, outputUsdPerMillion: 0.2 } } }))]) {
      expect(() => validateDeclaredPrices(value)).toThrow();
    }
  });

  it('explicitly reprices known SDK usage while preserving raw estimates and counting failed attempts', () => {
    const raw = { ...metadata, pricingFound: true, totalCost: 0.00001 };
    const before = structuredClone(raw);
    const declaredCost = estimateDeclaredCost(raw, 'candidate', prices, 'declared');
    expect(declaredCost).toMatchObject({ totalCost: 0.0002, pricingMode: 'declared' });
    expect(raw).toEqual(before);
    const samples = [{ outcome: 'stream_error', metadata: raw, declaredCost }];
    expect(summarizeUsage(samples).estimatedCostUsd).toBe(0.00001);
    expect(summarizeDeclaredCosts(samples).estimatedCostUsd).toBe(0.0002);
    for (const invalid of [null, { ...raw, model: 'other' }, { ...raw, provider: 'other' },
      { ...raw, totalTokens: 1499 }, { ...raw, completionTokens: undefined }]) {
      expect(estimateDeclaredCost(invalid, 'candidate', prices, 'declared')).toBeNull();
    }
    expect(() => validatePricingMode('declared', false)).toThrow();
    expect(() => validatePricingMode('unknown', true)).toThrow();
  });
});

describe('estimated benchmark budget', () => {
  it('counts unknown and failed-attempt usage without claiming complete pricing coverage', () => {
    expect(summarizeUsage([]).pricingFoundForAll).toBe(false);
    expect(summarizeUsage([
      { outcome: 'stream_error', metadata: { totalTokens: 5, promptTokens: 2, completionTokens: 3, totalCost: 0.01, pricingFound: true } },
      { metadata: { totalTokens: 10, promptTokens: 10, totalCost: null, pricingFound: false } },
      { metadata: null },
    ])).toMatchObject({ requestsWithUsage: 2, requestsWithKnownCost: 1, requestsWithoutKnownCost: 2,
      estimatedCostUsd: 0.01, promptTokens: 12, completionTokens: 3, pricingFoundForAll: false });
  });
  it('reserves concurrency slots atomically and stops before another request fits', () => {
    const budget = createEstimatedBudget(0.02, 0.01);
    budget.reserve('a');
    budget.reserve('b');
    expect(() => budget.reserve('c')).toThrow('insufficient_remaining_estimated_budget');
    budget.settle('b', { pricingFound: true, totalCost: 0.004 });
    budget.settle('a', { pricingFound: true, totalCost: 0.005 });
    expect(budget.snapshot()).toMatchObject({ observedEstimatedUsd: 0.009, reservedUsd: 0, inFlight: 0, requestsSettled: 2 });
    expect(() => budget.reserve('d')).toThrow();
  });

  it('refunds unused reservations and admits a request that exactly fits', () => {
    const budget = createEstimatedBudget(0.03, 0.01);
    for (const id of ['a', 'b', 'c']) budget.reserve(id);
    budget.settle('b', { pricingFound: true, totalCost: 0 });
    budget.reserve('d');
    expect(budget.snapshot()).toMatchObject({ reservedUsd: 0.03, inFlight: 3, stoppedReason: null });
  });

  it('retains an unknown request reservation and stops instead of claiming zero spend', () => {
    for (const metadata of [null, {}, { pricingFound: false, totalCost: 0 },
      { pricingFound: true, totalCost: NaN }, { pricingFound: true, totalCost: -1 }]) {
      const budget = createEstimatedBudget(1, 0.1);
      budget.reserve('a');
      budget.settle('a', metadata);
      expect(budget.snapshot()).toMatchObject({ requestsWithUnknownCost: 1, reservedUsd: 0.1,
        inFlight: 0, stoppedReason: 'unknown_request_cost' });
      expect(() => budget.reserve('b')).toThrow();
    }
  });

  it('records estimates exceeding the reservation or budget honestly', () => {
    const budget = createEstimatedBudget(0.01, 0.01);
    budget.reserve('a');
    budget.settle('a', { pricingFound: true, totalCost: 0.02 });
    expect(budget.snapshot()).toMatchObject({ observedEstimatedUsd: 0.02, stoppedReason: 'observed_estimate_exceeds_budget' });
    expect(() => budget.reserve('b')).toThrow();
  });

  it('rejects invalid options and duplicate settlement', () => {
    for (const [max, reserve] of [[0, 1], [1, 0], [1, 2], [NaN, 1], [Infinity, 1]]) {
      expect(() => createEstimatedBudget(max, reserve)).toThrow();
    }
    const budget = createEstimatedBudget(1, 0.1);
    budget.reserve('a');
    expect(() => budget.reserve('a')).toThrow('Duplicate');
    budget.settle('a', { pricingFound: true, totalCost: 0 });
    expect(() => budget.settle('a', {})).toThrow('Missing');
  });
});
