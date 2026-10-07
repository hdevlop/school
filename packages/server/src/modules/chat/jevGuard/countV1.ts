
/** Offline development prototype. Not connected to the live probe or School app. */

const COUNT_CHOICES = new Set(['student_count', 'teacher_count', 'student_and_teacher_count']);
const normalize = (text: string) => text.normalize('NFKD').toLowerCase().replace(/[\p{M}\u0640]/gu, '');
const NAME_LIST_SIGNALS = new Set([
  'name', 'names', 'named', 'surname', 'surnames', 'list', 'lists',
  'nom', 'noms', 'liste', 'listes', 'nominatif', 'nominative',
  'اسم', 'الاسم', 'أسماء', 'الأسماء', 'اسامي', 'الاسامي', 'سميات', 'السميات', 'سمياتهم', 'أساميهم', 'أسماؤهم',
  'لائحة', 'اللائحة', 'لوائح', 'اللوائح', 'قائمة', 'القائمة', 'قوائم', 'القوائم',
  'smiya', 'smia', 'smiyat', 'smiyate', 'smiyyat', 'smyat', 'smit', 'smiyathom', 'smyathom',
].map(normalize));

/** Explicit ambiguity makes a count abstain. Negated/quoted signals also abstain. */
export function countQueryVeto(query: any, choice: any) {
  if (!COUNT_CHOICES.has(choice)) return null;
  if (typeof query !== 'string' || !query.trim()) return 'missing_query';
  const words = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.some(word => NAME_LIST_SIGNALS.has(word)) ? 'name_or_list_signal' : null;
}
