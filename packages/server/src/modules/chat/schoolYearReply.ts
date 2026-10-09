import { canUseOtherAcademicYears } from '@sms/contracts/academic-years';
import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';

/** Uses the resolved request year; the shared year boundary still owns access. */
export function schoolYearReply(query: string, language: ReplyLanguage, selectedYear?: string, role?: string): ReplyTemplate | null {
  if (!selectedYear || !role) return null;
  const text = normalizeReplyText(query).replace(/[‐‑–—]/gu, '-');
  // A date, code or arbitrary range alone is not an academic-year request.
  if (!/(?<![\p{L}\p{N}])(?:academic|year|annee|année|scolaire|السنة|السنه|سنة|سنه|العام|عام|l3am)(?![\p{L}\p{N}])/u.test(text)) return null;
  const years = [...text.matchAll(/(?<![\p{L}\p{N}])(20\d{2})\s*[-/]\s*(20\d{2})(?![\p{L}\p{N}])/gu)]
    .filter(match => Number(match[2]) === Number(match[1]) + 1)
    .map(match => `${match[1]}-${match[2]}`);
  if (!years.some(year => year !== selectedYear)) return null;
  const maySwitch = canUseOtherAcademicYears(role);
  const reply = language === 'ary'
    ? maySwitch ? 'باش تشوف سجلات عام آخر، اختار داك العام الدراسي فلوحة التحكم ومن بعد عاود سولني.'
      : `هاد الحساب يقدر يشوف غير العام الدراسي الحالي ${selectedYear}. ما نقدرش نجيب سجلات عام آخر هنا.`
    : language === 'ar' ? maySwitch ? 'لعرض سجلات سنة أخرى، اختر تلك السنة الدراسية في لوحة التحكم ثم أعد السؤال.'
      : `هذا الحساب يمكنه الوصول إلى السنة الدراسية الحالية ${selectedYear} فقط. لا يمكنني عرض سجلات سنة أخرى هنا.`
      : maySwitch ? 'Sélectionnez cette autre année scolaire dans le tableau de bord, puis posez à nouveau la question.'
        : `Ce compte peut consulter uniquement l'année scolaire active ${selectedYear}. Je ne peux pas afficher les dossiers d'une autre année ici.`;
  return { label: 'school:explicit-other-year', text: reply };
}
