/**
 * Detects which of School's four languages a chat reply is written in, for the
 * latency benchmark's automatic checks. A heuristic, not a classifier: it
 * returns null when a reply is too short or too mixed to call, and the check
 * only fails on a confident, different answer. Darija and Modern Standard
 * Arabic are both reported as "ar".
 */

// Only words that belong to one of the three Latin-script languages. Words
// shared between them ("de", "que", "en", "no", "un", "a") are left out.
const WORDS = {
  en: ['the', 'is', 'are', 'was', 'and', 'of', 'to', 'for', 'you', 'your', 'there', 'this', 'that', 'with', 'not',
    'have', 'has', 'can', 'it', 'any', 'today', 'students', 'student', 'records', 'found', 'please', 'could',
    'would', 'what', 'which', 'enrolled', 'year', 'name', 'i', 'here', 'help', 'look', 'up', 'data'],
  fr: ['le', 'la', 'les', 'des', 'du', 'est', 'sont', 'et', 'il', 'elle', 'y', 'pour', 'pas', 'aucun', 'aucune',
    'vous', 'je', 'une', 'dans', 'sur', 'avec', 'élèves', 'élève', 'aujourd', 'peux', 'voulez', 'ce', 'cette',
    'qui', 'nom', 'année', 'scolaire', 'inscrits', 'été', 'trouvé', 'données', 'école', 'aider'],
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

// A Markdown table's data rows echo stored records, such as French class names
// in an English answer; its header row is the model's own wording and stays.
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;
function withoutTableData(text) {
  let inData = false;
  return text.split('\n').filter((line) => {
    if (!TABLE_ROW.test(line)) { inData = false; return true; }
    if (TABLE_SEPARATOR.test(line)) { inData = true; return false; }
    return !inData;
  }).join('\n');
}

/** @returns {'ar' | 'en' | 'fr' | 'es' | null} */
export function detectReplyLanguage(text) {
  const plain = withoutTableData(String(text ?? ''))
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    // Glosses and names in parentheses, such as "CE1 (Cours Élémentaire 1ère
    // année)" inside a Spanish answer, are often in another language.
    .replace(/\([^()]*\)/g, ' ');
  const letters = plain.match(/\p{L}/gu) ?? [];
  if (letters.length < MIN_LETTERS) return null;

  const arabic = (plain.match(/[؀-ۿݐ-ݿ]/gu) ?? []).length / letters.length;
  if (arabic > 0.5) return 'ar';
  if (arabic > 0.15) return null;

  const scores = { en: 0, fr: 0, es: 0 };
  for (const token of plain.toLowerCase().split(/[^\p{L}]+/u)) {
    for (const language of LOOKUP.get(token) ?? []) scores[language] += 1;
  }
  for (const [language, pattern] of Object.entries(LETTERS)) {
    scores[language] += (plain.match(pattern) ?? []).length;
  }
  scores.fr += (plain.match(ELISION) ?? []).length;

  const [best, second] = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (best[1] < 2 || best[1] < second[1] * 2) return null;
  return best[0];
}
