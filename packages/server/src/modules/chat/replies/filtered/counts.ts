import type { ReplyLanguage } from 'najm-chatbot';
import { records } from './records';
function combinedCounts(results: unknown[]): number[] {
  if (results.length !== 2) throw Error('Invalid combined count results');
  return results.map(result => {
    const count = (result as { count?: unknown } | null)?.count;
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw Error('Invalid combined count');
    return count;
  });
}
export function renderSeparateCounts(language: ReplyLanguage, year: string, results: unknown[]): string {
  const [students, teachers] = combinedCounts(results);
  return language === 'ary' ? `حسب سجلات العام الدراسي ${year}: عدد التلاميذ هو ${students}، وعدد الأساتذة هو ${teachers}.`
    : language === 'ar' ? `حسب سجلات السنة ${year}: عدد التلاميذ هو ${students}، وعدد الأساتذة هو ${teachers}.`
      : `Selon les dossiers de ${year} : ${students} élèves et ${teachers} enseignants.`;
}
export function renderSum(language: ReplyLanguage, year: string, results: unknown[]): string {
  const counts = combinedCounts(results);
  const total = counts[0] + counts[1];
  if (!Number.isSafeInteger(total)) throw Error('Invalid combined count sum');
  return language === 'ary' ? `فهاد العام الدراسي ${year}، كاينين ${counts[0]} تلميذ و${counts[1]} أستاذ. المجموع هو ${total}.`
    : language === 'ar' ? `في السنة الدراسية ${year}، يوجد ${counts[0]} تلميذ و${counts[1]} أستاذ. المجموع هو ${total}.`
      : `Pour l'année ${year}, il y a ${counts[0]} élèves et ${counts[1]} enseignants. Le total est ${total}.`;
}
export function renderGirls(language: ReplyLanguage, year: string, results: unknown[]): string {
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
