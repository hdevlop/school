/** Offline development prototype. Not connected to the live probe or School app. */
import { accepts } from './chatbot-jev.mjs';

export const COUNT_GUARD_VERSION = 1;
const COUNT_CHOICES = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const normalize = text => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const NAME_LIST_SIGNALS = new Set([
  'name', 'names', 'named', 'surname', 'surnames', 'list', 'lists',
  'nom', 'noms', 'liste', 'listes', 'nominatif', 'nominative',
  'اسم', 'الاسم', 'أسماء', 'الأسماء', 'اسامي', 'الاسامي', 'سميات', 'السميات', 'سمياتهم', 'أساميهم', 'أسماؤهم',
  'لائحة', 'اللائحة', 'لوائح', 'اللوائح', 'قائمة', 'القائمة', 'قوائم', 'القوائم',
  'smiya', 'smia', 'smiyat', 'smiyate', 'smiyyat', 'smyat', 'smit', 'smiyathom', 'smyathom',
].map(normalize));

/** Explicit ambiguity makes a count abstain. Negated/quoted signals also abstain. */
export function countQueryVeto(query, choice) {
  if (!COUNT_CHOICES.has(choice)) return null;
  if (typeof query !== 'string' || !query.trim()) return 'missing_query';
  const words = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.some(word => NAME_LIST_SIGNALS.has(word)) ? 'name_or_list_signal' : null;
}

export function acceptsWithCountGuard(decision, query, threshold, policy = 'core') {
  return accepts(decision, threshold, true, policy) && countQueryVeto(query, decision.choice) === null;
}

/** Saved decisions only: reports abstentions and correctness losses without retuning the base scorer. */
export function compareCountGuard(rows, { threshold = 0.8, policy = 'core' } = {}) {
  const before = rows.filter(row => accepts(row.decision, threshold, true, policy));
  const after = before.filter(row => acceptsWithCountGuard(row.decision, row.item.query, threshold, policy));
  const declined = before.filter(row => countQueryVeto(row.item.query, row.decision.choice) !== null);
  const counts = subset => ({ samples: subset.length, questions: new Set(subset.map(row => row.item.id)).size,
    wrongSamples: subset.filter(row => row.decision.choice !== row.item.intent).length,
    wrongQuestions: new Set(subset.filter(row => row.decision.choice !== row.item.intent).map(row => row.item.id)).size,
    acceptedFamilies: new Set(subset.map(row => row.item.familyId ?? row.item.id)).size });
  return { threshold, acceptancePolicy: policy, guardVersion: COUNT_GUARD_VERSION,
    before: counts(before), after: counts(after),
    preventedWrong: counts(declined.filter(row => row.decision.choice !== row.item.intent)),
    lostCorrect: counts(declined.filter(row => row.decision.choice === row.item.intent)),
    declined: declined.map(row => ({ id: row.item.id, repetition: row.repetition,
      label: row.item.intent, choice: row.decision.choice,
      previouslyCorrect: row.decision.choice === row.item.intent,
      reason: countQueryVeto(row.item.query, row.decision.choice) })),
    productionAcceptance: false,
    note: 'Post-result development replay on spent synthetic data, not fresh held-out acceptance. A veto abstains; it does not reclassify the query or verify the remaining decisions.' };
}
