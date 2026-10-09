import { normalizeReplyText, type ReplyLanguage, type ReplyRequest, type ReplyTemplate } from 'najm-chatbot';
import { schoolListReply } from './schoolListReplies';
import { schoolWriteRefusalKind } from './schoolReplyWrite';
import { schoolFilteredReply } from './schoolFilteredReplies';
import { schoolYearReply } from './schoolYearReply';
import { schoolTeacherCountReply } from './schoolTeacherReply';
import { schoolStudentGradeReply } from './schoolStudentReply';
import { schoolChildGradeReply, schoolClassIdentityReply, type SchoolChatChild } from './schoolIdentityReplies';
import { schoolPersonalAcademicReply, schoolTeacherAcademicReply } from './schoolAcademicReplies';
import { schoolPersonalReply } from './schoolPersonalReplies';

const refusals: Record<ReplyLanguage, { attendance: string; change: string }> = {
  ary: {
    attendance: 'ما نقدرش نسجل أو نبدل الحضور والغياب هنا. خاصك تستعمل صفحة الحضور والغياب فلوحة التحكم.',
    change: 'ما نقدرش ندير هاد التغيير فهاد الدردشة. خاصك تستعمل لوحة التحكم.',
  },
  ar: {
    attendance: 'لا يمكنني تسجيل أو تعديل الحضور والغياب في هذه الدردشة. يرجى استخدام صفحة الحضور والغياب في لوحة التحكم.',
    change: 'لا يمكنني إجراء هذا التغيير في هذه الدردشة. يرجى استخدام لوحة التحكم.',
  },
  fr: {
    attendance: 'Je ne peux pas enregistrer ou modifier les présences et les absences dans cette conversation. Utilisez la page des présences du tableau de bord.',
    change: 'Je ne peux pas effectuer cette modification dans cette conversation. Utilisez le tableau de bord.',
  },
};

function countResult(result: unknown): number {
  const count = (result as { count?: unknown } | null)?.count;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid school count result');
  return count;
}

/** Recognize general totals only. Any unrecognized qualifier stays on the model/tool path. */
function countEntities(text: string): Array<'students' | 'teachers'> | null {
  if (!/^(?:combien|كم|شحال)(?!\p{L})/u.test(text)) return null;
  const students = /(?<!\p{L})(?:élèves?|eleves?|و?(?:تلميذ|التلميذ|تلاميذ|التلاميذ))(?!\p{L})/u.test(text);
  const teachers = /(?<!\p{L})(?:enseignants?|professeurs?|و?(?:استاذ|الاستاذ|اساتذة|الاساتذة))(?!\p{L})/u.test(text);
  if (!students && !teachers) return null;
  const remainder = text
    .replace(/(?<!\p{L})(?:combien|y|a|t|il|d|de|et|élèves?|eleves?|enseignants?|professeurs?|sont|inscrits?|inscrites?|compte|l|école|ecole|cette|année|annee|كم|عدد|من|التلاميذ|تلاميذ|التلميذ|تلميذ|المسجلين|مسجل|مسجلين|هذه|السنة|سنة|العام|عام|وكم|وعدد|والاساتذة|واساتذة|والتلاميذ|الاساتذة|اساتذة|الاستاذ|استاذ|في|المدرسة|شحال|وشحال|كاين|كاينين|فالمدرسة|هاد)(?!\p{L})/gu, '')
    .replace(/[\s?!؟.,’'\-]/gu, '');
  return remainder ? null : [...(students ? ['students' as const] : []), ...(teachers ? ['teachers' as const] : [])];
}

function renderCounts(language: ReplyLanguage, entities: Array<'students' | 'teachers'>, results: unknown[]): string {
  if (results.length !== entities.length) throw new Error('Invalid school count result count');
  const values = results.map(countResult);
  if (entities.length === 2) return language === 'ary'
    ? `كاينين ${values[0]} تلميذ مسجلين فهاد العام وكاينين ${values[1]} أستاذ فالمدرسة.`
    : language === 'ar' ? `عدد التلاميذ المسجلين هذه السنة هو ${values[0]}، وعدد الأساتذة هو ${values[1]}.`
      : `Il y a ${values[0]} élèves inscrits cette année et ${values[1]} enseignants dans l'école.`;
  const student = entities[0] === 'students';
  return language === 'ary' ? student ? `كاينين ${values[0]} تلميذ مسجلين فهاد العام.` : `كاينين ${values[0]} أستاذ فالمدرسة.`
    : language === 'ar' ? student ? `عدد التلاميذ المسجلين هذه السنة هو ${values[0]}.` : `عدد الأساتذة في المدرسة هو ${values[0]}.`
      : student ? `Il y a ${values[0]} élèves inscrits cette année.` : `Il y a ${values[0]} enseignants dans l'école.`;
}

/** Intent mapping reuses these validated renderers; the MCP boundary owns every read. */
export function schoolCountReply(language: ReplyLanguage, entities: Array<'students' | 'teachers'>, academicYear: string): ReplyTemplate {
  return { calls: entities.map(entity => ({ name: entity === 'students' ? 'students_get_student_count' : 'teachers_get_teacher_count', input: { academicYear } })),
    render: results => renderCounts(language, entities, results) };
}
export function schoolChangeRefusal(language: ReplyLanguage): ReplyTemplate { return { text: refusals[language].change }; }

/** The caller supplies only the already-validated selected year. No new year resolution. */
export function schoolReplyTemplate({ userText, language, channel }: ReplyRequest, academicYear?: string, role?: string, schoolDate?: string, teacherId?: string, studentId?: string, children?: readonly SchoolChatChild[], studentName?: string): ReplyTemplate | null {
  if (!language) return null;
  const text = normalizeReplyText(userText);
  const writeKind = schoolWriteRefusalKind(userText);
  if (writeKind) return { text: refusals[language][writeKind] };
  if (channel === 'web') {
    const yearReply = schoolYearReply(userText, language, academicYear, role);
    if (yearReply) return yearReply;
    const personalReply = schoolPersonalReply(userText, language, academicYear, role, studentId, children, studentName);
    if (personalReply) return personalReply;
    const academicReply = schoolTeacherAcademicReply(userText, language, academicYear, role, teacherId)
      ?? schoolPersonalAcademicReply(userText, language, academicYear, role, studentId, children);
    if (academicReply) return academicReply;
    const teacherReply = schoolTeacherCountReply(userText, language, academicYear, role, teacherId);
    if (teacherReply) return teacherReply;
    const studentReply = schoolStudentGradeReply(userText, language, academicYear, role, studentId);
    if (studentReply) return studentReply;
    const identityReply = schoolClassIdentityReply(userText, language, academicYear, role)
      ?? schoolChildGradeReply(userText, language, academicYear, role, children);
    if (identityReply) return identityReply;
    const filtered = schoolFilteredReply(userText, language, academicYear, role, schoolDate);
    if (filtered) return filtered;
  }
  if (academicYear) {
    const list = schoolListReply(userText, language, academicYear);
    if (list) return list;
  }
  const entities = countEntities(text);
  if (!entities || !academicYear) return null;
  return schoolCountReply(language, entities, academicYear);
}
