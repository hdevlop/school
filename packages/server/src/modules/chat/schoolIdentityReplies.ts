import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { schoolListReplyForKind } from './schoolListReplies';
import { schoolAcademicGradeReply } from './schoolStudentReply';

/** Only populated from the signed-in parent's owned repository read. */
export interface SchoolChatChild { id: string; name: string; gender?: string | null }

const tokensOf = (query: string): string[] | null => {
  // The framework's normalization removes quoted bodies. Do not hide a qualifier.
  if (/[«»“”"`]/u.test(query)) return null;
  const text = normalizeReplyText(query).replace(/[.!?؟]+$/u, '').trim();
  return /^[\p{L}\p{N}\s]+$/u.test(text) ? text.split(/\s+/u) : null;
};
const includes = (tokens: string[], words: string[]) => words.some(word => tokens.includes(word));
const only = (tokens: string[], words: string[]) => tokens.every(word => words.includes(word));

const classWords = ['الاقسام', 'اقسام', 'كاملين', 'كاملة', 'ديال', 'المدرسة', 'فالمدرسة', 'عطيني', 'وريني', 'سميتهم', 'السميات', 'سميات',
  'لائحة', 'اللايحة', 'شنو', 'هما', 'هوما', 'عندنا', 'فعندنا', 'ف', 'l2a9sam', 'a9sam', 'kamlin', 'kamla', 'dyal', 'lmdrasa', 'flmdrasa',
  '3tini', 'werini', 'wrini', 'smiythom', 'smiyat', 'lista', 'chno', 'homa', '3ndna', 'f'];
const fifthWords = ['شحال', 'من', 'تلميذ', 'تلاميذ', 'كاين', 'كاينين', 'فالقسم', 'القسم', 'الخامس', 'بوحدو', 'غير', 'ف', 'ديال',
  'ch7al', 'mn', 'tilmid', 'tlamd', 'kayn', 'kaynin', 'f', 'l9ism', 'l9sim', 'lkhamis', 'bo7do', 'ghir', 'dyal'];

function administrativeOnly(language: ReplyLanguage): ReplyTemplate {
  return { label: 'school:class-read-denied', text: language === 'ary'
    ? 'هاد الطلب على الأقسام كاملة خاصو حساب الإدارة. نقدر نعاونك فالمعلومات اللي مسموح ليك تشوفها.'
    : language === 'ar' ? 'هذا الطلب عن جميع الأقسام يتطلب حساب الإدارة. يمكنك طلب المعلومات المسموح لحسابك بالاطلاع عليها.'
      : 'Cette demande sur les classes nécessite un compte de direction. Demandez les informations accessibles à votre compte.' };
}

/** Closed, unqualified class requests. A section label is never a class identifier. */
export function schoolClassIdentityReply(query: string, language: ReplyLanguage, year?: string, role?: string): ReplyTemplate | null {
  const tokens = tokensOf(query);
  if (!tokens) return null;
  const list = only(tokens, classWords) && includes(tokens, ['الاقسام', 'اقسام', 'l2a9sam', 'a9sam'])
    && includes(tokens, ['عطيني', 'وريني', 'سميتهم', 'السميات', 'سميات', 'لائحة', 'اللايحة', 'شنو', '3tini', 'werini', 'wrini', 'smiythom', 'smiyat', 'lista', 'chno'])
    && includes(tokens, ['المدرسة', 'فالمدرسة', 'كاملين', 'كاملة', 'lmdrasa', 'flmdrasa', 'kamlin', 'kamla']);
  const fifth = only(tokens, fifthWords) && includes(tokens, ['شحال', 'ch7al'])
    && includes(tokens, ['تلميذ', 'تلاميذ', 'tilmid', 'tlamd'])
    && includes(tokens, ['فالقسم', 'القسم', 'l9ism', 'l9sim']) && includes(tokens, ['الخامس', 'lkhamis']);
  if (!list && !fifth) return null;
  if (!year) return null;
  if (!['admin', 'principal'].includes(role ?? '')) return administrativeOnly(language);
  if (list) return { ...schoolListReplyForKind('classes', language, year), label: 'school:class-identities' };
  // The published template contract uses fixed calls. Read the existing scoped
  // lists, then match placements by the discovered class ID; never guess an ID.
  return { label: 'school:fifth-class-count', calls: ['classes_get_classes', 'students_get_students']
    .map(name => ({ name, input: { academicYear: year } })), render: results => renderFifth(language, year, results) };
}

const key = (value: string) => normalizeReplyText(value).normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/gu, ' ').trim();
const fifthNames = new Set(['5', '5e', '5eme', '5 aep', '5aep', '5 ap', '5ap', 'cinquieme', 'cinquieme primaire', '5eme primaire',
  'الخامس', 'القسم الخامس', 'السنة الخامسة', 'الخامس ابتدائي', 'السنة الخامسة ابتدائي'].map(key));
const safeName = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\t]/u.test(value)) throw Error('Invalid class identity');
  return value.trim();
};
function renderFifth(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2 || results.some(value => !Array.isArray(value))) throw Error('Invalid class count results');
  const classes = results[0] as Array<{ id: string; name: string; level?: string | null }>;
  const ids = new Set<string>();
  for (const record of classes) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw Error('Invalid class identity');
    safeName(record.id); safeName(record.name);
    if (ids.has(record.id) || record.level != null && typeof record.level !== 'string') throw Error('Invalid class identity');
    ids.add(record.id);
  }
  const matches = classes.filter(record => fifthNames.has(key(record.name)) || record.level != null && fifthNames.has(key(record.level)));
  if (matches.length !== 1) return language === 'ary'
    ? `ما قدرتش نحدد قسم خامس واحد بشكل واضح فـ ${year}. عطيني السمية أو الكود ديال القسم والسلك باش نعطيك العدد الصحيح.`
    : language === 'ar' ? `لم أتمكن من تحديد قسم خامس دون التباس في ${year}. حدد اسم أو رمز القسم والسلك لحساب العدد الصحيح.`
      : `Classe de cinquième absente ou ambiguë en ${year}. Précisez son nom/code et son cycle pour déterminer l'effectif.`;
  const placements = new Map<string, string | null>();
  for (const student of results[1] as Array<{ id: string; classId?: string | null }>) {
    if (!student || typeof student !== 'object' || Array.isArray(student)) throw Error('Invalid student placement');
    safeName(student.id);
    const classId = student.classId ?? null;
    if (classId !== null) safeName(classId);
    if (placements.has(student.id) && placements.get(student.id) !== classId) throw Error('Conflicting student placement');
    placements.set(student.id, classId);
  }
  const count = [...placements.values()].filter(id => id === matches[0].id).length;
  const unknown = [...placements.values()].filter(id => id === null || !ids.has(id)).length;
  const text = language === 'ary' ? `القسم ${safeName(matches[0].name)} فيه ${count} تلميذ حسب سجلات العام الدراسي ${year}.`
    : language === 'ar' ? `القسم ${safeName(matches[0].name)} يضم ${count} تلميذاً حسب سجلات السنة ${year}.`
      : `La classe ${safeName(matches[0].name)} compte ${count} élèves selon les dossiers de ${year}.`;
  return !unknown ? text : text + (language === 'ary'
    ? ` ولكن ${unknown} تلميذ ما عندوش قسم معروف فهاد اللائحة، ما نقدرش نأكد العدد الكامل.`
    : language === 'ar' ? ` لكن ${unknown} تلميذ بلا قسم معروف في هذه القائمة؛ لا يمكن تأكيد اكتمال العدد.`
      : ` Mais ${unknown} élèves n'ont pas de classe identifiée dans cette liste ; l'effectif complet ne peut pas être confirmé.`);
}

