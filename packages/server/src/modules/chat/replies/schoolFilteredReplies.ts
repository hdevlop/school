import type { ReplyLanguage, ReplyTemplate } from 'najm-chatbot';
import { schoolListReplyForKind } from './schoolListReplies';
import { schoolFilteredReplyKind } from './filtered/requests';
import { renderSeparateCounts, renderSum, renderGirls } from './filtered/counts';
import { renderLargeClasses, renderSixthCount } from './filtered/classes';
import { renderMonth, renderFourthGrades, renderMaths } from './filtered/academics';
import { renderPreviousAbsences } from './filtered/attendance';
export { FILTERED_REPLY_VERSION, schoolFilteredReplyKind } from './filtered/requests';

export function schoolFilteredReply(query: string, language: ReplyLanguage, year?: string, role?: string, schoolDate?: string): ReplyTemplate | null {
  const kind = schoolFilteredReplyKind(query);
  if (!kind) return null;
  if (kind === 'reference-clarification') return { label: 'school:reference-clarification', text: language === 'ary'
    ? 'شكون ولا شنو كتقصد بهادوك؟ وضح ليا السمية ولا الموضوع باش نجاوبك على الطلب الصحيح.'
    : language === 'ar' ? 'من أو ما المقصود؟ حدد الاسم أو الموضوع حتى أجيب عن الطلب الصحيح.'
      : 'De qui ou de quoi parlez-vous ? Précisez le nom ou le sujet pour que je réponde à votre demande.' };
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
  if (kind === 'separate-counts') return { label: 'school:separate-counts', calls: [
    call('students_get_student_count'), call('teachers_get_teacher_count')], render: results => renderSeparateCounts(language, year, results) };
  if (kind === 'sixth-primary-count') return { label: 'school:sixth-primary-count',
    calls: [call('classes_get_classes'), call('students_get_students')], render: results => renderSixthCount(language, year, results) };
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
