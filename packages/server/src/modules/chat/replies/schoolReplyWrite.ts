import { normalizeReplyText, type ReplyLanguage, type ReplyRequest, type ReplyTemplate } from 'najm-chatbot';

type WriteRefusalKind = 'attendance' | 'change';
const boundary = '(?![\\p{L}\\p{N}])';
const domainObject = /(?<![\p{L}\p{N}])(?:tilmid|tilmida|tlamid|tlamd|ostad|asatida|lasatida|9ism|l9ism|classe|classes|section|parent|parents|wali|lwali|lwalidin|tilifon|nmra|no9ta|no9ti|nno9ta|nno9ati|note|notes|fard|lfard|forod|lforod|imti7an|i3lan|li3lan|risala|message|sms|khlas|lkhlas|frais|paiement|ghiyab|lghiyab|7odour|l7oudour|7ader|7adra|ghayb|ghayeb)(?![\p{L}\p{N}])/u;
const latinChange = new RegExp(`^(?:zid|bdel|beddel|sjel|sjjl|sjjel|sejjl|sejjel|9eyyed|mse7|ms7|7iyed|7yed|lghi|rje3)${boundary}`, 'u');
const latinSend = new RegExp(`^(?:sifet|sift)${boundary}`, 'u');
const messageObject = /(?<![\p{L}\p{N}])(?:i3lan|li3lan|risala|message|sms|email)(?![\p{L}\p{N}])/u;
const latinAttendance = /(?<![\p{L}\p{N}])(?:ghiyab|lghiyab|7odour|l7oudour|7ader|7adra|ghayb|ghayeb|ghaybin|7adrin)(?![\p{L}\p{N}])/u;
const localChange = /^(?:زيد|بدل|حيد|صيفط|مسح|ajoute|annule|change|efface|envoie)(?!\p{L})/u;
const localObject = /تلميذ|تلميذة|استاذ|اساتذة|قسم|فرض|امتحان|خلاص|ولي|واليدين|تيليفون|نمرة|élève|eleve|enseignant|professeur|classe|section|paiement|frais|note|parent|annonce|message/u;

/** Only anchored requests to change school records; never executes a mutation. */
export function schoolWriteRefusalKind(userText: string): WriteRefusalKind | null {
  if (/^["'«“‘`]/u.test(userText.trimStart())) return null;
  const text = normalizeReplyText(userText);
  // "dir" also means produce/display a result; a list/total is not a mutation.
  if (/^(?:dir|دير)(?![\p{L}\p{N}])/u.test(text)
    && /(?<![\p{L}\p{N}])(?:lista|liste|list|l3adad|mjmo3|lmajmou3|لائحة|قائمة|عدد|العدد|مجموع|المجموع)(?![\p{L}\p{N}])/u.test(text)) return null;
  const originalWrite = /^(?:enregistre(?:r|z)?|marque(?:r|z)?|crée|cree|publie|supprime|modifie|سجل|علم|دير|انشئ|انشر|احذف|عدل)(?!\p{L})/u.test(text);
  const originalObject = /élève|eleve|notes?|controle|contrôle|annonce|parent|presence|présence|absence|absent|حضور|غياب|غايب|غائب|حاضر|تلميذ|نقط|اعلان|الاباء|اولياء/u.test(text);
  const latinWrite = latinChange.test(text) && domainObject.test(text)
    || latinSend.test(text) && messageObject.test(text)
    || /^dir(?![\p{L}\p{N}])/u.test(text) && domainObject.test(text) && latinAttendance.test(text);
  if (!(originalWrite && originalObject || localChange.test(text) && localObject.test(text) || latinWrite)) return null;
  return /presence|présence|absence|absent|حضور|غياب|غايب|غائب|حاضر/u.test(text) || latinAttendance.test(text) ? 'attendance' : 'change';
}

const refusals: Record<ReplyLanguage, { attendance: string; change: string }> = {
  ary: {
    attendance: 'ما نقدرش نسجل أو نبدل الحضور والغياب هنا. خاصك تستعمل صفحة الحضور والغياب فلوحة التحكم.',
    change: 'ما نقدرش ندير هاد التغيير فهاد الدردشة. خاصك تستعمل لوحة التحكم.',
  },
  ar: {
    attendance: 'لا يمكنني تسجيل أو تعديل الحضور والغياب في هذه الدردشة. يرجى استخدام صفحة الحضور والغياب في لوحة التحكم.',
    change: 'لا يمكنني إجراء هذا التغيير في هذه الدردشة. يرجى استخدام لوحة التحكم.',
  },
  fr: {
    attendance: 'Je ne peux pas enregistrer ou modifier les présences et les absences dans cette conversation. Utilisez la page des présences du tableau de bord.',
    change: 'Je ne peux pas effectuer cette modification dans cette conversation. Utilisez le tableau de bord.',
  },
};

/** General read questions go to Jev/router; only writes have a local refusal. */
export function schoolWriteReply({ userText, language }: ReplyRequest): ReplyTemplate | null {
  if (!language) return null;
  const kind = schoolWriteRefusalKind(userText);
  return kind ? { text: refusals[language][kind] } : null;
}