const childWords = ['بغيت', 'غير', 'نشوف', 'وريني', 'عطيني', 'النقط', 'النقاط', 'نقط', 'نقاط', 'ديال', 'بنتي', 'ولدي', 'طفلي', 'فهاد', 'هاد', 'العام',
  'bghit', 'ghir', 'nchof', 'werini', 'wrini', '3tini', 'nno9at', 'no9at', 'dyal', 'bnti', 'wldi', 'f', 'had', 'l3am'];

export function schoolNamedChildMatches(tokens: string[], children: readonly SchoolChatChild[]) {
  return children.flatMap(child => {
    const name = tokensOf(child.name);
    if (!name?.length) return [];
    const index = tokens.findIndex((_, i) => name.every((word, j) => tokens[i + j] === word));
    return index === -1 ? [] : [{ child, remainder: [...tokens.slice(0, index), ...tokens.slice(index + name.length)] }];
  });
}

/** Relation words are resolved only from trusted owned children, never student search. */
export function schoolChildGradeReply(query: string, language: ReplyLanguage, year?: string, role?: string,
  children?: readonly SchoolChatChild[]): ReplyTemplate | null {
  const tokens = tokensOf(query);
  if (!tokens || !year) return null;
  const named = role === 'parent' && children ? schoolNamedChildMatches(tokens, children) : [];
  const requestWords = named.length ? named[0].remainder : tokens;
  if (!only(requestWords, childWords) || !includes(requestWords, ['النقط', 'النقاط', 'نقط', 'نقاط', 'nno9at', 'no9at'])) return null;
  // More than one relation (e.g. my daughter AND my son) is not a single-child request.
  const relation = requestWords.filter(word => ['بنتي', 'ولدي', 'طفلي', 'bnti', 'wldi'].includes(word));
  if (relation.length > 1 || relation.length === 0 && named.length === 0) return null;
  if (role !== 'parent' || children === undefined) return { label: 'school:child-identity-clarification', text: language === 'ary'
    ? 'ما عنديش هوية ولدك ولا بنتك محددة فهاد الطلب. شكون كتقصد؟ عطيني السمية أو كود التلميذ باش نحدد المعلومات المسموح بها.'
    : language === 'ar' ? 'لم تُحدد هوية الطفل في هذا الطلب. اذكر اسم التلميذ أو رمزه لتحديد المعلومات المسموح بها.'
      : "L'identité de votre enfant n'est pas déterminée. Indiquez son nom ou son code pour identifier les informations accessibles." };
  if (!children.length) return { label: 'school:child-identity-clarification', text: language === 'ary'
    ? 'ما لقيت حتى ولد ولا بنت مربوطين بحسابك فالمعطيات المتاحة. خاص الإدارة تتأكد من الربط قبل ما نقدر نجيب النقط.'
    : language === 'ar' ? 'لم أجد طفلاً مرتبطاً بحسابك في البيانات المتاحة. يرجى مراجعة الإدارة للتحقق من الربط قبل عرض النقاط.'
      : "Aucun enfant lié à votre compte n'a été trouvé dans les données accessibles. Demandez à la direction de vérifier ce lien avant de consulter les notes." };
  const daughter = ['بنتي', 'bnti'].includes(relation[0]), son = ['ولدي', 'wldi'].includes(relation[0]);
  const wanted = daughter ? 'female' : son ? 'male' : null;
  const candidates = named.length ? named.map(match => match.child)
    : children.filter(child => wanted === null || child.gender === wanted || !['male', 'female'].includes(child.gender ?? ''));
  // Unknown gender must not silently turn "my daughter" into an arbitrary child.
  if (candidates.length === 1 && (wanted === null || candidates[0].gender === wanted)) {
    const child = candidates[0];
    if (!child.id.trim() || !child.name.trim()) throw Error('Invalid owned child identity');
    return schoolAcademicGradeReply(language, year, child.id, child.name);
  }
  return { label: 'school:child-identity-clarification', text: language === 'ary'
    ? 'شكون من ولادك كتقصد؟ عطيني السمية كاملة باش نجيب النقط ديالو بوحدو.'
    : language === 'ar' ? 'أي طفل تقصد؟ اذكر اسمه الكامل لعرض نقاطه وحده.'
      : 'De quel enfant parlez-vous ? Indiquez son nom complet pour consulter uniquement ses notes.' };
}
