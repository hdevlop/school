/** Current guard5 shared with School; historical guards remain unchanged. */
import { accepts } from './chatbot-jev.mjs';
import { queryVetoV5, acceptsWithQueryGuardV5 } from '@sms/server/jev-query-guard';
export { queryVetoV5, explainQueryVetoV5, acceptsWithQueryGuardV5 } from '@sms/server/jev-query-guard';
export const QUERY_GUARD_VERSION = 5;

export function compareQueryGuardV5(rows, { threshold = 0.8, policy = 'core' } = {}) {
  const before = rows.filter(row => accepts(row.decision, threshold, true, policy));
  const after = before.filter(row => acceptsWithQueryGuardV5(row.decision, row.item.query, threshold, policy));
  const declined = before.filter(row => !acceptsWithQueryGuardV5(row.decision, row.item.query, threshold, policy));
  const counts = subset => ({ samples: subset.length, questions: new Set(subset.map(row => row.item.id)).size,
    families: new Set(subset.map(row => row.item.familyId ?? row.item.id)).size,
    wrong: subset.filter(row => row.decision.choice !== row.item.intent).length });
  return { version: 5, before: counts(before), after: counts(after),
    preventedWrong: counts(declined.filter(row => row.decision.choice !== row.item.intent)),
    lostCorrect: counts(declined.filter(row => row.decision.choice === row.item.intent)),
    declined: declined.map(row => ({ id: row.item.id, repetition: row.repetition, label: row.item.intent,
      choice: row.decision.choice, reason: queryVetoV5(row.item.query, row.decision.choice) })),
    productionAcceptance: false, note: 'Post-result development replay; bounded phrase aliases, not a live or independent qualification.' };
}
