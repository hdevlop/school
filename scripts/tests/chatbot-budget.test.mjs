import { describe, expect, it } from 'bun:test';
import { createEstimatedBudget, summarizeUsage } from '../chatbot-budget.mjs';

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
