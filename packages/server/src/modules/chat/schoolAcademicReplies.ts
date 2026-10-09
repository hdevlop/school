import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';
import { schoolNamedChildMatches, type SchoolChatChild } from './schoolIdentityReplies';
import { schoolAcademicGradeReply } from './schoolStudentReply';

const key = (text: string) => normalizeReplyText(text).normalize('NFD').replace(/\p{M}/gu, '').trim();
function requestText(query: string): string | null {
  if (/[«»“”"`]/u.test(query)) return null;
  const text = normalizeReplyText(query).replace(/[.!?؟]+$/u, '').replace(/[،,]/gu, ' ').replace(/\s+/gu, ' ').trim();
  return /^[\p{L}\p{N}\s]+$/u.test(text) ? text : null;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid academic reply record');
  return value as Record<string, unknown>;
}
function name(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\t]/u.test(value)) throw Error('Invalid academic reply identity');
  return value.trim();
}
function clarification(language: ReplyLanguage): string {
  return language === 'ary' ? 'المادة ولا الفرض ما تحددش بوحدو. عطيني السمية كاملة والتاريخ باش نجيب غير النقط اللي كتقصد.'
    : language === 'ar' ? 'المادة أو التقييم غير محدد دون التباس. حدد الاسم الكامل والتاريخ لعرض النقاط المطلوبة.'
      : 'La matière ou l’évaluation est ambiguë. Précisez son nom complet et sa date.';
}

function unfilteredGradeWords(request: string) {
  const words = request.match(/[\p{L}\p{N}]+/gu) ?? [];
  const allowed = new Set('wach t9der twerrini t3tini 3tini werini wrini no9at nno9at no9ati dyali ana f had l3am b smit lmada w no9ta l3alama 3la ch7al kamlin النقط النقاط نقط ديالي وريني عطيني بغيت بالمادة وبالنقطة على شحال هاد العام'.split(' '));
  return words.some(word => ['no9at','nno9at','no9ati','النقط','النقاط','نقط'].includes(word))
    && /^(?:wach t9der twerrini|t9der t3tini|3tini|werini|wrini|وريني|عطيني|بغيت|النقط ديالي)(?![\p{L}\p{N}])/u.test(request)
    && words.every(word => allowed.has(word));
}

