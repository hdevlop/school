import { normalizeReplyText } from 'najm-chatbot';
import { schoolChatYearContext } from './SchoolChatContextProvider';

/** Trusted actor/latest-query discovery hints. Original names and filters stay
 * in the model input; MCP guards still own authorization of every supplied ID. */
export function schoolRoutingContext(query: string): string {
  const frame = schoolChatYearContext.getStore();
  const text = normalizeReplyText(frame?.latestUserText ?? query);
  if (frame?.role === 'student' || frame?.role === 'parent') {
    if (/(?:no9ati|nno9at|no9at|نقط|النقط|النقاط|marks|grades)/u.test(text))
      return `student academic grades student-profile_get_academic subject assessment marks studentId\n${query}`;
    if (/(?:الحضور|حضر|غاب|تاخر|الغياب|ghyab|attendance)/u.test(text))
      return `student attendance summary student-profile_get_attendance_summary present absent late studentId\n${query}`;
    if (/(?:القسم|المجموعة|9ism|majmou3a)/u.test(text))
      return `student overview student-profile_get_overview class section enrollment studentId\n${query}`;
  }
  if (frame?.role === 'teacher') {
    if (/(?:ta9yim|نصحح|بلا نقط|pending|grading|ما تسجل|ma tsjjel)/u.test(text))
      return `teacher profile pending grading teacher-profile_get_pending_grading assessments teacherId\n${query}`;
    if (/(?:التلاميذ|تلاميذ|tilmid|tlamid)/u.test(text) && /(?:عندي|ديالي|3ndi|dyali)/u.test(text))
      return `teacher profile my students teacher-profile_get_my_students teacherId student count\n${query}`;
  }
  return query;
}
