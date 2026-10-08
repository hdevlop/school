/** Versioned guards shared by runtime and offline studies. Historical exports stay frozen. */
import { accepts, type JevDecision } from './jevIntents';
import { queryVetoV5 } from './jevGuard/queryV5';
import { queryVetoV6 } from './jevGuard/queryV6';
export { queryVetoV6, explainQueryVetoV6 } from './jevGuard/queryV6';
export { queryVetoV5, explainQueryVetoV5 } from './jevGuard/queryV5';
export function acceptsWithQueryGuardV5(decision: JevDecision, query: string, threshold = 0.8, policy = 'core') {
  return accepts(decision, threshold, true, policy) && queryVetoV5(query, decision.choice) === null;
}
export function acceptsWithQueryGuardV6(decision: JevDecision, query: string, threshold = 0.8, policy = 'full') {
  return accepts(decision, threshold, true, policy) && queryVetoV6(query, decision.choice) === null;
}
