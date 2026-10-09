import type { ReplyLanguage, ReplyTemplate } from 'najm-chatbot';
import type { JevIntent } from './jevIntents';
import { schoolCountReply, schoolClassListReply, schoolReadableReply } from '../replies/schoolReplyTemplates';

/** Only the four supported Jev reads have deterministic answer formatters. */
export function jevReplyPlan(intent: JevIntent, language: ReplyLanguage, academicYear: string): ReplyTemplate | null {
  let plan: ReplyTemplate | null = null;
  if (intent === 'student_count') plan = schoolCountReply(language, ['students'], academicYear);
  if (intent === 'teacher_count') plan = schoolCountReply(language, ['teachers'], academicYear);
  if (intent === 'student_and_teacher_count') plan = schoolCountReply(language, ['students', 'teachers'], academicYear);
  if (intent === 'class_list') plan = schoolClassListReply(language, academicYear);
  return plan ? { ...schoolReadableReply(plan, language), label: `jev:${intent}` } : null;
}
