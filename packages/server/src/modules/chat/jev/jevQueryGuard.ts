/** Current query guard; its lower layers remain active runtime dependencies. */
import { accepts, type JevDecision } from './jevIntents';
import { queryVetoV6 } from './guards/queryV6';
export { queryVetoV6, explainQueryVetoV6 } from './guards/queryV6';

export function acceptsWithQueryGuardV6(decision: JevDecision, query: string, threshold = 0.8) {
  return accepts(decision, threshold, true) && queryVetoV6(query, decision.choice) === null;
}
