import { normalizeReplyText, type ReplyLanguage } from 'najm-chatbot';

export type AnswerLanguage = ReplyLanguage | 'en' | 'es';
import { schoolReplyLanguage } from './schoolReplyLanguage';

/**
 * The language a chat answer should be written in, told to the answer model on
 * every message. Broader than schoolReplyLanguage, which picks refusal wording
 * and stays null unless an opening is unmistakable: here a plain "les notes de
 * la classe CM1 A" must still be answered in French. Darija in Latin letters
 * (Arabizi), or mixed with French, is answered in Darija; null when nothing
 * tells, and the model keeps the system prompt's rule.
 */

const words = (list: string) => new RegExp(`(?<![\\p{L}\\p{N}'’])(?:${list})(?![\\p{L}\\p{N}])`, 'gu');
const LATIN = {
  ary: words("dyal|dyali|dyalo|dyalha|dyalhom|dyalk|chno|achno|chnou|bghit[a-z]*|baghi|li|f|fl|mn|3la|ila|werini|wrini|werrini|3tini|3afak|kolchi|kamlin|kamla|ga3|ch7al|chhal|nno9at|no9at|no9ati|tan9it|l9ism|9ism|lmo3adal|mo3adal|limti7an|imti7an|natija|kachf|lkachf|bayan|lbayan|wach|daba|hadi|kayn|kayna|3nd|3ndi|l2ostad|l2ostada|lostad|ostad|ostada|tlamd|tlamid|tilmid|jab|jabat|jabo"),
  fr: words("les|le|la|des|du|de|d|l|une|un|et|pour|dans|toutes|tous|toute|quelle|quelles|quel|quels|notes|note|moyenne|classe|élève|élèves|eleve|eleves|résultats|resultats|examen|professeur|bulletin|école|ecole|est|sont|par|sur|avec|mon|ma|mes|s|il|vous|plaît|plait|combien|saisies|générale|generale|tu|peux|ce|ça|sais|faire|j|espère|vas|bien|aujourd|salut|ici|mets|présents|que|qui|quoi"),
  en: words("the|of|and|in|what|show|me|my|is|are|grades|grade|marks|mark|class|school|average|student|students|teacher|exam|results|please|how|many|all|for|give|list|report|card|s"),
  es: words("el|los|las|del|que|quiero|boletín|boletin|notas|nota|clase|escuela|profesor|profesora|cuántos|cuantos|por|favor|mi|mis|todas|todos|alumno|alumna|alumnos|resultados|examen|promedio|dame|muestra|hoy|esta|mañana|manana|como|sobre|para|ausentes|asistencia|evaluación|evaluacion|existente|marca|registra|cuál|cual|dónde|donde|hola|gracias|puedes|tengo|hay"),
};
// Darija words in Arabic script; without one an Arabic-script message is answered in Modern Standard Arabic.
const DARIJA_ARABIC = words('ديال|ديالي|ديالو|ديالها|ديالهم|شنو|شنهو|شحال|بغيت|بغينا|عطيني|عطينا|وريني|ورينا|خرجهم|خرجها|كاملين|فكل|هاد|هادي|هادو|اللي|واش|كيفاش|فين|دابا|جاب|جابت|جابو|عفاك|عافاك|كاين|كاينة|كاينين|ف|ل|بلا|بزاف|نتلاقاو|بسلامة|لباس|صافي|واخا|كنشكرك|تقدر|توريني|تقرا|حدا|هادا|كلشي|البارح|نهار|غايب|جا|روطار|امتى|الجاي|باغي|براسك|بجوج|لغي|حبس|مزيان|ماشي|ليا|داير|دايرة|فال\\p{L}+');

const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
// Arabizi writes Arabic sounds with digits inside words (nno9at, l2ostad, 3tini,
// kantbe3); a class code (2AC, CE1, 6AP) has a digit too and is not Arabizi.
const CLASS_CODE = /^(?:cp|ce[12]|cm[12]|[1-6](?:ap|ac|bac)|[1-6][a-f])$/u;
const arabiziWords = (text: string) => (text.match(/(?<![\p{L}\p{N}])[a-z]*[2379][a-z0-9]*(?![\p{L}\p{N}])/gu) ?? [])
  .filter((word) => /[a-z]/u.test(word) && !CLASS_CODE.test(word)).length;

export function schoolAnswerLanguage(userText: string): AnswerLanguage | null {
  const text = normalizeReplyText(userText);
  const arabic = count(text, /\p{Script=Arabic}/gu), latin = count(text, /[a-zà-ÿ]/gu);
  if (arabic > 0 && arabic >= latin / 2) {
    if (count(text, DARIJA_ARABIC) > 0) return 'ary';
    return schoolReplyLanguage(userText) ?? 'ar';
  }
  const scores = {
    ary: count(text, LATIN.ary) + arabiziWords(text),
    fr: count(text, LATIN.fr), en: count(text, LATIN.en), es: count(text, LATIN.es),
  };
  const best = Math.max(scores.fr, scores.en, scores.es);
  // One Darija word makes a mixed "bghit la distribution des notes" Darija:
  // the system prompt answers Arabizi in Darija.
  if (scores.ary > 0) return 'ary';
  if (best === 0) return schoolReplyLanguage(userText);
  return (Object.entries(scores).filter(([key]) => key !== 'ary').sort((a, b) => b[1] - a[1])[0]![0]) as AnswerLanguage;
}

const NAMES: Record<AnswerLanguage, string> = {
  ary: 'Moroccan Darija written in Arabic script',
  ar: 'Modern Standard Arabic',
  fr: 'French',
  en: 'English',
  es: 'Spanish',
};

/** The per-message instruction, or null when the language is unclear. */
export function answerLanguageInstruction(userText: string): string | null {
  const language = schoolAnswerLanguage(userText);
  const name = language ? NAMES[language] : null;
  return name ? `Write the whole answer in ${name}, the language of the user's message, even when tool results, names or subjects are in another language. Keep stored names and subject labels exactly as returned.` : null;
}
