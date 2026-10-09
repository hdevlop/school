import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { schoolNamedChildMatches, type SchoolChatChild } from './schoolIdentityReplies';
import { qualifiedSchoolFallback } from '../routing/schoolFallbackScope';

const clean = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\t]/u.test(value)) throw Error('Invalid personal reply identity');
  return value.trim();
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid personal reply record');
  return value as Record<string, unknown>;
};
const onlyText = (query: string): string | null => {
  if (/[«»“”"`]/u.test(query)) return null;
  const text = normalizeReplyText(query).replace(/[,،]/gu, ' ').replace(/[.!?؟]+$/u, '').replace(/\s+/gu, ' ').trim();
  return /^[\p{L}\p{N}\s]+$/u.test(text) ? text : null;
};
function scopedMessage(language: ReplyLanguage): ReplyTemplate {
  return { label: 'school:personal-scope-clarification', text: language === 'ary'
    ? 'نقدر نجيب غير المعطيات المسموح بها لحسابك. بالنسبة للنقط خاص التلميذ يكون مرتبط بحسابك أو كيقرا عندك، ومعلومات الولي خاصها تكون مرتبطة بيك. إلا كتقصد شي واحد مسموح ليك تشوفو، حدد السمية كاملة.'
    : language === 'ar' ? 'يمكنني عرض البيانات المسموح بها لحسابك فقط. حدد الاسم الكامل لتلميذ مرتبط بحسابك أو تدرسه، أو ولي مرتبط بك.'
      : 'Je peux consulter uniquement les données autorisées pour votre compte. Précisez le nom complet d’un élève ou parent qui lui est lié.' };
}

/** Read/clarification only, with trusted identities and the existing MCP guards. */
export function schoolPersonalReply(query: string, language: ReplyLanguage, year?: string, role?: string,
  studentId?: string, children?: readonly SchoolChatChild[], studentName?: string): ReplyTemplate | null {
  const text = onlyText(query);
  if (!text || !year) return null;
  if (role === 'teacher' && /^chno nno9at dyal [\p{L}\p{N}\s]+ li ma kay9rach 3ndi$/u.test(text)
    || role === 'parent' && /^بغيت النقط ديال [\p{L}\p{N}\s]+ واخا ماشي ولدي$/u.test(text)) return scopedMessage(language);
  if (role === 'student' && studentId && studentName) {
    const phone = /^عطيني نمرة الولي ديال ([\p{L}\p{N}\s]+)$/u.exec(text);
    if (phone && phone[1] !== normalizeReplyText(studentName)) return scopedMessage(language);
  }
  const classRequest = /^(?:فاشمن قسم وفاشمن مجموعة مسجل انا دابا|fachmn 9ism w fachmn majmou3a msjjel ana daba)$/u.test(text)
    || qualifiedSchoolFallback(query, 'student');
  if (role === 'student' && studentId && classRequest) return {
    label: 'school:student-own-placement', calls: [{ name: 'student-profile_get_overview', input: { studentId: clean(studentId), academicYear: year } }],
    render: results => {
      if (results.length !== 1) throw Error('Invalid personal overview count');
      const student = record(record(results[0]).student);
      if (student.id !== studentId) throw Error('Invalid personal overview identity');
      if (!student.class || !student.section) return language === 'ary' ? `القسم ولا المجموعة ما واضحاش فالسجل ديالك ديال ${year}. خاص الإدارة تتأكد من التسجيل.`
        : language === 'ar' ? `القسم أو المجموعة غير محدد في سجلك لسنة ${year}. يرجى مراجعة الإدارة.`
          : `Votre classe ou groupe n’est pas renseigné pour ${year}. Consultez la direction.`;
      const klass = record(student.class), section = record(student.section);
      clean(klass.id); clean(section.id);
      if (section.classId != null && section.classId !== klass.id) throw Error('Conflicting personal placement');
      const className = clean(klass.name), sectionName = clean(section.name);
      return language === 'ary' ? `مسجل فالقسم ${className}، المجموعة ${sectionName}، فـ ${year}.`
        : language === 'ar' ? `أنت مسجل في القسم ${className}، المجموعة ${sectionName}، لسنة ${year}.`
          : `Vous êtes inscrit en classe ${className}, groupe ${sectionName}, pour ${year}.`;
    },
  };
  const matches = role === 'parent' && children ? schoolNamedChildMatches(text.split(/\s+/u), children) : [];
  const attendance = matches.length && /^(?:بغيت ملخص الحضور والغياب والتاخير ديال هاد العام|قول ليا شحال حضر وشحال غاب وشحال تاخر هاد العام)$/u.test(matches[0].remainder.join(' '));
  if (!attendance) return null;
  if (matches.length !== 1) return scopedMessage(language);
  const child = matches[0].child;
  return { label: 'school:owned-child-attendance', calls: [{ name: 'student-profile_get_attendance_summary', input: { studentId: clean(child.id), academicYear: year } }],
    render: results => {
      if (results.length !== 1) throw Error('Invalid personal attendance count');
      const result = record(results[0]);
      const values = ['total', 'present', 'absent', 'late'].map(field => result[field]);
      if (values.some(value => typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        || values[0] !== Number(values[1]) + Number(values[2]) + Number(values[3])) throw Error('Invalid personal attendance summary');
      const expected = result.total === 0 ? null : Math.round(Number(result.present) / Number(result.total) * 100);
      if (result.percentage !== expected) throw Error('Invalid personal attendance rate');
      if (!result.total) return language === 'ary' ? `ما كاين حتى سجل حضور ولا غياب ديال ${clean(child.name)} فـ ${year}. نسبة الحضور ما تحسباتش.`
        : language === 'ar' ? `لا توجد سجلات حضور أو غياب لـ ${clean(child.name)} في ${year}. نسبة الحضور غير محسوبة.`
          : `Aucun enregistrement de présence pour ${clean(child.name)} en ${year} ; aucun taux calculé.`;
      return language === 'ary' ? `ملخص ${clean(child.name)} فـ ${year}: حضر ${result.present}، غاب ${result.absent}، تأخر ${result.late}، من ${result.total} سجل. نسبة الحضور ${result.percentage}%.`
        : language === 'ar' ? `ملخص ${clean(child.name)} في ${year}: حضور ${result.present}، غياب ${result.absent}، تأخر ${result.late}، من ${result.total} سجل. نسبة الحضور ${result.percentage}%.`
          : `${clean(child.name)}, ${year} : ${result.present} présences, ${result.absent} absences, ${result.late} retards, ${result.total} enregistrements ; présence ${result.percentage}%.`;
    } };
}
