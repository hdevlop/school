import { detectMoroccanReplyLanguage, normalizeReplyText } from 'najm-chatbot';

// Compatibility export for School's corpus checks; Najm owns language selection.
export const schoolReplyLanguage = detectMoroccanReplyLanguage;

/** School policy only. Najm supplies the latest-message language instruction. */
export function schoolReplyContext(userText: string): string | null {
  if (!schoolReplyLanguage(userText)) return null;
  const text = normalizeReplyText(userText);
  const hints: string[] = [];
  if (/exam|امتحان|اختبار/u.test(text) && /prochain|prevu|prévu|upcoming|القادم|الجاي|جايين|مقبل/u.test(text)
    && !/\b(?:tous|toutes|all)\b|جميع|كامل|كل الامتحانات/u.test(text)) {
    hints.push('For this upcoming-exams request: show at most five chronological exam rows, then one short sentence that more are available. Do not print the full tool list or infer a remaining count.');
  }
  if (/combien|nombre|count|how many|كم|عدد|شحال/u.test(text)
    && /eleve|élève|تلميذ|تلاميذ|student/u.test(text) && /enseignant|professeur|استاذ|اساتذة|teacher/u.test(text)) {
    hints.push('This request asks for both counts: read both student and teacher counts, then give both in one visible sentence in the request reply language.');
  }
  return hints.join('\n') || null;
}
