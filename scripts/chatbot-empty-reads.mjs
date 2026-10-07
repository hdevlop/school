const normalize = (text) => String(text ?? '').normalize('NFKD').toLowerCase()
  .replace(/\p{M}|ـ/gu, '').replace(/[أإآ]/gu, 'ا')
  .replace(/[٠-٩]/gu, digit => String(digit.charCodeAt(0) - 0x0660));

// Narrow fixture policy, grounded in successful array reads rather than IDs or
// result character lengths. These wording heuristics still need reply review.
const unavailable = /\b(?:unavailable|not available|cannot access|unable to (?:access|retrieve)|try again|retry|check (?:the )?(?:settings|system))\b|\b(?:indisponibles?|inaccessible|reessayer|verifi\w* (?:les? |la )?(?:parametres|configuration|systeme))\b|\b(?:no (?:esta|estan) disponibles?|no puedo acceder|intentalo de nuevo|vuelve a intentarlo|compru\w* (?:la |el )?(?:configuracion|sistema))\b|غير\s+(?:متوفر|متاح)|تعذر\s+(?:الوصول|جلب)|التحقق\s+من\s+(?:اعدادات|النظام)|المحاولة\s+(?:في\s+)?وقت\s+لاحق|عاود\s+(?:حاول|جرب)/u;
const emptyStatement = {
  en: /\b(?:no|zero|0)\b[^.!?\n]{0,100}\brecords?\b|\b(?:no|none|nothing)\b[^.!?\n]{0,100}\b(?:recorded|registered|found)\b/u,
  fr: /\b(?:aucun\w*|zero|0|pas d[e'])\b[^.!?\n]{0,100}\b(?:enregistr\w*|trouv\w*|donnees)\b/u,
  es: /\b(?:no|ningun\w*|cero|0)\b[^.!?\n]{0,100}\b(?:registros?|registrad\w*|datos|encontrad\w*)\b/u,
  ar: /(?:لا\s+(?:توجد|يوجد)|لم\s+(?:اجد|نجد|يتم\s+العثور)|صفر|0)[^.؟!\n]{0,100}(?:سجل|سجلات|بيانات)|(?:سجلات|بيانات)[^.؟!\n]{0,100}فارغة/u,
  ary: /(?:ما\s*كاين(?:ين)?ش?|ما\s*لقي(?:ت|نا)|ما\s*لقاوش|حتى\s*شي)[^.؟!\n]{0,100}(?:سجل|سجلات|بيانات|تسجيل)/u,
};

/** Failure diagnostics contain indices/codes only; no text, names or rows. */
export function scoreEmptyReads(item, parsed, server) {
  const failures = [];
  let reviewRequired = false;
  if (!item.emptyResultTools?.length) return { failures, reviewRequired };
  const reads = parsed.tools.filter(tool => item.emptyResultTools.includes(tool.name) && tool.outcome === 'output');
  if (!reads.length) return { failures, reviewRequired };
  const text = normalize(parsed.text);
  for (const [index, tool] of reads.entries()) {
    const summary = tool.resultSummary;
    if (!server?.tools.some(read => read.name === tool.name && read.outcome === 'executed')
      || summary?.kind !== 'array' || !Number.isSafeInteger(summary.count) || summary.count < 0) {
      reviewRequired = true;
      continue;
    }
    if (summary.count > 0) continue;
    if (unavailable.test(text)) failures.push({ code: 'empty_read_unavailable', index });
    if (!emptyStatement[item.language]?.test(text)) failures.push({ code: 'empty_read_not_reported', index });
  }
  return { failures, reviewRequired };
}
