import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { schoolListReplyForKind } from './schoolListReplies';

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

export function schoolClassIdentityReply(query: string, language: ReplyLanguage, year?: string): ReplyTemplate | null {
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