/** Closed personal requests. Unknown names/filters remain on the existing router. */
export function schoolPersonalAcademicReply(query: string, language: ReplyLanguage, year?: string, role?: string,
  studentId?: string, children?: readonly SchoolChatChild[]): ReplyTemplate | null {
  const text = requestText(query);
  if (!text || !year) return null;
  let child: SchoolChatChild | undefined;
  let request = text;
  const matches = role === 'parent' && children ? schoolNamedChildMatches(text.split(/\s+/u), children) : [];
  if (matches.length) request = matches[0].remainder.join(' ');
  const own = role === 'student' && Boolean(studentId);
  const parent = role === 'parent' && matches.length > 0;
  if (!own && !parent) return null;

  const math = '(?:f (?:math|maths|riyadiyat)|فالرياضيات|في الرياضيات)';
  const diagnostic = '(?:f diagnostic quiz|ف diagnostic quiz|في diagnostic quiz)';
  const all = own && (unfilteredGradeWords(request) && /no9ati|dyali|ديالي/u.test(request)
    || /^(?:وريني النقط ديالي بالمادة وبالنقطة على شحال|werini nno9at dyali kamlin)$/u.test(request))
    || parent && unfilteredGradeWords(request);
  const mathsOnly = new RegExp(`^(?:${own ? 'وريني النقط ديالي|werini nno9at dyali' : 'وريني النقط ديال|werini nno9at dyal'}) ${math}$`, 'u').test(request);
  const one = new RegExp(`^(?:${own ? 'ch7al jebt ana|شحال جبت انا' : 'ch7al jab|شحال جاب'}) ${math} ${diagnostic}$`, 'u').test(request);
  const count = own && new RegExp(`^(?:ch7al mn no9ta tsjlat liya ana|شحال من نقطة تسجلات ليا انا) ${diagnostic}$`, 'u').test(request);
  const combined = parent && /^3tini no9ta dyal f math w ch7al mn ghyab 3ndo had l3am$/u.test(request);
  if (!all && !mathsOnly && !one && !count && !combined) return null;
  if (parent) {
    if (matches.length !== 1) return { label: 'school:child-identity-clarification', text: language === 'ary'
      ? 'شكون من ولادك كتقصد؟ عطيني السمية كاملة باش نجيب النقط ديالو بوحدو.'
      : language === 'ar' ? 'أي طفل تقصد؟ حدد اسمه الكامل.' : 'De quel enfant parlez-vous ? Précisez son nom complet.' };
    child = matches[0].child;
  }
  const id = name(child?.id ?? studentId), base = schoolAcademicGradeReply(language, year, id, child?.name);
  if (!('calls' in base)) throw Error('Academic renderer must use a scoped read');
  if (all) return base;
  const maths = !count;
  return { label: combined ? 'school:owned-maths-and-absence' : count ? 'school:own-diagnostic-grade-count' : 'school:owned-filtered-grades',
    calls: [...base.calls, ...(combined ? [{ name: 'student-profile_get_attendance_summary', input: { studentId: id, academicYear: year } }] : [])],
    render: results => {
      if (results.length !== (combined ? 2 : 1)) throw Error('Invalid filtered academic result count');
      const academic = record(results[0]);
      if (!Array.isArray(academic.grades) || !Array.isArray(academic.assessments)) throw Error('Invalid filtered academic result');
      const grades = academic.grades.map(record), assessments = academic.assessments.map(record);
      const gradeIds = new Set<string>();
      for (const g of grades) {
        const gradeId = name(g.id);
        if (g.studentId !== id || gradeIds.has(gradeId)) throw Error('Invalid owned academic grade identity');
        gradeIds.add(gradeId);
        if (Boolean(g.assessment) === Boolean(g.exam)) throw Error('Invalid academic grade source');
      }
      const subjects = new Map<string, string>();
      const inspectSubject = (value: unknown) => {
        const s = record(value), subjectId = name(s.id), subjectName = name(s.name);
        const isMath = key(String(s.code ?? '')) === 'math' || ['math', 'maths', 'mathematiques', 'mathematics', 'رياضيات', 'الرياضيات'].includes(key(subjectName));
        if (isMath) {
          if (subjects.has(subjectId) && subjects.get(subjectId) !== subjectName) throw Error('Conflicting subject identity');
          subjects.set(subjectId, subjectName);
        }
        return subjectId;
      };
      for (const g of grades) inspectSubject(g.subject);
      for (const a of assessments) inspectSubject(a.subject);
      if (maths && subjects.size !== 1) return clarification(language);
      const subjectId = subjects.keys().next().value;
      const diagnosticMatches = (source: Record<string, unknown>, subjectName: string) => {
        const title = key(name(source.title));
        return source.type === 'quiz' && (title === 'diagnostic quiz' || title === `${key(subjectName)} · diagnostic quiz`);
      };
      const selected = grades.filter(g => {
        const s = record(g.subject), source = record(g.assessment ?? g.exam);
        name(source.id); name(source.title);
        return (!maths || s.id === subjectId) && (!(one || count) || diagnosticMatches(source, name(s.name)));
      });
      if (one) {
        // Even an ungraded second quiz makes a singular request ambiguous.
        const candidates = new Set(assessments.filter(a => record(a.subject).id === subjectId && diagnosticMatches(a, name(record(a.subject).name))).map(a => name(a.id)));
        for (const g of selected) candidates.add(name(record(g.assessment ?? g.exam).id));
        if (candidates.size > 1 || selected.length > 1) return clarification(language);
      }
      // Reuse the grade renderer's ownership and finite mark/denominator checks,
      // including for a count: malformed grades must not become valid totals.
      const gradeText = base.render([{ grades: selected }]);
      let answer = count ? (language === 'ary' ? `تسجلات ليك ${selected.length} نقطة مطابقة لـ Diagnostic quiz فـ ${year}.`
        : language === 'ar' ? `عدد نقاطك المطابقة لـ Diagnostic quiz في ${year} هو ${selected.length}.`
          : `${selected.length} notes correspondent à Diagnostic quiz en ${year}.`)
        : selected.length ? gradeText : language === 'ary' ? `ما لقيت حتى نقطة مطابقة للطلب فـ ${year}.`
          : language === 'ar' ? `لا توجد نقاط مطابقة للطلب في ${year}.` : `Aucune note ne correspond à la demande en ${year}.`;
      if (combined) {
        const attendance = record(results[1]);
        const values = ['total', 'present', 'absent', 'late'].map(field => attendance[field]);
        if (values.some(value => typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
          || values[0] !== Number(values[1]) + Number(values[2]) + Number(values[3])) throw Error('Invalid owned attendance summary');
        answer += language === 'ary' ? `\nعدد سجلات الغياب ديال ${name(child?.name)} فـ ${year}: ${attendance.absent} (من ${attendance.total} سجل حضور وغياب).`
          : language === 'ar' ? `\nعدد سجلات غياب ${name(child?.name)} في ${year}: ${attendance.absent} من ${attendance.total} سجل.`
            : `\nAbsences de ${name(child?.name)} en ${year} : ${attendance.absent} sur ${attendance.total} enregistrements.`;
      }
      return answer;
    } };
}

/** Personal subjects and pending assessments use only the authenticated teacher ID. */
export function schoolTeacherAcademicReply(query: string, language: ReplyLanguage, year?: string, role?: string, teacherId?: string): ReplyTemplate | null {
  const text = requestText(query);
  if (!text || !year || role !== 'teacher' || !teacherId) return null;
  const subjects = /^(?:chno hiya lmawadd li kan9erri ana had l3am|شنو هي المواد اللي كنقري انا هاد العام)$/u.test(text);
  const pending = /^(?:شحال من فرض باقي خاصني نصححو ولا ندخل ليه النقط|شحال من فرض باقي بلا نقط|ch7al mn fard ba9i khasni ns7ho wla ndkhel lih nno9at)$/u.test(text);
  if (!subjects && !pending) return null;
  const id = name(teacherId);
  return { label: subjects ? 'school:teacher-own-subjects' : 'school:teacher-pending-grading',
    calls: [{ name: subjects ? 'teacher-profile_get_my_classes' : 'teacher-profile_get_pending_grading', input: { teacherId: id, academicYear: year } }],
    render: results => {
      if (results.length !== 1) throw Error('Invalid teacher academic result count');
      const result = record(results[0]);
      if (subjects) {
        if (record(result.teacher).id !== id || !Array.isArray(result.classes)) throw Error('Invalid teacher assignment result');
        const names = new Map<string, string>();
        for (const assignment of result.classes) {
          const s = record(record(assignment).subject), subjectId = name(s.id), subjectName = name(s.name);
          if (names.has(subjectId) && names.get(subjectId) !== subjectName) throw Error('Conflicting teacher subject');
          names.set(subjectId, subjectName);
        }
        return language === 'ary' ? `المواد المسندة ليك فـ ${year}: ${[...names.values()].join('، ') || 'ما كاينة حتى مادة مسندة'}.`
          : language === 'ar' ? `المواد المسندة إليك في ${year}: ${[...names.values()].join('، ') || 'لا توجد مواد مسندة'}.`
            : `Vos matières en ${year} : ${[...names.values()].join(', ') || 'aucune matière affectée'}.`;
      }
      const count = result.pendingCount;
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || !Array.isArray(result.pendingAssessments)
        || result.pendingAssessments.length !== count) throw Error('Invalid pending grading count');
      const ids = new Set<string>();
      for (const value of result.pendingAssessments) {
        const a = record(value), assessmentId = name(a.id);
        name(a.title);
        if (ids.has(assessmentId) || record(a.teacher).id !== id || a.status === 'cancelled') throw Error('Invalid pending assessment identity');
        ids.add(assessmentId);
      }
      return language === 'ary' ? `عندك ${count} فرض ما تسجلات ليه حتى نقطة فـ ${year}. هاد العدد كيحسب غير الفروض بلا نقط؛ ما كيحسبش الأوراق اللي بقات ففرض تسجلات ليه شي نقط.`
        : language === 'ar' ? `لديك ${count} تقييم بلا أي نقطة مسجلة في ${year}. هذا عدد التقييمات غير المنقطة، وليس الأوراق المتبقية في تقييم منقط جزئياً.`
          : `${count} évaluations n'ont aucune note enregistrée en ${year}. Ce total ne compte pas les copies restantes des évaluations déjà partiellement notées.`;
    } };
}
