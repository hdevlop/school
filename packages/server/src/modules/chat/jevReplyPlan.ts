import type { ReplyLanguage, ReplyTemplate } from 'najm-chatbot';
import type { JevIntent } from './jevIntents';
import { schoolCountReply, schoolChangeRefusal } from './schoolReplyTemplates';
import { schoolListReplyForKind } from './schoolListReplies';

const greetings: Record<ReplyLanguage, string> = {
  fr: 'Bonjour ! Je peux vous aider à consulter les informations de l’école.',
  ar: 'مرحبا! يمكنني مساعدتك في الاطلاع على معلومات المدرسة.',
  ary: 'مرحبا! نقدر نعاونك تشوف المعلومات ديال المدرسة.',
};
export function jevReplyPlan(intent: JevIntent, language: ReplyLanguage, academicYear: string): ReplyTemplate | null {
  let plan: ReplyTemplate | null = null;
  if (intent === 'student_count') plan = schoolCountReply(language, ['students'], academicYear);
  if (intent === 'teacher_count') plan = schoolCountReply(language, ['teachers'], academicYear);
  if (intent === 'student_and_teacher_count') plan = schoolCountReply(language, ['students', 'teachers'], academicYear);
  if (intent === 'class_list') plan = schoolListReplyForKind('classes', language, academicYear);
  if (intent === 'attendance_today') plan = schoolListReplyForKind('attendance', language, academicYear);
  if (intent === 'write_request') plan = schoolChangeRefusal(language);
  if (intent === 'small_talk') plan = { text: greetings[language] };
  // Upcoming exams remain outside the measured core acceptance policy.
  return plan ? { ...plan, label: `jev:${intent}` } : null;
}
