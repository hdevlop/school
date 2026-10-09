import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';

/** An unqualified own-grade request; other students and subject/term filters use routing. */
export function schoolStudentGradeReply(query: string, language: ReplyLanguage, academicYear?: string, role?: string, studentId?: string): ReplyTemplate | null {
  if (role !== 'student' || !studentId || !academicYear) return null;
  const tokens = normalizeReplyText(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!tokens.some(x => ['النقط', 'النقاط', 'نقط', 'نقاط', 'no9at', 'nno9at', 'notes'].includes(x))
    || !tokens.some(x => ['ديالي', 'نقطي', 'dyali', 'mes'].includes(x))) return null;
  const allowed = new Set(['بغيت', 'نشوف', 'وريني', 'عطيني', 'النقط', 'النقاط', 'نقط', 'نقاط', 'نقطي', 'ديالي', 'أنا', 'انا', 'فهاد', 'هاد', 'العام',
    'bghit', 'nchof', 'werini', 'wrini', '3tini', 'no9at', 'nno9at', 'dyali', 'ana', 'f', 'had', 'l3am', 'mes', 'notes', 'affiche']);
  if (tokens.some(x => !allowed.has(x))) return null;
  return schoolAcademicGradeReply(language, academicYear, studentId);
}

/** Shared renderer after identity resolution; MCP still authorizes the supplied ID. */
export function schoolAcademicGradeReply(language: ReplyLanguage, academicYear: string, studentId: string, childName?: string): ReplyTemplate {
  const clean = (value: string) => value.replace(/[\r\n\t]/gu, ' ').trim();
  const child = childName === undefined ? undefined : clean(childName);
  if (!studentId.trim() || child === '') throw Error('Invalid academic reply identity');
  return { label: child === undefined ? 'school:student-own-grades' : 'school:child-grades', calls: [{ name: 'student-profile_get_academic', input: { studentId, academicYear } }],
    render: results => {
      const grades = (results[0] as { grades?: unknown } | null)?.grades;
      if (results.length !== 1 || !Array.isArray(grades)) throw Error('Invalid student academic result');
      if (!grades.length) return language === 'ary' ? `ما لقيت حتى نقطة مسجلة ${child === undefined ? 'ليك' : `لـ ${child}`} فهاد العام الدراسي ${academicYear}.`
        : language === 'ar' ? `لا توجد نقاط مسجلة ${child === undefined ? 'لك' : `لـ ${child}`} في السنة الدراسية ${academicYear}.`
          : `Aucune note enregistrée pour ${child ?? 'vous'} en ${academicYear}.`;
      const lines = grades.map(grade => {
        const mark = typeof grade?.marksObtained === 'number' ? grade.marksObtained
          : typeof grade?.marksObtained === 'string' && /^\d+(?:\.\d+)?$/u.test(grade.marksObtained) ? Number(grade.marksObtained) : NaN;
        const assessment = grade?.assessment ?? grade?.exam;
        const total = typeof assessment?.totalMarks === 'number' ? assessment.totalMarks
          : typeof assessment?.totalMarks === 'string' && /^\d+(?:\.\d+)?$/u.test(assessment.totalMarks) ? Number(assessment.totalMarks) : NaN;
        const subject = grade?.subject?.name, title = assessment?.title;
        if (grade?.studentId !== studentId || !Number.isFinite(mark) || mark < 0 || !Number.isFinite(total) || total <= 0 || mark > total
          || typeof subject !== 'string' || !subject.trim() || typeof title !== 'string' || !title.trim()) throw Error('Invalid own grade row');
        return `${clean(subject)} — ${clean(title)}: ${mark} / ${total}`;
      });
      const header = language === 'ary' ? `ها ${child === undefined ? 'النقط ديالك' : `النقط ديال ${child}`} المسجلة فهاد العام الدراسي ${academicYear}:`
        : language === 'ar' ? `${child === undefined ? 'نقاطك' : `نقاط ${child}`} المسجلة في السنة الدراسية ${academicYear}:`
          : `${child === undefined ? 'Vos notes' : `Notes de ${child}`} enregistrées pour ${academicYear} :`;
      return header + '\n' + lines.join('\n');
    } };
}
