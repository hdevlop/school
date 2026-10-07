import { normalizeReplyText } from 'najm-chatbot';
import { schoolReplyLanguage } from './schoolReplyLanguage';

// Compatibility export; config and context use the same School profile.
export { schoolReplyLanguage } from './schoolReplyLanguage';

/** School policy only. Najm supplies the latest-message language instruction. */
export function schoolReplyContext(userText: string): string | null {
  const language = schoolReplyLanguage(userText);
  if (!language) return null;
  const text = normalizeReplyText(userText);
  const hints: string[] = [];
  if (language === 'fr' && /(?<!\p{L})(?:notes?|identifiants?)(?!\p{L})/u.test(text)) {
    hints.push('In French student lookup replies, use "identifiant de l’élève" or "code de l’élève", never the English label "student ID". Preserve actual stored names and codes unchanged.');
  }
  if (/pr[eé]sences?|absences?|attendance|حضور|غياب/u.test(text)) {
    const emptyAttendance = {
      fr: "Aucun enregistrement de présence ou d'absence n'a été trouvé pour cette date.",
      ar: 'لا توجد سجلات حضور أو غياب مسجلة لهذا التاريخ.',
      ary: 'ما كاين حتى شي سجل ديال الحضور ولا الغياب فهاد التاريخ.',
    }[language];
    hints.push(`For attendance read results: only a successful attendance tool returning [] establishes an empty attendance result, not an outage. Say "${emptyAttendance}" only for that attendance read's requested date and selected year. A successful [] from search_search_students means no matching student was found; it establishes nothing about attendance. If the student lookup has no match, report that lookup result and stop: do not claim no absence records, invent a date, infer attendance status, or try another person's records. Do not say a successful empty attendance read is unavailable, suggest checking settings/retrying, or infer anyone's attendance status. Only an actual tool error or denial justifies an error/refusal message. Attendance write requests still use the read-only refusal.`);
  }
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
