import type { ReplyLanguage, ReplyRequest, ReplyTemplate } from 'najm-chatbot';
import { schoolWriteRefusalKind } from './schoolReplyWrite';

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

function renderCounts(language: ReplyLanguage, entities: Array<'students' | 'teachers'>, results: unknown[]): string {
  if (results.length !== entities.length) throw new Error('Invalid school count result count');
  const values = results.map(countResult);
  if (entities.length === 2) return language === 'ary'
    ? `كاينين ${values[0]} تلميذ مسجلين فهاد العام وكاينين ${values[1]} أستاذ.`
    : language === 'ar' ? `عدد التلاميذ المسجلين هذه السنة هو ${values[0]}، وعدد الأساتذة هو ${values[1]}.`
      : `Il y a ${values[0]} élèves inscrits cette année et ${values[1]} enseignants.`;
  const student = entities[0] === 'students';
  return language === 'ary' ? student ? `كاينين ${values[0]} تلميذ مسجلين فهاد العام.` : `كاينين ${values[0]} أستاذ.`
    : language === 'ar' ? student ? `عدد التلاميذ المسجلين هذه السنة هو ${values[0]}.` : `عدد الأساتذة هو ${values[0]}.`
      : student ? `Il y a ${values[0]} élèves inscrits cette année.` : `Il y a ${values[0]} enseignants.`;
}

export function schoolCountReply(language: ReplyLanguage, entities: Array<'students' | 'teachers'>, academicYear: string): ReplyTemplate {
  return { calls: entities.map(entity => ({ name: entity === 'students' ? 'students_get_student_count' : 'teachers_get_teacher_count', input: { academicYear } })),
    render: results => renderCounts(language, entities, results) };
}

export function schoolReadableReply(plan: ReplyTemplate, language: ReplyLanguage): ReplyTemplate {
  if (!('calls' in plan)) return plan;
  const scope = {
    fr: 'Résultats limités aux données accessibles à votre compte :',
    ar: 'النتائج تخص البيانات التي يسمح حسابك بالاطلاع عليها فقط:',
    ary: 'هاد النتائج غير من المعطيات اللي حسابك عندو الحق يشوفها:',
  };
  return { ...plan, render: results => scope[language] + '\n' + plan.render(results) };
}

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid school list row');
  return value as Row;
}

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error('Invalid school list result');
  return value.map(row);
}

function name(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/u.test(value)) throw new Error('Invalid school list name');
  return value;
}

function renderClasses(value: unknown, language: ReplyLanguage, year: string) {
  const records = rows(value);
  const empty = { fr: 'Aucune classe enregistrée pour cette année.', ar: 'لا توجد أقسام مسجلة لهذه السنة.', ary: 'ما كاين حتى قسم مسجل فهاد العام.' };
  if (!records.length) return `${empty[language]} (${year})`;
  const lines = records.map(record => {
    const sections = rows(record.sections).filter(section => !(section.id === null && section.name === null))
      .map(section => name(section.name));
    const noSections = { fr: 'Aucune section enregistrée', ar: 'لا توجد شعب مسجلة', ary: 'ما كاين حتى شعبة مسجلة' };
    return `- ${name(record.name)}: ${sections.length ? sections.join(', ') : noSections[language]}`;
  });
  const header = { fr: `Classes et sections — année ${year} :`, ar: `الأقسام والشعب للسنة الدراسية ${year}:`, ary: `هادي لائحة الأقسام والشعب فهاد العام الدراسي ${year}:` };
  return `${header[language]}\n\n${lines.join('\n')}`;
}

/** General read questions go to Jev/router; only writes have a local refusal. */
export function schoolReplyTemplate({ userText, language }: ReplyRequest): ReplyTemplate | null {
  if (!language) return null;
  const kind = schoolWriteRefusalKind(userText);
  return kind ? { text: refusals[language][kind] } : null;
}

/** Formats a class list already selected by Jev and authorized by MCP. */
export function schoolClassListReply(language: ReplyLanguage, academicYear: string): ReplyTemplate {
  return { calls: [{ name: 'classes_get_classes', input: { academicYear } }], render: results => {
    if (results.length !== 1) throw new Error('Invalid school class result count');
    return renderClasses(results[0], language, academicYear);
  } };
}
