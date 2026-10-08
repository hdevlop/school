import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';

export const FILTERED_REPLY_VERSION = 1;
type Kind = 'girls' | 'maths-teachers' | 'parent-identity';
const canonical = (value: string) => normalizeReplyText(value).replace(/[.!?؟]+$/u, '').trim();
// A closed request set: additional names, dates, classes, operations or quotes do not match.
const phrases: Record<Kind, string[]> = {
  girls: ['شحال من بنت كاينة فالمدرسة؟', 'ch7al mn bent kayna f lmdrasa?',
    'كم عدد التلميذات في المدرسة؟', "Combien de filles sont inscrites dans l'école ?"],
  'maths-teachers': ['عطيني السميات ديال الأساتذة اللي كيقريو الرياضيات.',
    '3tini smiyat dyal lasatida li kay9erriw riyadiyat.',
    'اعرض أسماء أساتذة الرياضيات.', 'Liste les enseignants de mathématiques.'],
  'parent-identity': ['شحال خلص هاد الولي هاد الشهر؟', 'ch7al khelles had lwali had chher?',
    'كم دفع هذا الولي هذا الشهر؟', 'Combien ce parent a-t-il payé ce mois-ci ?'],
};
const requests = new Map(Object.entries(phrases).flatMap(([kind, texts]) =>
  texts.map(text => [canonical(text), kind as Kind] as const)));
export const schoolFilteredReplyKind = (query: string) => requests.get(canonical(query)) ?? null;
type Row = Record<string, unknown>;
function records(value: unknown): Row[] {
  if (!Array.isArray(value)) throw Error('Invalid filtered reply result');
  const seen = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)
      || typeof item.id !== 'string' || !item.id.trim() || seen.has(item.id)) throw Error('Invalid filtered reply row');
    seen.add(item.id); return item as Row;
  });
}
function safeName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/u.test(value)) throw Error('Invalid filtered reply name');
  return value.trim();
}
function renderGirls(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 1) throw Error('Invalid girls count results');
  const students = records(results[0]);
  const count = students.filter(student => student.gender === 'female').length;
  const unknown = students.filter(student => !['male', 'female'].includes(String(student.gender))).length;
  const text = language === 'ary' ? `كاينين ${count} تلميذة حسب السجلات ديال ${year}.`
    : language === 'ar' ? `عدد التلميذات حسب سجلات ${year} هو ${count}.`
      : `Les dossiers de ${year} indiquent ${count} filles inscrites.`;
  if (!unknown) return text;
  return text + (language === 'ary' ? ` ولكن ${unknown} سجل ما فيهش الجنس واضح، ما نقدرش نأكد العدد النهائي.`
    : language === 'ar' ? ` لكن الجنس غير محدد في ${unknown} سجل، لذلك لا يمكن تأكيد العدد النهائي.`
      : ` Le sexe manque ou est inconnu dans ${unknown} dossiers ; le total exact ne peut pas être confirmé.`);
}
const subjectName = (value: string) => canonical(value).normalize('NFD').replace(/\p{M}/gu, '');
const maths = new Set(['math', 'maths', 'mat', 'mathematics', 'mathematiques', 'رياضيات', 'الرياضيات'].map(subjectName));
function renderMaths(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2) throw Error('Invalid maths teacher results');
  const subjects = records(results[0]), teachers = records(results[1]);
  const ids = new Set(subjects.filter(subject => maths.has(subjectName(safeName(subject.name)))
    || typeof subject.code === 'string' && maths.has(subjectName(subject.code))).map(subject => subject.id));
  if (!ids.size) return language === 'ary' ? 'ما لقيتش مادة الرياضيات فالمواد المسجلة، ما نقدرش نحدد الأساتذة ديالها.'
    : language === 'ar' ? 'لم أجد مادة الرياضيات في المواد المسجلة، لذلك لا يمكن تحديد أساتذتها.'
      : "La matière mathématiques n'a pas été identifiée dans le catalogue ; ses enseignants ne peuvent pas être déterminés.";
  const names: string[] = [];
  for (const teacher of teachers) {
    if (!Array.isArray(teacher.assignments)) throw Error('Missing scoped teacher assignments');
    let matches = false;
    for (const assignment of teacher.assignments) {
      if (!assignment || typeof assignment !== 'object' || !Array.isArray(assignment.subjectIds)
        || assignment.subjectIds.some((id: unknown) => typeof id !== 'string' || !id.trim())) throw Error('Invalid subject assignment');
      if (assignment.subjectIds.some((id: string) => ids.has(id))) matches = true;
    }
    if (matches) names.push(safeName(teacher.name));
  }
  if (!names.length) return language === 'ary' ? `ما كاين حتى أستاذ عندو تكليف بالرياضيات فالسجلات ديال ${year}.`
    : language === 'ar' ? `لا يوجد أستاذ مسند إليه تدريس الرياضيات في سجلات ${year}.`
      : `Aucun enseignant n'a d'affectation en mathématiques dans les dossiers de ${year}.`;
  return (language === 'ary' ? `الأساتذة المكلفين بالرياضيات فـ ${year}: `
    : language === 'ar' ? `الأساتذة المكلفون بالرياضيات في ${year}: `
      : `Enseignants affectés aux mathématiques en ${year} : `) + names.join('، ') + '.';
}

/** Role is supplied by the signed-in request context. MCP still authorizes each read. */
export function schoolFilteredReply(query: string, language: ReplyLanguage, year?: string, role?: string): ReplyTemplate | null {
  const kind = schoolFilteredReplyKind(query);
  if (!kind) return null;
  if (kind === 'parent-identity') return { label: 'school:parent-identity', text: language === 'ary'
    ? 'شكون الولي اللي كتقصد؟ عطيني السمية ديالو ولا معرف الولي باش نحدد الحساب الصحيح.'
    : language === 'ar' ? 'من هو ولي الأمر المقصود؟ اذكر اسمه أو معرّفه لتحديد الحساب الصحيح.'
      : 'De quel parent parlez-vous ? Indiquez son nom ou son identifiant pour déterminer le bon compte.' };
  // A scoped subset must never be presented as a school-wide result for a family/teacher account.
  if (!['admin', 'principal'].includes(role ?? '')) return { label: 'school:filtered-read-denied', text: language === 'ary'
    ? 'هاد الطلب على المدرسة كاملة خاصو حساب الإدارة. نقدر نعاونك فالمعلومات اللي مسموح ليك تشوفها.'
    : language === 'ar' ? 'هذا الطلب على مستوى المدرسة يتطلب حساب الإدارة. يمكنك طلب المعلومات المسموح لحسابك بالاطلاع عليها.'
      : "Cette demande à l'échelle de l'école nécessite un compte de direction. Demandez les informations accessibles à votre compte." };
  if (!year) return null;
  return kind === 'girls' ? { label: 'school:girls-count', calls: [{ name: 'students_get_students', input: { academicYear: year } }],
    render: results => renderGirls(language, year, results) }
    : { label: 'school:maths-teachers', calls: [{ name: 'subjects_get_subjects', input: {} },
      { name: 'teachers_get_teachers', input: { academicYear: year } }], render: results => renderMaths(language, year, results) };
}
