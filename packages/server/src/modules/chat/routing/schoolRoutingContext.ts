import { normalizeReplyText } from 'najm-chatbot';

/** Query-only discovery hints. No role, identity lookup or access decision. */
export function schoolRoutingContext(query: string, routingQuery = query): string {
  const text = normalizeReplyText(query);
  const hints: string[] = [];
  if (/no9at|marks|grades|notes|نقط|النقاط|النقط|النقا|نقاط/u.test(text))
    hints.push('student academic grades student-profile_get_academic grades_get_by_student');
  if (/ghyab|ghiyab|attendance|الحضور|حضر|غاب|تاخر|الغياب/u.test(text))
    hints.push('student attendance summary student-profile_get_attendance_summary');
  if (/9ism|majmou3a|class|section|القسم|المجموعة/u.test(text))
    hints.push('class section student-profile_get_overview teacher-profile_get_my_classes');
  const child = /bnti|wldi|wladi|ولدي|بنتي|ولادي|enfants?|fille|fils|child|children/u.test(text);
  const personal = child || /dyali|3ndi|عندي|ديالي|خاصتي|\bmy\b|\bmes\b|\bmon\b|\bma\b/u.test(text)
    || /no9ati|nno9ati|نقطي/u.test(text);
  if (child) hints.push('parents_get_my_identity parents_get_children resolve my linked children by returned IDs');
  else if (personal) hints.push('students_get_my_identity teachers_get_my_identity authenticated identity no ID input');
  if (/kan9erri|ken9erri|كنقري|\bi teach\b|\bj enseigne\b/u.test(text))
    hints.push('teachers_get_my_identity teacher-profile_get_my_classes teacher-profile_get_my_students own teaching assignments subjects');
  if (/ta9yim|pending|grading|نصحح|بلا نقط|ما تسجل|ma tsjjel/u.test(text))
    hints.push('teacher pending assessments teacher-profile_get_pending_grading');
  return hints.length ? `${hints.join('\n')}\n${routingQuery}` : routingQuery;
}
