import { queryVetoV3 } from './queryV3';
import { explainQueryVetoV5 } from './queryV5';
import { examReplyKindV6 } from './examsV6';

/** Guard 6 adds only closed, unfiltered upcoming-exam requests to guard 5. */
export function explainQueryVetoV6(query: any, choice: any) {
  if (choice === 'class_list' && typeof query === 'string') {
    // A bounded class-name synonym; keep every qualifier for the independent
    // positive vocabulary and ambiguity veto. Never delete unknown words.
    const named = query.replace(/(?<!\p{L})سميات(?!\p{L})/gu, 'أسماء');
    const result = explainQueryVetoV5(named, choice);
    return { ...result, aliases: named === query ? result.aliases : [...result.aliases, 'class_names_darija'] };
  }
  if (choice !== 'upcoming_exams') return explainQueryVetoV5(query, choice);
  const veto = queryVetoV3(query, choice);
  if (veto) return { veto, aliases: [], unknownWords: [] };
  return { veto: typeof query === 'string' && examReplyKindV6(query) ? null : 'unsupported_exam_request',
    aliases: [], unknownWords: [] };
}
export const queryVetoV6 = (query: string, choice: string) => explainQueryVetoV6(query, choice).veto;
