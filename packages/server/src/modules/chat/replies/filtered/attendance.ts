import type { ReplyLanguage } from 'najm-chatbot';
import { ATTENDANCE_STATUS_VALUES } from '@sms/contracts';
import { records, safeName, validDate, type Row } from './records';
export function renderPreviousAbsences(language: ReplyLanguage, year: string, schoolDate: string, results: unknown[]): string {
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
