import { normalizeReplyText } from 'najm-chatbot';

/**
 * Names the current routing text: these hints and the Darija rewrite. Stored
 * phrases are embedded through them too, so change this string whenever either
 * changes. najm-rag then marks every phrase stale; run "Reindex semantics" in
 * the RAG studio after the deploy.
 */
export const ROUTING_TEXT_VERSION = '2026-11-16 grades read hints';

/** Query-only discovery hints. No role, identity lookup or access decision. */
// najm-rag lowercases the message and folds these letters before this hook
// runs, so "الجاية" arrives as "الجايه": fold the text and every pattern alike.
const foldArabic = (value: string) => value.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

export function schoolRoutingContext(query: string, routingQuery = query): string {
  const text = foldArabic(normalizeReplyText(query));
  const mentions = (words: string) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${foldArabic(words)})(?![\\p{L}\\p{N}_])`, 'u').test(text);
  const grades = mentions('n?no9at[i]?|l?tan9it|l?ta9yimat|marks|grades|notes|r[eé]sultats|results|[وفب]?(?:نقط|النقاط|النقط|نقاط|نقطي|التنقيط|تنقيط|الدرجات|درجات|التقييمات|تقييمات|النتائج|نتائج)');
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
  const classCode = /(?<![\p{L}\p{N}])(?:cp|ce[12]|cm[12]|[1-6](?:ap|ac|bac)|[1-6][a-f])(?![\p{L}\p{N}])/iu.test(text);
  const namedClass = placement || classCode
    || mentions('ibtida2i|i3dadi|ssadis|lkhamis|rrabi3|ttalit|[وفب]?(?:ابتدائي|اعدادي|إعدادي|السادس|الخامس|الرابع|الثالث)');
  const upcoming = mentions('jay|jayin|jaya|jayen|mazal|prochains?|prochaine|upcoming|next|[وفب]?(?:الجاي|الجايين|الجاية|جاي|جايين|القادم|القادمة|المقبلة)');
  // Absence verbs. Only a personal question gets them: "absents aujourd'hui"
  // already reaches today's attendance without a hint.
  const absence = mentions('katghib|kayghib|ghab|ghabt|ghabet|absent|absente|absents|absences?|[وفب]?(?:كيغيب|كتغيب|كاتغيب|كايغيب|تغيب|تتغيب|غابت|غيابات|الغيابات)');
  // Fees. "الواجبات" is both homework and monthly fees; alone it stays homework.
  const fees = mentions('frais|fees?|scolarit[eé]|paiements?|pay(?:er|e|é|ee|ée|es|és)|paid|khles|khlest|khlst|nkhelles|nkhles|ykhelles|ykhles|lflous|flous|[وفبل]?(?:الرسوم|رسوم|خلص|خلصت|نخلص|يخلص|تخلص|الفلوس|فلوس|المستحقات|مستحقات|الاداء|الواجبات الشهرية|الواجب الشهري|الشهرية)');
  // "What I still owe" is the signed-in parent's family balance.
  const owes = mentions('3liya|3lia|عليا|تبقى علي|باقي علي|me reste|reste a payer|reste à payer|i owe|je dois');
  const familyFees = fees && (child || owes || mentions('l?wlad|[وفبل]?(?:الولاد|ولاد|لابنائي|ابنائي)'));
  // A student named: the word "student", or a Latin-script name inside an
  // Arabic-script message ("شحال باقي خاص ABID MOHAMMED AMINE يخلص"). The
  // message arrives lowercased, so letter case cannot mark a name.
  const namedStudent = mentions("l?tilmid|tlmid|eleve|élève|l'eleve|l'élève|student|[وفبل]?(?:التلميذ|تلميذ|التلميذة|تلميذة)")
    || (/\p{Script=Arabic}/u.test(text) && /(?<![\p{L}])[a-z]{2,}\s+[a-z]{2,}(?![\p{L}])/u.test(text));
  const homework = mentions('devoirs?|homework|tamarin|[وفب]?(?:التمارين|تمارين|الواجب المنزلي|الواجبات المنزلية)')
    || (!fees && mentions('[وفب]?(?:الواجبات|واجبات)'));
  const transport = mentions('kar|lkar|bus|transport|trajet|chauffeur|[وفب]?(?:الكار|كار|الطوبيس|طوبيس|الحافلة|حافلة|النقل|السائق|الشيفور)');
  const events = mentions('activit[eé]s?|events?|[eé]v[eé]nements?|sorties?|f[eê]tes?|7afla|l?7aflat|nachat|l?anchita|[وفب]?(?:الانشطة|انشطة|نشاط|النشاط|الحفلة|حفلة|الخرجة|خرجة|الخرجات|خرجات|المناسبات|مناسبة|الفعاليات|فعاليات|الرحلات|رحلة)');
  // "Did I get" makes an alert question the reader's own.
  const received = mentions('jawni|wslni|wslouni|wsltni|recu|reçu|received|[وفب]?(?:وصلوني|وصلني|وصلاتني|جاوني|جاني)');
  const alerts = mentions('alertes?|alerts?|notifications?|tanbihat|[وفب]?(?:التنبيهات|تنبيهات|تنبيه|الاشعارات|اشعارات)');
  const hints: string[] = [];
  // Naming the per-class count for a whole-school question made it the primary
  // tool (13 of 113 School routing cases, 2026-11-15); offer it for one class only.
  if (mentions('ch7al|chhal|combien|how many|شحال|كم|عدد') && mentions('tlamid|tlamd|tilmid|students?|eleves?|تلميذ|تلاميذ'))
    hints.push(namedClass
      ? 'student counts students_get_student_count classes_get_class_student_count classes_get_classes'
      : 'student counts students_get_student_count');
  // "My" with a class code is a staff member's class ("CE1 C من الأقسام ديالي",
  // "mon groupe CP C"), not the reader's own marks; a child stays the family's.
  const own = child || (personal && !classCode);
  // A report card is asked for by name, often with no word for marks. "كشف",
  // "relevé" and "الحصيلة" are also money words, so not next to fees.
  const reportCard = mentions('bulletins?|relev[eé]s? de notes|boletin(?:es)?|boletín|report cards?|full report|kachf n?no9at|bayan n?no9at|l?bolitan|[وفب]?(?:كشف النقط|كشف النقاط|كشف نتائج|بيان النقط|بيان النقاط|بيان نتائج|البوليطان|بوليطان|البولطان|بولطان|الحصيلة الدراسية)')
    || (!fees && mentions('relev[eé]s?|l?kachf|[وفب]?(?:كشف|البيان|الحصيلة)'));
  const exam = mentions('l?imti7an(?:at)?|examens?|exams?|midterm|final|[وفب]?(?:الامتحان|امتحان|الامتحانات|امتحانات)');
  const teacher = mentions('l?2?ostada?|prof|professeure?|enseignante?|teacher|[وفبل]?(?:الاستاذ|الاستاذة|استاذ|استاذة)');
  const everyClass = mentions('kol l?a?9sam|jami3 l?a?9sam|jami3 l?mostawayat|kol l?mostawayat|toutes les classes|tous les niveaux|all classes|every class|[وفب]?(?:كل الاقسام|جميع الاقسام|كل المستويات|جميع المستويات)');
  const average = mentions('l?mo3adal|moyennes?|averages?|gpa|[وفب]?(?:المعدل|معدل|المعدلات|معدلات)');
  // "What did X get": the marks of a named student, test or exam.
  const got = mentions('jab|jabat|jabet|jabo|jabou|[وفب]?(?:جاب|جابت|جابو)');
  if (reportCard && !own) hints.push('student report card grades_get_student_report search_search_students');
  else if (average && !own && !classCode && !grades)
    hints.push('school averages pass rate registrar-dashboard_get_overview academic-dashboard_get_kpis');
  else if ((grades || got) && !pending) {
    // The read for what the message names: a teacher, an exam, a class test,
    // one subject everywhere, a class, a class code (often a student's), or a student.
    if (own) hints.push('student academic grades student-profile_get_academic grades_get_by_student');
    else if (teacher && !teaching) hints.push('marks one teacher recorded grades_get_by_teacher search_search_teachers');
    else if (exam && !upcoming) hints.push('one exam results grades_get_by_exam exams_get_all');
    else if (assessments && !upcoming) hints.push('one class test results grades_get_by_assessment assessments_get_all');
    else if (everyClass) hints.push('one subject in every class grades_get_by_subject');
    else if (placement) hints.push('class subject grades grades_get_by_section grades_get_by_subject');
    else if (classCode) hints.push('class or student grades grades_get_by_section grades_get_by_student search_search_students');
    else hints.push('student grades grades_get_by_student search_search_students');
  }
  if (attendance || (absence && personal)) hints.push(personal
    ? 'student attendance summary student-profile_get_attendance_summary'
    : 'attendance date records attendance_get_by_date attendance_get_all');
  // Family questions retrieved staff fee reports (4 of 42 real chat questions,
  // 2026-11-15); a named student's fees retrieved nothing or the school list.
  if (familyFees) hints.push('family fees balance parent-profile_get_all_fees_due student-profile_get_financial');
  else if (fees && personal) hints.push('student financial balance student-profile_get_financial');
  else if (fees && namedStudent) hints.push('one student fees fees_get_student_fees search_search_students');
  // A child's homework routes on its phrases: a hint naming homework_get_by_student
  // moved 3 of 16 family homework questions to the fee or grade reads (2026-11-15).
  if (homework && !personal) hints.push('homework list homework_get_all homework_get_by_section');
  if (transport && personal) hints.push('child transport bus route student-profile_get_transport');
  if (events) hints.push(personal
    ? 'my children upcoming events parent-profile_get_all_upcoming_events events_get_upcoming'
    : upcoming ? 'upcoming school events events_get_upcoming' : 'school events events_get_today events_get_upcoming');
  if (alerts) hints.push(personal || received
    ? 'my unread alerts about my children parent-profile_get_unread_alerts'
    : 'school alerts alerts_get_active_alerts alerts_list_recent_alerts');
  if (placement) hints.push(personal && !teaching
    ? 'class section student-profile_get_overview'
    : 'class section catalog classes_get_classes sections_get_sections');
  if (child || familyFees) hints.push('parents_get_my_identity parents_get_children resolve my linked children by returned IDs');
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
