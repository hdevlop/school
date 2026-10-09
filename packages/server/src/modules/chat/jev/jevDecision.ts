import { INTENT_NAMES, JEV_MODEL, ACCEPTANCE_POLICIES, type JevDecision, type JevIntent } from './jevProtocol';

const isRecord = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const tokenCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
// API probabilities are rounded to two decimals in the retained probe. Nine
// individually rounded values can differ from one by at most 9 * 0.005.
const probabilitySumTolerance = INTENT_NAMES.length * 0.005 + 1e-12;
const modelMatches = (model: unknown) => typeof model === 'string' && (model === JEV_MODEL
  || model.startsWith(`${JEV_MODEL}-`) && /^\d{8}$/.test(model.slice(JEV_MODEL.length + 1)));

/** Reads one decisions response; anything malformed is an error sample, never a guess. */
export function parseDecision(body: any): JevDecision {
  const intent = body?.answers?.intent;
  const write = body?.answers?.is_write;
  const probabilities = intent?.probabilities;
  const usage = body?.usage;
  if (!isRecord(intent) || intent.type !== 'choice' || !INTENT_NAMES.includes(intent.choice)
    || !probability(intent.confidence) || !isRecord(write) || write.type !== 'noul' || !probability(write.noul)
    || !isRecord(probabilities) || Object.keys(probabilities).length !== INTENT_NAMES.length
    || !INTENT_NAMES.every(name => Object.hasOwn(probabilities, name) && probability(probabilities[name]))
    || !modelMatches(body?.model) || !isRecord(usage) || !tokenCount(usage.input_tokens)
    || !Number.isFinite(usage.cost) || usage.cost < 0
    || (Object.hasOwn(usage, 'output_tokens') && !tokenCount(usage.output_tokens))) {
    throw new Error('Malformed Jev decision');
  }
  const values = Object.values(probabilities) as number[];
  const topProbability = Math.max(...values);
  if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > probabilitySumTolerance
    || probabilities[intent.choice] + 1e-12 < topProbability) throw new Error('Malformed Jev decision');
  return {
    choice: intent.choice,
    confidence: intent.confidence,
    topProbability,
    probabilities: { ...probabilities } as Record<JevIntent, number>,
    writeProbability: write.noul,
    model: body.model,
    inputTokens: usage.input_tokens,
    costUsd: usage.cost,
  };
}

/**
 * Accepted means a deterministic reply would run instead of the model.
 * Guarded acceptance also requires the yes/no write answer to agree with the choice.
 */
export function accepts(decision: any, threshold: number, guarded = false, policy: string = 'full') {
  if (!probability(threshold) || !decision || !INTENT_NAMES.includes(decision.choice)
    || decision.choice === 'needs_llm' || !probability(decision.confidence)
    || !probability(decision.writeProbability) || decision.confidence < threshold
    || !Object.hasOwn(ACCEPTANCE_POLICIES, policy) || !ACCEPTANCE_POLICIES[policy as keyof typeof ACCEPTANCE_POLICIES].includes(decision.choice)) return false;
  return !guarded || (decision.choice === 'write_request') === (decision.writeProbability >= 0.5);
}
