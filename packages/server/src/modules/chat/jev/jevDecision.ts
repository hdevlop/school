import { INTENT_NAMES, JEV_MODEL, type JevDecision, type JevIntent } from './jevIntents';

const isRecord = (value: unknown): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
const probability = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
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
  if (!isRecord(intent) || intent.type !== 'choice' || !INTENT_NAMES.includes(intent.choice)
    || !probability(intent.confidence) || !isRecord(write) || write.type !== 'noul' || !probability(write.noul)
    || !isRecord(probabilities) || Object.keys(probabilities).length !== INTENT_NAMES.length
    || !INTENT_NAMES.every(name => Object.hasOwn(probabilities, name) && probability(probabilities[name]))
    || !modelMatches(body?.model)) {
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
  };
}

/**
 * Accepted means a deterministic reply would run instead of the model.
 * Guarded acceptance also requires the yes/no write answer to agree with the choice.
 */
export function accepts(decision: any, threshold: number, guarded = false) {
  if (!probability(threshold) || !decision || !INTENT_NAMES.includes(decision.choice)
    || decision.choice === 'needs_llm' || !probability(decision.confidence)
    || !probability(decision.writeProbability) || decision.confidence < threshold) return false;
  return !guarded || (decision.choice === 'write_request') === (decision.writeProbability >= 0.5);
}
