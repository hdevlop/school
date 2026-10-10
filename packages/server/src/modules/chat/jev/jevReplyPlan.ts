import type { ReplyLanguage, ReplyTemplate } from 'najm-chatbot';
import type { JevIntent } from './jevIntents';
import { queryVeto } from './guards/queryGuard';

export const ORDINARY_JEV_READS = ['student_count', 'teacher_count', 'student_and_teacher_count', 'class_list'] as const;
export function hasOrdinaryJevReply(query: string) {
  return ORDINARY_JEV_READS.some(choice => queryVeto(query, choice) === null);
}

type ToolReply = Extract<ReplyTemplate, { calls: unknown }>;

const scope = {
  fr: 'Résultats limités aux données accessibles à votre compte :',
  ar: 'النتائج تخص البيانات التي يسمح حسابك بالاطلاع عليها فقط:',
  ary: 'هاد النتائج غير من المعطيات اللي حسابك عندو الحق يشوفها:',
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

function countReply(language: ReplyLanguage, entities: Array<'students' | 'teachers'>, academicYear: string): ToolReply {
  return { calls: entities.map(entity => ({ name: entity === 'students' ? 'students_get_student_count' : 'teachers_get_teacher_count', input: { academicYear } })),
    render: results => renderCounts(language, entities, results) };
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

/** Formats a class list already selected by Jev and authorized by MCP. */
function classListReply(language: ReplyLanguage, academicYear: string): ToolReply {
  return { calls: [{ name: 'classes_get_classes', input: { academicYear } }], render: results => {
    if (results.length !== 1) throw new Error('Invalid school class result count');
    return renderClasses(results[0], language, academicYear);
  } };
}

/** Only the four supported Jev reads have deterministic answer formatters. */
export function jevReplyPlan(intent: JevIntent, language: ReplyLanguage, academicYear: string): ReplyTemplate | null {
  let plan: ToolReply;
  switch (intent) {
    case 'student_count': plan = countReply(language, ['students'], academicYear); break;
    case 'teacher_count': plan = countReply(language, ['teachers'], academicYear); break;
    case 'student_and_teacher_count': plan = countReply(language, ['students', 'teachers'], academicYear); break;
    case 'class_list': plan = classListReply(language, academicYear); break;
    default: return null;
  }
  return { ...plan, label: `jev:${intent}`, render: results => scope[language] + '\n' + plan.render(results) };
}
