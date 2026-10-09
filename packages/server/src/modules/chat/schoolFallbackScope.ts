import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { queryVetoV6 } from './jevQueryGuard';
import { readSchoolChatControls } from './schoolChatControls';

export const ORDINARY_JEV_READS = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list'] as const;
export function hasOrdinaryJevReply(query: string) {
  return ORDINARY_JEV_READS.some(choice => queryVetoV6(query, choice) === null);
}
/** Selective 20B release scope. Unknown workflows clarify locally until their
 * tool AND answer quality is qualified; there is no automatic 120B escalation. */
export function qualifiedSchoolFallback(query: string, role?: string): boolean {
  if (['admin','principal'].includes(role ?? '')) return hasOrdinaryJevReply(query);
  if (/["«»“”`()[\]{}]/u.test(query)) return false;
  const text = normalizeReplyText(query), words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const allowed = role === 'student'
    ? 'بغيت نعرف سميت القسم والمجموعة ديالي دابا فين مسجل انا فاشمن قسم وفاشمن مجموعة قول ليا واش شنو هو هي فهاد هاد العام fachmn 9ism w majmou3a dyali ana daba fin msjjel bghit n3ref smit l9ism lmajmou3a'
    : role === 'teacher'
      ? 'بغيت عدد التلاميذ اللي كيقراو عندي فالاقسام ديالي هاد العام شحال من تلميذ فاقسامي فالاقسام الخاصة بيا عطيني قول ليا 3tini ch7al mn ta9yim 3ndi mazal ma tsjjel fih 7ta no9ta had l3am باقي فرض فروض تقييم تقييمات التقييمات بلا نقط ما تسجلات ليه حتى نقطة حتى no9at tlamid tilmid f l9sam dyali'
      : '';
  const vocabulary = new Set(normalizeReplyText(allowed).split(/\s+/u));
  if (!words.length || words.some(word => !vocabulary.has(word))) return false;
  if (role === 'student') return /القسم|قسم|9ism|l9ism/u.test(text) && /المجموعة|مجموعة|majmou3a|lmajmou3a/u.test(text);
  return role === 'teacher' && (/التلاميذ|تلميذ|tlamid|tilmid/u.test(text) && /عندي|ديالي|3ndi|dyali/u.test(text)
    || /تقييم|فرض|فروض|ta9yim/u.test(text) && /بلا نقط|ما تسجل|ما تسجلات|ma tsjjel/u.test(text));
}
export function schoolFallbackScopeReply(query: string, language: ReplyLanguage | null, role?: string, studentId?: string, teacherId?: string): ReplyTemplate | null {
  const identity = role === 'student' ? Boolean(studentId) : role === 'teacher' ? Boolean(teacherId) : true;
  if (!readSchoolChatControls().enabled || qualifiedSchoolFallback(query, role) && identity) return null;
  return { label:'school:unsupported-release-scope', text: language === 'ary'
    ? 'هاد الطلب ما نقدرش نجاوب عليه بمعطيات مؤكدة هنا. وضح شنو بغيتي بالضبط، أو شوف المعطيات فلوحة التحكم.'
    : language === 'ar' ? 'لا أستطيع تأكيد الإجابة عن هذا الطلب هنا. حدد المطلوب بدقة أو راجع البيانات في لوحة التحكم.'
      : language === 'fr' ? 'Je ne peux pas confirmer les données demandées ici. Précisez votre demande ou consultez le tableau de bord.'
        : 'I cannot confirm this request here. Clarify what you need or check the data in the dashboard.' };
}
