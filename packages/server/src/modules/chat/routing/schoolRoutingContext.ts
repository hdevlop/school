import { normalizeReplyText } from 'najm-chatbot';

/** Query-only discovery hints. No role, identity lookup or access decision. */
export function schoolRoutingContext(query: string, routingQuery = query): string {
  const text = normalizeReplyText(query);
  const mentions = (words: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words})(?![\\p{L}\\p{N}_])`, 'u').test(text);
  const grades = mentions('n?no9at[i]?|marks|grades|notes|[وفب]?(?:نقط|النقاط|النقط|نقاط|نقطي)');
  const attendance = mentions('l?ghyab|l?ghiyab|l?7(?:o|ou)dour|7ad(?:er|ra)|ghayb|ghayeb|attendance|[وفب]?(?:الحضور|حضور|حضوري|حضر|غاب|تاخر|الغياب|غياب|غيابي|غايب|غايبين)');
  const placement = mentions('l?9ism|l?majmou3a|l?2?a9sam|classes?|sections?|[وفب]?(?:القسم|قسم|الاقسام|اقسام|المجموعة)');
  // A school's girls/children are not automatically this account's own children.
  const child = mentions('bnti|wldi|weldi|wladi|bnati|[وفب]?(?:ولدي|بنتي|ولادي|بناتي|ابني|ابنتي|اولادي)')
    || mentions('(?:my|mes|mon|ma)\\s+(?:enfants?|fille|filles|fils|child|children|daughter|daughters|son|sons)');
  const personal = child || mentions('dyali|3ndi|[وفب]?(?:عندي|ديالي|خاصتي)|my|mes|mon')
    || mentions('ma\\s+(?:classe|section|presence|présence|fiche)')
    || mentions('n?no9ati|[وفب]?(?:نقطي|غيابي|حضوري)');
  const teaching = mentions('kan9erri|ken9erri|[وفب]?كنقري|i teach|j enseigne');
  const pending = mentions('pending grading|ns7ho|ns7h|[وفب]?نصحح(?:و|هم)?|بلا نقط|ما تسجل|ma tsjjel');
  const assessments = mentions('l?forod|l?fard|assessments?|assignments?|quizzes|[وفب]?(?:الفروض|فروض|فرض)');
  // One class or level named by code or ordinal, not only by the word "class".
  const namedClass = placement
    || /(?<![\p{L}\p{N}])(?:cp|ce[12]|cm[12]|[1-6](?:ap|ac|bac)|[1-6][a-f])(?![\p{L}\p{N}])/iu.test(text)
    || mentions('ibtida2i|i3dadi|ssadis|lkhamis|rrabi3|ttalit|[وفب]?(?:ابتدائي|اعدادي|إعدادي|السادس|الخامس|الرابع|الثالث)');
  const upcoming = mentions('jay|jayin|jaya|jayen|mazal|prochains?|prochaine|upcoming|next|[وفب]?(?:الجاي|الجايين|الجاية|جاي|جايين|القادم|القادمة|المقبلة)');
  const hints: string[] = [];
  // Naming the per-class count for a whole-school question made it the primary
  // tool (13 of 113 School routing cases, 2026-11-15); offer it for one class only.
  if (mentions('ch7al|chhal|combien|how many|شحال|كم|عدد') && mentions('tlamid|tlamd|tilmid|students?|eleves?|تلميذ|تلاميذ'))
    hints.push(namedClass
      ? 'student counts students_get_student_count classes_get_class_student_count classes_get_classes'
      : 'student counts students_get_student_count');
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
  // Upcoming tests are read from the exam calendar; today's assessments only
  // answer "today" (upcoming forod routed to them in 5 of 113 cases).
  else if (assessments && upcoming)
    hints.push('upcoming exams calendar exams_get_upcoming_exams exams_get_all');
  else if (assessments)
    hints.push('assessment quizzes assignments assessments_get_all assessments_get_today_assessments');
  return hints.length ? `${hints.join('\n')}\n${routingQuery}` : routingQuery;
}
