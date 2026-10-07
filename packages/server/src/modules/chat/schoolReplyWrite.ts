import { normalizeReplyText } from 'najm-chatbot';

type WriteRefusalKind = 'attendance' | 'change';
const boundary = '(?![\\p{L}\\p{N}])';
const domainObject = /(?<![\p{L}\p{N}])(?:tilmid|tilmida|tlamid|tlamd|ostad|asatida|lasatida|9ism|l9ism|classe|classes|section|parent|parents|wali|lwali|lwalidin|tilifon|nmra|no9ta|nno9ta|note|notes|fard|lfard|forod|lforod|imti7an|i3lan|li3lan|risala|message|sms|khlas|lkhlas|frais|paiement|ghiyab|lghiyab|7odour|l7oudour|7ader|7adra|ghayb|ghayeb)(?![\p{L}\p{N}])/u;
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
