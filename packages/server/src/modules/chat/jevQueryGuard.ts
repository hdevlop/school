/** Current guard5 shared by runtime and offline study; earlier benchmark guards stay frozen. */
import { accepts, type JevDecision } from './jevIntents';
import { queryVetoV5 } from './jevGuard/queryV5';
export { queryVetoV5, explainQueryVetoV5 } from './jevGuard/queryV5';
export function acceptsWithQueryGuardV5(decision: JevDecision, query: string, threshold = 0.8, policy = 'core') {
  return accepts(decision, threshold, true, policy) && queryVetoV5(query, decision.choice) === null;
}
