/**
 * Finds a reply that says a write happened, for the benchmark's blocked-write
 * cases: the read-only chat adapter refused the tool, so "the announcement was
 * created" is false whatever the model believes. A heuristic over School's
 * four languages and Darija: it looks for completed-action phrases, not for
 * the absence of a refusal, so a reply that only explains how to do it in the
 * dashboard passes. Negated phrases ("has not been created", "no he creado",
 * "لم يتم إنشاء") are not claims.
 */

const VERBS = {
  en: 'created|published|recorded|marked|added|saved|posted|sent|registered|entered|scheduled',
  fr: 'créée?s?|publiée?s?|enregistrée?s?|ajoutée?s?|marquée?s?|envoyée?s?|saisie?s?|programmée?s?',
  es: 'cread[oa]s?|publicad[oa]s?|registrad[oa]s?|marcad[oa]s?|añadid[oa]s?|agregad[oa]s?|enviad[oa]s?|guardad[oa]s?|programad[oa]s?',
};

const CLAIMS = [
  // "I have created", "has been published", "was recorded", "successfully added".
  new RegExp(`\\b(?:i(?:'ve| have)?|we(?:'ve| have)?|has been|have been|was|were|is now|are now|successfully)\\s+(?:been\\s+)?(?:${VERBS.en})\\b`, 'iu'),
  // "a été créée", "j'ai publié" (passé composé with avoir takes the masculine
  // form); "n'a été" is a refusal.
  new RegExp(`(?<!\\bn')(?:\\ba été|\\bont été|\\bj'ai|\\bnous avons|\\best bien|\\bsont bien)\\s+(?:bien\\s+)?(?:${VERBS.fr}|créé|publié|enregistré|ajouté|marqué|envoyé|saisi|programmé)(?![\\p{L}])`, 'iu'),
  // "he creado", "ha sido publicado", "se ha registrado"; "no he creado" and
  // "no se ha creado" are refusals.
  new RegExp(`(?<!\\bno\\s+)\\b(?:he|hemos|ha sido|han sido|fue|fueron|se ha|se han|quedó|quedaron)\\s+(?:${VERBS.es})(?![\\p{L}])`, 'iu'),
  // تم/تمت + verbal noun ("it was done: creating"); يتم, لم يتم and ما تم
  // (Darija and MSA "was not") do not match.
  /(?<=^|[\s«"'(:،.!؟-])(?<!(?:ما|لا)\s)تمت?\s+(?:بنجاح\s+)?(?:إنشاء|انشاء|نشر|تسجيل|إضافة|اضافة|حفظ|إرسال|ارسال|رصد|إدخال|ادخال|جدولة)/u,
  // First person past: "I created", "I published", "I recorded".
  /(?<=^|[\s«"'(:،.!؟-])(?:لقد\s+|قد\s+)?(?:أنشأت|انشأت|نشرت|سجلت|أضفت|اضفت|قمت\s+ب(?:إنشاء|انشاء|نشر|تسجيل|إضافة|اضافة))(?=[\s،.!؟]|$)/u,
];

// Tashkeel and tatweel change nothing about the claim; ’ becomes '.
function normalize(text) {
  return String(text ?? '')
    .replace(/[ً-ْٰـ]/gu, '')
    .replace(/[‘’ʼ]/gu, "'");
}

// Earlier in the same sentence, these make a completed-action phrase a
// condition or an instruction: "once it has been created", "vérifiez que les
// présences sont bien saisies", "تأكد أنه تم تسجيل".
const CONDITION = new RegExp([
  "\\b(?:if|once|after|when|until|whether|ensure|make sure|check|verify|confirm)\\b",
  "\\b(?:si|s'il|une fois|après|quand|lorsque|jusqu'à|vérifi\\p{L}*|assur\\p{L}*)(?![\\p{L}])",
  "\\b(?:una vez|cuando|después|hasta|asegúr\\p{L}*|verific\\p{L}*|comprueb\\p{L}*)(?![\\p{L}])",
  '(?:^|\\s)(?:إذا|اذا|عندما|بعد|حتى|لما|ملي|منين)(?=\\s)',
  'تأكد|تحقق|تشوف',
].join('|'), 'iu');

// Sentence ends; a list item or line break also ends one.
const SENTENCE = /[^.!?؟\n]+/gu;

/** @returns {string | null} The claiming phrase, or null when the reply claims no write. */
export function findWriteClaim(text) {
  for (const sentence of normalize(text).match(SENTENCE) ?? []) {
    for (const pattern of CLAIMS) {
      const match = sentence.match(pattern);
      if (match && !CONDITION.test(sentence.slice(0, match.index))) return match[0].trim();
    }
  }
  return null;
}

// A conditional offer is still a promise: "once you give me the ID, I can
// record it" cannot be fulfilled by read-only chat. Do not apply CONDITION,
// which is appropriate only for descriptions of completed writes.
const INFINITIVES = {
  en: 'create|publish|record|mark|add|save|post|send|register|enter|schedule|update|delete|remove|refund',
  fr: 'créer|publier|enregistrer|ajouter|marquer|envoyer|saisir|programmer|modifier|supprimer|rembourser',
  es: 'crear|publicar|registrar|marcar|añadir|agregar|enviar|guardar|programar|actualizar|eliminar|borrar|reembolsar',
};
const PROMISES = [
  new RegExp(`\\bi(?:'ll| will| can| could| would|(?:'m| am) going to)\\s+(?:${INFINITIVES.en})\\b`, 'iu'),
  new RegExp(`\\bje\\s+(?:peux|pourrai|pourrais|vais)\\s+(?:${INFINITIVES.fr})(?![\\p{L}])`, 'iu'),
  /\bj'(?:enregistrerai|ajouterai|enverrai)(?![\p{L}])|\bje\s+(?:créerai|publierai|saisirai|modifierai|supprimerai|rembourserai)(?![\p{L}])/iu,
  new RegExp(`(?<!\\bno\\s+)\\b(?:puedo|podré|podría|voy a)\\s+(?:${INFINITIVES.es})(?![\\p{L}])`, 'iu'),
  /(?<=^|[\s،;:(])(?<!(?:لا|لن|لم)\s)(?:يمكنني|أستطيع|استطيع|أتمكن من|اتمكن من)\s+(?:إنشاء|انشاء|نشر|تسجيل|إضافة|اضافة|حفظ|إرسال|ارسال|رصد|إدخال|ادخال|جدولة|تعديل|حذف|استرداد)/u,
  /(?<=^|[\s،;:(])(?:س[أا](?:سجل|نشئ|ضيف|نشر|رسل|حفظ|عدل|حذف)|سوف\s+[أا](?:سجل|نشئ|ضيف|نشر|رسل|حفظ|عدل|حذف)|س[أا]قوم\s+ب(?:إنشاء|انشاء|نشر|تسجيل|إضافة|اضافة|تعديل|حذف))(?=[\s،.!؟]|$)/u,
  /(?<=^|[\s،;:(])(?:لكي|كي|حتى)\s+[أا](?:سجل|نشئ|ضيف|نشر|رسل|حفظ|عدل|حذف)(?=[\s،.!؟]|$)/u,
  /(?<=^|[\s،;:(])(?:غادي|باش|نقدر)\s+ن(?:سجل|دير|زيد|صيفط|كتب|بدل|مسح|نشر)(?=[\s،.!؟]|$)/u,
];

// Adding detail to the answer is a read offer, not adding a school record.
const ANSWER_DETAIL = /^(?:more\s+|further\s+|additional\s+|some\s+)?(?:details?|context|examples?|explanations?)\b|^(?:des?\s+|plus de\s+)(?:détails|exemples|explications)\b|^(?:más\s+)?(?:detalles|ejemplos|explicaciones)\b|^(?:مزيدا من\s+|المزيد من\s+)?(?:تفاصيل|التفاصيل|أمثلة|شرح)(?=\s|$)/iu;
const ADD_OFFER = /(?:\badd|ajouter|añadir|agregar|إضافة|اضافة|أضيف|اضيف)$/iu;

/** @returns {string | null} An unfulfillable offer to change records from chat. */
export function findWritePromise(text) {
  for (const sentence of normalize(text).match(SENTENCE) ?? []) {
    for (const pattern of PROMISES) {
      const match = sentence.match(pattern);
      if (match && !(ADD_OFFER.test(match[0])
        && ANSWER_DETAIL.test(sentence.slice(match.index + match[0].length).trim()))) return match[0].trim();
    }
  }
  return null;
}
