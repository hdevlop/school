import type { ReplyLanguage } from 'najm-chatbot';
import { records, safeName, validDate, subjectName, type Row } from './records';
const maths = new Set(['math', 'maths', 'mat', 'mathematics', 'mathematiques', 'رياضيات', 'الرياضيات'].map(subjectName));
const fourth = new Set(['4', '4e', '4eme', '4aep', 'quatrieme', 'الرابع', 'السنة الرابعة', 'الرابع ابتدائي', 'القسم الرابع'].map(subjectName));
export function renderMonth(language: ReplyLanguage, year: string, schoolDate: string, results: unknown[]): string {
  if (results.length !== 1) throw Error('Invalid monthly exam results');
  const month = validDate(schoolDate).slice(0, 7);
  const count = records(results[0]).filter(exam => validDate(exam.date).slice(0, 7) === month).length;
  return language === 'ary' ? `كاينين ${count} فروض مسجلين فشهر ${month} فهاد العام الدراسي ${year}، بما فيهم اللي دازو واللي مزال جايين.`
    : language === 'ar' ? `يوجد ${count} امتحان مسجل في شهر ${month} للسنة ${year}، بما في ذلك الماضي والقادم.`
      : `${count} examens sont enregistrés pour ${month}, année ${year}, passés et à venir compris.`;
}
export function renderFourthGrades(language: ReplyLanguage, year: string, results: unknown[]): string {
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
export function renderMaths(language: ReplyLanguage, year: string, results: unknown[]): string {
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
