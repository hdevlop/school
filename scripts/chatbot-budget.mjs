/** Estimates only: SDK metadata cannot enforce or reconcile provider billing. */
export function validateDeclaredPrices(value) {
  if (!value || value.provider !== 'openrouter' || typeof value.source !== 'string' || !value.source.trim()
    || typeof value.capturedAt !== 'string' || !Number.isFinite(Date.parse(value.capturedAt))
    || !value.models || Array.isArray(value.models) || typeof value.models !== 'object'
    || !Object.keys(value.models).length) throw new Error('Invalid declared pricing file');
  for (const [model, rates] of Object.entries(value.models)) {
    if (!/^[\w.:/-]{1,120}$/.test(model) || !rates
      || ![rates.inputUsdPerMillion, rates.outputUsdPerMillion]
        .every((rate) => typeof rate === 'number' && Number.isFinite(rate) && rate > 0 && rate <= 1000000)) {
      throw new Error('Invalid declared model rates');
    }
  }
  return value;
}

export function validatePricingMode(mode, hasPrices) {
  if (!['fallback', 'declared'].includes(mode) || (mode === 'declared' && !hasPrices)) {
    throw new Error('Use --pricing-mode=fallback or declared; declared requires --pricing-file and an estimated budget');
  }
}

/** A separate estimate; declared mode can price known SDK usage without mutating it. */
export function estimateDeclaredCost(metadata, model, prices, mode = 'fallback') {
  validatePricingMode(mode, Boolean(prices));
  if (!prices || (mode === 'fallback' && metadata?.pricingFound === true) || metadata?.model !== model
    || metadata?.provider !== prices.provider || !Object.hasOwn(prices.models, model)) return null;
  const { promptTokens, completionTokens, totalTokens } = metadata;
  if (![promptTokens, completionTokens, totalTokens].every((count) => Number.isSafeInteger(count) && count >= 0)
    || totalTokens !== promptTokens + completionTokens) return null;
  const rates = prices.models[model];
  return { source: 'declared-price-file', pricingMode: mode, model, provider: prices.provider,
    promptTokens, completionTokens, ...rates,
    totalCost: (promptTokens * rates.inputUsdPerMillion + completionTokens * rates.outputUsdPerMillion) / 1000000 };
}

export function summarizeDeclaredCosts(samples) {
  const rows = samples.filter((sample) => sample.declaredCost);
  return { requestsWithDeclaredCost: rows.length,
    estimatedCostUsd: rows.reduce((total, sample) => total + sample.declaredCost.totalCost, 0),
    note: 'Explicit price-file estimates, including known SDK usage when declared mode is selected; separate from unchanged SDK metadata and provider billing.' };
}

export function createEstimatedBudget(maxUsd, reserveUsd) {
  if (!Number.isFinite(maxUsd) || maxUsd <= 0 || !Number.isFinite(reserveUsd)
    || reserveUsd <= 0 || reserveUsd > maxUsd || maxUsd > 1000000) {
    throw new Error('Use positive --max-estimated-usd and --request-reserve-usd, with reserve <= budget');
  }
  const maximum = Math.floor(maxUsd * 1e9);
  const reservation = Math.ceil(reserveUsd * 1e9);
  let observed = 0;
  let reserved = 0;
  let unknown = 0;
  let settled = 0;
  let stoppedReason = null;
  const active = new Set();
  return {
    reserve(id) {
      if (active.has(id)) throw new Error('Duplicate budget reservation');
      if (stoppedReason || observed + reserved + reservation > maximum) {
        stoppedReason ??= 'insufficient_remaining_estimated_budget';
        throw new Error(`Estimated budget stopped: ${stoppedReason}`);
      }
      reserved += reservation;
      active.add(id);
    },
    settle(id, metadata) {
      if (!active.delete(id)) throw new Error('Missing budget reservation');
      settled++;
      if (metadata?.pricingFound !== true || !Number.isFinite(metadata?.totalCost) || metadata.totalCost < 0) {
        unknown++;
        // Retain the full reservation; zero would falsely imply a free failure.
        stoppedReason ??= 'unknown_request_cost';
      } else {
        reserved -= reservation;
        observed += Math.ceil(metadata.totalCost * 1e9);
        if (observed + reserved > maximum) stoppedReason ??= 'observed_estimate_exceeds_budget';
      }
    },
    get stopped() { return stoppedReason !== null; },
    snapshot() {
      return { maxEstimatedUsd: maxUsd, requestReserveUsd: reserveUsd,
        observedEstimatedUsd: observed / 1e9, reservedUsd: reserved / 1e9,
        requestsSettled: settled, requestsWithUnknownCost: unknown, inFlight: active.size, stoppedReason,
        note: 'Client estimate stop, not a billing cap. Reservations are user-declared estimates, not proven request bounds. In-flight requests finish; retries, missing usage and provider billing may exceed estimates. Use an isolated provider limit for a hard ceiling.' };
    },
  };
}

export function summarizeUsage(samples) {
  const withUsage = samples.filter((sample) => Number.isFinite(sample.metadata?.totalTokens));
  const withCost = samples.filter((sample) => sample.metadata?.pricingFound === true
    && Number.isFinite(sample.metadata?.totalCost) && sample.metadata.totalCost >= 0);
  const sumTokens = (key) => withUsage.reduce((total, sample) => total
    + (Number.isFinite(sample.metadata[key]) ? sample.metadata[key] : 0), 0);
  return {
    requestsWithUsage: withUsage.length,
    requestsWithKnownCost: withCost.length,
    requestsWithoutKnownCost: samples.length - withCost.length,
    promptTokens: sumTokens('promptTokens'), completionTokens: sumTokens('completionTokens'),
    estimatedCostUsd: withCost.reduce((total, sample) => total + sample.metadata.totalCost, 0),
    pricingFoundForAll: samples.length > 0 && withCost.length === samples.length,
    note: 'Totals include known values only, including failed attempts. Unknown cost is not zero; provider billing is authoritative.',
  };
}
