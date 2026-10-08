import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { ATTENDANCE_STATUS_VALUES } from '@sms/contracts';
import { schoolListReplyForKind } from './schoolListReplies';

export const FILTERED_REPLY_VERSION = 4;
type Kind = 'girls' | 'maths-teachers' | 'parent-identity' | 'combined-total' | 'upcoming-exams'
  | 'monthly-exams' | 'large-classes' | 'all-classes' | 'fourth-maths-grades' | 'previous-year' | 'previous-month-absences' | 'teacher-count';
const canonical = (value: string) => normalizeReplyText(value).replace(/[.!?؟]+$/u, '').trim();
// A closed request set: additional names, dates, classes, operations or quotes do not match.
const phrases: Record<Kind, string[]> = {
  'teacher-count': ['شحال من أستاذ كيقري فالمدرسة ديالنا دابا؟', 'ch7al mn ostad kay9erri f lmdrasa dyalna daba?',
    'شحال عندنا ديال الأساتذة فالمدرسة؟', 'ch7al 3ndna dyal lasatida f lmdrasa?'],
  'monthly-exams': ['شحال من فرض عند التلاميذ هاد الشهر؟', 'ch7al mn fard 3nd tlamd had chher?'],
  'large-classes': ['شنو هما الأقسام اللي فيهم كثر من تلاتين تلميذ؟', 'chno homa l2a9sam li fihom kter mn tlatin tilmid?'],
  'all-classes': ['عطيني لائحة ديال الأقسام كاملين.', '3tini lista dyal l2a9sam kamlin.',
    'شنو هما الأقسام اللي عندنا فالمدرسة؟', 'chno homa l2a9sam li 3ndna f lmdrasa?',
    'وريني الأقسام ديال المدرسة.', 'werini l2a9sam dyal lmdrasa.'],
  'previous-month-absences': ['وريني الغياب ديال التلاميذ فالشهر اللي فات.', 'werini lghiyab dyal tlamd f chher li fat.'],
  'fourth-maths-grades': ['شنو هوما النقط ديال القسم الرابع فالرياضيات؟', 'chno homa nno9at dyal l9ism rrabi3 f riyadiyat?'],
  'previous-year': ['وشحال كانو العام اللي فات؟', 'w ch7al kano l3am li fat?'],
  'combined-total': ['جمع ليا عدد التلاميذ مع عدد الأساتذة وعطيني المجموع.',
    'jme3 liya 3adad tlamd m3a 3adad lasatida w 3tini lmajmou3.'],
  'upcoming-exams': ['واش كاينين شي فروض هاد الأيام الجاية؟', 'wach kaynin chi forod had liyam jaya?'],
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
export const schoolFilteredReplyKind = (query: string) => /[«»“”"`]/u.test(query) ? null : requests.get(canonical(query)) ?? null;

function renderSum(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2) throw Error('Invalid combined count results');
  const counts = results.map(result => {
    const count = (result as { count?: unknown } | null)?.count;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw Error('Invalid combined count');
    return count;
  });
  const total = counts[0] + counts[1];
  if (!Number.isSafeInteger(total)) throw Error('Invalid combined count sum');
  return language === 'ary' ? `فهاد العام الدراسي ${year}، كاينين ${counts[0]} تلميذ و${counts[1]} أستاذ. المجموع هو ${total}.`
    : language === 'ar' ? `في السنة الدراسية ${year}، يوجد ${counts[0]} تلميذ و${counts[1]} أستاذ. المجموع هو ${total}.`
      : `Pour l'année ${year}, il y a ${counts[0]} élèves et ${counts[1]} enseignants. Le total est ${total}.`;
}
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
function validDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw Error('Invalid filtered reply date');
  return value;
}
function renderMonth(language: ReplyLanguage, year: string, schoolDate: string, results: unknown[]): string {
  if (results.length !== 1) throw Error('Invalid monthly exam results');
  const month = validDate(schoolDate).slice(0, 7);
  const count = records(results[0]).filter(exam => validDate(exam.date).slice(0, 7) === month).length;
  return language === 'ary' ? `كاينين ${count} فروض مسجلين فشهر ${month} فهاد العام الدراسي ${year}، بما فيهم اللي دازو واللي مزال جايين.`
    : language === 'ar' ? `يوجد ${count} امتحان مسجل في شهر ${month} للسنة ${year}، بما في ذلك الماضي والقادم.`
      : `${count} examens sont enregistrés pour ${month}, année ${year}, passés et à venir compris.`;
}
function renderLargeClasses(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2 || !Array.isArray(results[1])) throw Error('Invalid class size results');
  const classes = records(results[0]);
  const counts = new Map(classes.map(c => [c.id, 0]));
  const identities = new Map<string, string | null>();
  let unknown = 0;
  for (const student of results[1]) {
    if (!student || typeof student !== 'object' || typeof student.id !== 'string' || !student.id.trim()
      || (student.classId != null && (typeof student.classId !== 'string' || !student.classId.trim()))) throw Error('Invalid scoped student placement');
    const classId = student.classId ?? null;
    if (identities.has(student.id)) {
      if (identities.get(student.id) !== classId) throw Error('Conflicting student placements');
      continue;
    }
    identities.set(student.id, classId);
    if (classId === null || !counts.has(classId)) unknown++;
    else counts.set(classId, counts.get(classId)! + 1);
  }
  const lines = classes.filter(c => counts.get(c.id)! > 30).map(c => `- ${safeName(c.name)}: ${counts.get(c.id)}`);
  const header = language === 'ary' ? `الأقسام اللي فيهم كثر من 30 تلميذ فـ ${year} حسب السجلات: `
    : language === 'ar' ? `الأقسام التي يزيد عدد تلاميذها عن 30 في ${year} حسب السجلات: `
      : `Classes dépassant 30 élèves en ${year}, selon les dossiers : `;
  const empty = language === 'ary' ? 'ما لقيت حتى قسم فوق 30 فالمعطيات المعروفة.'
    : language === 'ar' ? 'لم أجد قسماً فوق 30 في البيانات المعروفة.' : 'Aucune classe au-dessus de 30 dans les données connues.';
  const caveat = !unknown ? '' : language === 'ary' ? `\n${unknown} تلميذ ما عندوش قسم معروف فهاد اللائحة، ما نقدرش نأكد أن جميع الأعداد كاملة.`
    : language === 'ar' ? `\n${unknown} تلميذ بلا قسم معروف في هذه القائمة؛ لا يمكن تأكيد اكتمال الأعداد.`
      : `\n${unknown} élèves sans classe identifiée dans cette liste ; les effectifs complets ne peuvent pas être confirmés.`;
  return header + (lines.length ? '\n' + lines.join('\n') : empty) + caveat;
}
function renderPreviousAbsences(language: ReplyLanguage, year: string, schoolDate: string, results: unknown[]): string {
  if (results.length !== 1) throw Error('Invalid attendance results');
  const today = validDate(schoolDate);
  const month = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
  const selected = records(results[0]).filter(row => {
    const date = validDate(row.date);
    if (row.type !== 'student') throw Error('Unexpected attendance scope');
    if (!(ATTENDANCE_STATUS_VALUES as readonly unknown[]).includes(row.status)) throw Error('Invalid attendance status');
    return row.status === 'absent' && date.slice(0, 7) === month;
  }).sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  const heading = language === 'ary' ? `الغياب المسجل ديال التلاميذ فشهر ${month}، حسب سجلات العام الدراسي ${year}: ${selected.length} تسجيل.`
    : language === 'ar' ? `غياب التلاميذ المسجل في ${month}، حسب سجلات السنة ${year}: ${selected.length} تسجيل.`
      : `Absences enregistrées des élèves en ${month}, dans les dossiers de ${year} : ${selected.length}.`;
  const lines = selected.slice(0, 20).map(row => `- ${safeName((row.student as Row | null)?.name)} — ${row.date}`);
  const more = selected.length > 20 ? `\n(${selected.length - 20} ${language === 'fr' ? 'autres enregistrements dans la page de présence' : 'تسجيل آخر فصفحة الحضور'})` : '';
  return heading + (lines.length ? '\n' + lines.join('\n') : '') + more;
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
const fourth = new Set(['4', '4e', '4eme', '4aep', 'quatrieme', 'الرابع', 'السنة الرابعة', 'الرابع ابتدائي', 'القسم الرابع'].map(subjectName));
function renderFourthGrades(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 3) throw Error('Invalid class grade results');
  const classes = records(results[0]), subjects = records(results[1]), grades = records(results[2]);
  const matches = classes.filter(c => fourth.has(subjectName(safeName(c.name))) || typeof c.level === 'string' && fourth.has(subjectName(c.level)));
  const ids = subjects.filter(s => maths.has(subjectName(safeName(s.name))) || typeof s.code === 'string' && maths.has(subjectName(s.code)));
  if (matches.length !== 1 || ids.length !== 1) return language === 'ary'
    ? `ما قدرتش نحدد قسم رابع ومادة الرياضيات بشكل واضح فـ ${year}. عطيني السمية أو الكود ديال القسم والمادة، ومعاهم السلك إلا كانو كاينين بزاف.`
    : language === 'ar' ? `لم أتمكن من تحديد قسم رابع ومادة الرياضيات دون التباس في ${year}. حدد اسم أو رمز القسم والمادة والسلك الدراسي.`
      : `Classe de quatrième ou matière mathématiques absente ou ambiguë en ${year}. Précisez leurs noms/codes et le cycle.`;
  const selected = grades.filter(g => (g.class as Row | null)?.id === matches[0].id && (g.subject as Row | null)?.id === ids[0].id);
  if (!selected.length) return language === 'ary' ? `ما لقيت حتى نقطة مسجلة فمادة الرياضيات للقسم ${safeName(matches[0].name)} فـ ${year}.`
    : language === 'ar' ? `لم أجد نقاطاً مسجلة في الرياضيات للقسم ${safeName(matches[0].name)} في ${year}.`
      : `Aucune note de mathématiques enregistrée pour ${safeName(matches[0].name)} en ${year}.`;
  const lines = selected.slice(0, 20).map(g => {
    const sources = [g.assessment, g.exam].filter(s => s && typeof s === 'object' && (s as Row).id != null) as Row[];
    if (sources.length !== 1) throw Error('Invalid grade source');
    const numeric = (value: unknown) => {
      if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/u.test(value))) throw Error('Invalid grade mark');
      const number = Number(value); if (!Number.isFinite(number) || number < 0) throw Error('Invalid grade mark'); return number;
    };
    const score = numeric(g.marksObtained), total = numeric(sources[0].totalMarks);
    if (total <= 0 || score > total) throw Error('Invalid grade range');
    return `- ${safeName((g.student as Row | null)?.name)} — ${safeName(sources[0].title)} — ${validDate(sources[0].date)} — ${score}/${total}`;
  });
  const more = selected.length > 20 ? `\n(${selected.length - 20} ${language === 'fr' ? 'autres notes dans la page des notes' : language === 'ary' ? 'نقطة أخرى فصفحة النقط' : 'نقطة أخرى في صفحة الدرجات'})` : '';
  return `${safeName(matches[0].name)} — ${safeName(ids[0].name)} — ${year}\n${lines.join('\n')}${more}`;
}
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
export function schoolFilteredReply(query: string, language: ReplyLanguage, year?: string, role?: string, schoolDate?: string): ReplyTemplate | null {
  const kind = schoolFilteredReplyKind(query);
  if (!kind) return null;
  if (kind === 'previous-year') return { label: 'school:previous-year-clarification', text: language === 'ary'
    ? 'شحال ديال شنو كتقصد: التلاميذ، الأساتذة ولا شي حاجة أخرى؟ وضح ليا الطلب، وللمعلومات ديال العام اللي فات اختار داك العام فالداشبورد إلا كان مسموح لحسابك.'
    : language === 'ar' ? 'عدد ماذا تقصد: التلاميذ أم الأساتذة أم شيئاً آخر؟ وضح الطلب، واختر السنة السابقة في لوحة التحكم إن كانت متاحة لحسابك.'
      : 'Le nombre de quoi : élèves, enseignants ou autre chose ? Précisez votre demande et sélectionnez l’année précédente si votre compte y a accès.' };
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
  const call = (name: string) => ({ name, input: name.startsWith('subjects_') ? {} : { academicYear: year } });
  if (kind === 'teacher-count') return { label: 'school:teacher-count', calls: [call('teachers_get_teacher_count')], render: results => {
    const count = (results[0] as { count?: unknown } | null)?.count;
    if (results.length !== 1 || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw Error('Invalid teacher count');
    return language === 'ary' ? `كاينين ${count} أستاذ حسب سجلات العام الدراسي ${year}.`
      : language === 'ar' ? `عدد الأساتذة حسب سجلات السنة ${year} هو ${count}.` : `Les dossiers de ${year} indiquent ${count} enseignants.`;
  } };
  if (kind === 'previous-month-absences') return !schoolDate ? null : { label: 'school:previous-month-absences',
    calls: [{ name: 'attendance_get_all', input: { academicYear: year, type: 'student' } }],
    render: results => renderPreviousAbsences(language, year, schoolDate, results) };
  if (kind === 'monthly-exams') return !schoolDate ? null : { label: 'school:monthly-exams', calls: [call('exams_get_all')],
    render: results => renderMonth(language, year, schoolDate, results) };
  if (kind === 'large-classes') return { label: 'school:large-classes', calls: [call('classes_get_classes'), call('students_get_students')],
    render: results => renderLargeClasses(language, year, results) };
  if (kind === 'all-classes') return { ...schoolListReplyForKind('classes', language, year), label: 'school:all-classes' };
  if (kind === 'fourth-maths-grades') return { label: 'school:fourth-maths-grades',
    calls: [call('classes_get_classes'), call('subjects_get_subjects'), call('grades_get_all')], render: results => renderFourthGrades(language, year, results) };
  if (kind === 'combined-total') return { label: 'school:combined-total', calls: [
    { name: 'students_get_student_count', input: { academicYear: year } },
    { name: 'teachers_get_teacher_count', input: { academicYear: year } }], render: results => renderSum(language, year, results) };
  if (kind === 'upcoming-exams') return { ...schoolListReplyForKind('exams', language, year, 5, schoolDate), label: 'school:upcoming-exams' };
  return kind === 'girls' ? { label: 'school:girls-count', calls: [{ name: 'students_get_students', input: { academicYear: year } }],
    render: results => renderGirls(language, year, results) }
    : { label: 'school:maths-teachers', calls: [{ name: 'subjects_get_subjects', input: {} },
      { name: 'teachers_get_teachers', input: { academicYear: year } }], render: results => renderMaths(language, year, results) };
}
