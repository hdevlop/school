import { normalizeReplyText } from 'najm-chatbot';
import { schoolReplyLanguage } from './schoolReplyLanguage';

// Compatibility export; config and context use the same School profile.
export { schoolReplyLanguage } from './schoolReplyLanguage';

/** School policy only. Najm supplies the latest-message language instruction. */
export function schoolReplyContext(userText: string): string | null {
  const language = schoolReplyLanguage(userText);
  if (!language) return null;
  const text = normalizeReplyText(userText);
  const hints: string[] = [];
  if (/(?<![\p{L}\p{N}])(?:no9ati|nno9at|no9at|no9ta|notes?|grades?|marks|النقط|نقط|النقاط|نقاط|نقطة)(?![\p{L}\p{N}])/u.test(text)
    || /(?<![\p{L}\p{N}])(?:jab|jebt|جاب|جبت)(?![\p{L}\p{N}])/u.test(text) && /math|رياضيات|diagnostic quiz/u.test(text)) {
    hints.push('This asks for academic grades/marks, not attendance statistics. For the signed-in student or an authorized child, student-profile_get_academic with a studentId returned by students_get_my_identity for oneself, or parents_get_my_identity then parents_get_children for a child returns grades. grades_get_by_student is also a valid grade read. Summarize only actual returned marks and their assessment/subject; never substitute attendance percentages for grades. If no grade read is offered or succeeds, explain that grades could not be retrieved.');
    if (/ghyab|ghiyab|غياب/u.test(text)) hints.push('This mixed request also asks for absences. Read the authorized student attendance summary separately and answer both parts; never infer absences from grade data or replace the requested marks with attendance.');
  }
  if (/lmawadd|المواد/u.test(text) && /kan9erri|كنقري/u.test(text)) hints.push('For the signed-in teacher’s subjects, teacher-profile_get_my_classes returns each assignment’s subject. List those actual subject names, deduplicated by subject ID, rather than class/section names or rooms.');
  if (/نصححو|ns7ho|بلا نقط|ta9yim|ma tsjjel/u.test(text)) hints.push('teacher-profile_get_pending_grading with the teacherId returned by teachers_get_my_identity returns pendingCount and pendingAssessments. It counts assessments with no grades recorded, excluding cancelled assessments, not remaining student papers in partially graded assessments.');
  if (language === 'fr' && /(?<!\p{L})(?:notes?|identifiants?)(?!\p{L})/u.test(text)) {
    hints.push('In French student lookup replies, use "identifiant de l’élève" or "code de l’élève", never the English label "student ID". Preserve actual stored names and codes unchanged.');
  }
  if (/pr[eé]sences?|absences?|attendance|حضور|غياب/u.test(text)) {
    const emptyAttendance = {
      fr: "Aucun enregistrement de présence ou d'absence n'a été trouvé pour cette date.",
      ar: 'لا توجد سجلات حضور أو غياب مسجلة لهذا التاريخ.',
      ary: 'ما كاين حتى شي سجل ديال الحضور ولا الغياب فهاد التاريخ.',
    }[language];
    hints.push(`For attendance read results: only a successful attendance tool returning [] establishes an empty attendance result, not an outage. Say "${emptyAttendance}" only for that attendance read's requested date and selected year. A successful [] from search_search_students means no matching student was found; it establishes nothing about attendance. If the student lookup has no match, report that lookup result and stop: do not claim no absence records, invent a date, infer attendance status, or try another person's records. Do not say a successful empty attendance read is unavailable, suggest checking settings/retrying, or infer anyone's attendance status. Only an actual tool error or denial justifies an error/refusal message. Attendance write requests still use the read-only refusal.`);
  }
  if (/exam|امتحان|اختبار/u.test(text) && /prochain|prevu|prévu|upcoming|القادم|الجاي|جايين|مقبل/u.test(text)
    && !/\b(?:tous|toutes|all)\b|جميع|كامل|كل الامتحانات/u.test(text)) {
    hints.push('For this upcoming-exams request: show at most five chronological exam rows, then one short sentence that more are available. Do not print the full tool list or infer a remaining count.');
  }
  if (/combien|nombre|count|how many|كم|عدد|شحال/u.test(text)
    && /eleve|élève|تلميذ|تلاميذ|student/u.test(text) && /enseignant|professeur|استاذ|اساتذة|teacher/u.test(text)) {
    hints.push('This request asks for both counts: read both student and teacher counts, then give both in one visible sentence in the request reply language.');
  }
  return hints.join('\n') || null;
}
