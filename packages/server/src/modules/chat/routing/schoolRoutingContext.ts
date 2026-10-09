import { normalizeReplyText } from 'najm-chatbot';

/** Query-only discovery hints. No role, identity lookup or access decision. */
export function schoolRoutingContext(query: string, routingQuery = query): string {
  const text = normalizeReplyText(query);
  const mentions = (words: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words})(?![\\p{L}\\p{N}_])`, 'u').test(text);
  const grades = mentions('n?no9at[i]?|marks|grades|notes|[وفب]?(?:نقط|النقاط|النقط|نقاط|نقطي)');
  const attendance = mentions('l?ghyab|l?ghiyab|l?7(?:o|ou)dour|7ad(?:er|ra)|ghayb|ghayeb|attendance|[وفب]?(?:الحضور|حضور|حضوري|حضر|غاب|تاخر|الغياب|غياب|غيابي|غايب|غايبين)');
  const placement = mentions('l?9ism|l?majmou3a|l?2?a9sam|classes?|sections?|[وفب]?(?:القسم|قسم|الاقسام|اقسام|المجموعة)');
  // A school's girls/children are not automatically this account's own children.
  const child = mentions('bnti|wldi|wladi|bnati|[وفب]?(?:ولدي|بنتي|ولادي|بناتي|ابني|ابنتي|اولادي)')
    || mentions('(?:my|mes|mon|ma)\\s+(?:enfants?|fille|filles|fils|child|children|daughter|daughters|son|sons)');
  const personal = child || mentions('dyali|3ndi|[وفب]?(?:عندي|ديالي|خاصتي)|my|mes|mon')
    || mentions('ma\\s+(?:classe|section|presence|présence|fiche)')
    || mentions('n?no9ati|[وفب]?(?:نقطي|غيابي|حضوري)');
  const teaching = mentions('kan9erri|ken9erri|[وفب]?كنقري|i teach|j enseigne');
  const pending = mentions('pending grading|ns7ho|ns7h|[وفب]?نصحح(?:و|هم)?|بلا نقط|ما تسجل|ma tsjjel');
  const hints: string[] = [];
  if (grades && !pending) hints.push(personal
    ? 'student academic grades student-profile_get_academic grades_get_by_student'
    : placement ? 'class subject grades grades_get_by_section grades_get_by_subject'
      : 'student grades grades_get_by_student search_search_students');
  if (attendance) hints.push(personal
    ? 'student attendance summary student-profile_get_attendance_summary'
    : 'attendance date records attendance_get_by_date attendance_get_all');
  if (placement) hints.push(personal && !teaching
    ? 'class section student-profile_get_overview'
    : 'class section catalog classes_get_classes sections_get_sections');
  if (child) hints.push('parents_get_my_identity parents_get_children resolve my linked children by returned IDs');
  else if (personal && !teaching && (grades || attendance || placement))
    hints.push('students_get_my_identity teachers_get_my_identity authenticated identity no ID input');
  if (teaching)
    hints.push('teachers_get_my_identity teacher-profile_get_my_classes teacher-profile_get_my_students own teaching assignments subjects');
  if (pending)
    hints.push('teacher pending assessments teachers_get_my_identity teacher-profile_get_pending_grading');
  return hints.length ? `${hints.join('\n')}\n${routingQuery}` : routingQuery;
}
