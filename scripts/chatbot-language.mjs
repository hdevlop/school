/**
 * Deterministic language/register checks with exact stored-name exemptions.
 * Arabic script is reported as ar; the separate register field distinguishes
 * likely Darija. These heuristics do not replace native-speaker review.
 */

// Only words that belong to one of the three Latin-script languages. Words
// shared between them ("de", "que", "en", "no", "un", "a") are left out.
const WORDS = {
  en: ['the', 'is', 'are', 'was', 'and', 'of', 'to', 'for', 'you', 'your', 'there', 'this', 'that', 'with', 'not',
    'have', 'has', 'can', 'it', 'any', 'today', 'students', 'student', 'records', 'found', 'please', 'could',
    'would', 'what', 'which', 'enrolled', 'year', 'name', 'i', 'here', 'help', 'look', 'up', 'data', 'let', 'me', 'know', 'check', 'spelling'],
  fr: ['le', 'la', 'les', 'des', 'du', 'est', 'sont', 'et', 'il', 'elle', 'y', 'pour', 'pas', 'aucun', 'aucune',
    'vous', 'je', 'une', 'dans', 'sur', 'avec', 'élèves', 'élève', 'aujourd', 'peux', 'voulez', 'ce', 'cette',
    'qui', 'nom', 'année', 'scolaire', 'inscrits', 'été', 'trouvé', 'données', 'école', 'aider',
    'voici', 'prochains', 'examens', 'enseignants', 'professeurs', 'cinq', 'cinquante', 'cent'],
  es: ['el', 'los', 'las', 'hay', 'es', 'y', 'para', 'una', 'del', 'al', 'con', 'puedo', 'puedes', 'alumnos',
    'alumno', 'estudiantes', 'hoy', 'por', 'tu', 'su', 'este', 'esta', 'año', 'nombre', 'escolar', 'matriculados',
    'encontré', 'datos', 'escuela', 'ayudarte', 'registros', 'curso'],
};
const LOOKUP = new Map();
for (const [language, words] of Object.entries(WORDS)) {
  for (const word of words) LOOKUP.set(word, [...(LOOKUP.get(word) ?? []), language]);
}
// Letters only one of the three uses. "é" is shared by French and Spanish.
const LETTERS = { fr: /[èêçàùûîôœë]/gu, es: /[ñ¿¡áíóú]/gu };
// French elision: l'année, d'élèves, qu'il, n'a.
const ELISION = /\b(?:l|d|qu|n|j|c|s)['’]\p{L}/giu;

const MIN_LETTERS = 12;

/** @returns {'ar' | 'en' | 'fr' | 'es' | null} */
export function detectReplyLanguage(text, options = {}) {
  const result = analyzeReplyLanguage(text, options);
  return result.mixedLanguage ? null : result.language;
}

// Only exact, boundary-delimited values from a frozen fixture are exempt.
// Never exempt an arbitrary quoted phrase, parenthesis, table cell or list row.
export function maskStoredNames(text, names = []) {
  let plain = String(text ?? '').normalize('NFC').replace(/\s+/g, (space) => space.includes('\n') ? '\n' : ' ');
  for (const name of [...new Set(names)].sort((a, b) => b.length - a.length)) {
    const escaped = name.normalize('NFC').replace(/\s+/g, ' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    plain = plain.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), ' ');
  }
  return plain.replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+/g, ' ');
}

const DARIJA = /(?<!\p{L})[وفب]?(?:ديال(?:ي|ك|و|ها|نا|هم|كم)?|شحال|كاين(?:ين|اش|ش|ة)?|هاد|هاذ|بغيتي|بغيت|نقدر(?:ش)?|تقدر|واش|غادي|دابا|ماشي|ليك|ليكم|نعطيك|وريني|هادو(?:ما)?|هادي|لقيت(?:ش)?|عندنا|فالمدرسة)(?!\p{L})/u;
// Shared Arabic words such as نقدر and عندنا alone do not prove a switch
// from formal Arabic. Require an unmistakable Moroccan expression instead.
const MOROCCAN_REGISTER = /(?<!\p{L})[وفب]?(?:ديال(?:ي|ك|و|ها|نا|هم|كم)?|شحال|كاين(?:ين|اش|ش|ة)?|هاد|هاذ|بغيتي|بغيت|نقدرش|واش|غادي|دابا|ماشي|هادو(?:ما)?|هادي|لقيتش|فالمدرسة)(?!\p{L})/u;

/** Check all prose, including tables/parentheses, after exact stored-name masking. */
export function analyzeReplyLanguage(text, { storedNames = [], expectedLanguage = null } = {}) {
  const plain = maskStoredNames(text, storedNames);
  const letters = plain.match(/\p{L}/gu) ?? [];
  const arabicLetters = plain.match(/\p{Script=Arabic}/gu) ?? [];
  const scores = { en: 0, fr: 0, es: 0 };
  for (const token of plain.toLowerCase().split(/[^\p{L}]+/u)) {
    const languages = LOOKUP.get(token) ?? [];
    if (languages.length === 1) scores[languages[0]]++;
  }
  for (const [language, pattern] of Object.entries(LETTERS)) scores[language] += (plain.match(pattern) ?? []).length;
  scores.fr += (plain.match(ELISION) ?? []).length;
  const [best, second] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const arabic = arabicLetters.length >= MIN_LETTERS;
  const latin = best[1] >= 2;
  const unsupportedScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}]/u.test(plain);
  // Local fragments catch an appended foreign sentence even when a long reply
  // overwhelmingly uses the requested language. Two vocabulary hits suffice.
  const foreignLanguages = new Set();
  const expected = expectedLanguage === 'ary' ? 'ar' : expectedLanguage;
  for (const fragment of plain.split(/[\n.!?؟؛]+/u)) {
    const hits = { en: 0, fr: 0, es: 0 };
    for (const token of fragment.toLowerCase().split(/[^\p{L}]+/u)) {
      const languages = LOOKUP.get(token) ?? [];
      if (languages.length === 1) hits[languages[0]]++;
    }
    const ranked = Object.entries(hits).sort((a, b) => b[1] - a[1]);
    for (const [language, hits] of ranked) if (hits >= 2 && language !== expected) foreignLanguages.add(language);
  }
  if (arabic && expected && expected !== 'ar') foreignLanguages.add('ar');
  const mixedLanguage = unsupportedScript || (arabic && latin)
    || (best[1] >= 2 && second[1] >= 2);
  const language = arabic && !latin ? 'ar' : !arabic && latin && best[1] >= second[1] * 2 ? best[0] : null;
  const darija = DARIJA.test(plain);
  return { language: letters.length < MIN_LETTERS ? null : language,
    mixedLanguage, unsupportedScript, foreignLanguages: [...foreignLanguages],
    register: language === 'ar' ? darija ? 'ary' : 'ar' : null,
    wrongRegister: language === 'ar' && (expectedLanguage === 'ary' && !darija
      || expectedLanguage === 'ar' && MOROCCAN_REGISTER.test(plain)) };
}
