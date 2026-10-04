/** Estimates only: SDK metadata cannot enforce or reconcile provider billing. */
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
