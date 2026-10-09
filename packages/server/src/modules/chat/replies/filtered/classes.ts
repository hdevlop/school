import type { ReplyLanguage } from 'najm-chatbot';
import { records, safeName, subjectName, type Row } from './records';
function classPlacements(classes: Row[], students: unknown) {
  if (!Array.isArray(students)) throw Error('Invalid class size results');
  const counts = new Map(classes.map(c => [c.id, 0]));
  const identities = new Map<string, string | null>();
  let unknown = 0;
  for (const student of students) {
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
  return { counts, unknown };
}
export function renderLargeClasses(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2) throw Error('Invalid class size results');
  const classes = records(results[0]), { counts, unknown } = classPlacements(classes, results[1]);
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
// A numeric level alone does not establish the primary cycle.
const sixthPrimary = new Set(['6aep', '6 aep', '6ap', '6 ap', '6eme primaire', '6e primaire', 'sixieme primaire',
  'السادس ابتدائي', 'السادس الابتدائي', 'السنة السادسة ابتدائي', 'السنة السادسة الابتدائية', 'السنة السادسة من التعليم الابتدائي'].map(subjectName));
export function renderSixthCount(language: ReplyLanguage, year: string, results: unknown[]): string {
  if (results.length !== 2) throw Error('Invalid sixth-primary results');
  const classes = records(results[0]), { counts, unknown } = classPlacements(classes, results[1]);
  const matches = classes.filter(c => sixthPrimary.has(subjectName(safeName(c.name)))
    || typeof c.level === 'string' && sixthPrimary.has(subjectName(c.level)));
  if (matches.length !== 1) return language === 'ary'
    ? `ما قدرتش نحدد قسم السادس ابتدائي بشكل واضح فـ ${year}. عطيني السمية أو الكود ديال القسم والسلك باش نحدد العدد الصحيح.`
    : language === 'ar' ? `لم أتمكن من تحديد قسم السادس ابتدائي دون التباس في ${year}. حدد اسم أو رمز القسم والسلك لحساب العدد الصحيح.`
      : `Classe de sixième primaire absente ou ambiguë en ${year}. Précisez son nom/code et son cycle pour déterminer l'effectif.`;
  const count = counts.get(matches[0].id)!;
  const text = language === 'ary' ? `كاينين ${count} تلميذ فالسادس ابتدائي، القسم ${safeName(matches[0].name)}، حسب سجلات العام الدراسي ${year}.`
    : language === 'ar' ? `عدد تلاميذ السادس ابتدائي، القسم ${safeName(matches[0].name)}، حسب سجلات السنة ${year} هو ${count}.`
      : `Les dossiers de ${year} indiquent ${count} élèves en sixième primaire, classe ${safeName(matches[0].name)}.`;
  return !unknown ? text : text + (language === 'ary' ? ` ولكن ${unknown} تلميذ ما عندوش قسم معروف فهاد اللائحة؛ ما نقدرش نأكد العدد النهائي.`
    : language === 'ar' ? ` لكن ${unknown} تلميذ بلا قسم معروف في هذه القائمة؛ لا يمكن تأكيد العدد النهائي.`
      : ` Mais ${unknown} élèves n'ont pas de classe identifiée dans cette liste ; le total exact ne peut pas être confirmé.`);
}
