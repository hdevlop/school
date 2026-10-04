import { normalizeReplyText, type ReplyLanguage, type ReplyRequest, type ReplyTemplate } from 'najm-chatbot';

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

/** The caller supplies only the already-validated selected year. No new year resolution. */
export function schoolReplyTemplate({ userText, language }: ReplyRequest, academicYear?: string): ReplyTemplate | null {
  if (!language) return null;
  const text = normalizeReplyText(userText);
  // Match commands at the start, never quoted bodies or read requests about writes.
  const write = /^(?:enregistre(?:r|z)?|marque(?:r|z)?|crée|cree|publie|supprime|modifie|سجل|علم|دير|انشئ|انشر|احذف|عدل)(?!\p{L})/u.test(text);
  if (write && /élève|eleve|notes?|controle|contrôle|annonce|parent|presence|présence|absence|absent|حضور|غياب|غايب|غائب|حاضر|تلميذ|نقط|اعلان|الاباء|اولياء/u.test(text)) {
    const attendance = /presence|présence|absence|absent|حضور|غياب|غايب|غائب|حاضر/u.test(text);
    return { text: refusals[language][attendance ? 'attendance' : 'change'] };
  }
  const entities = countEntities(text);
  if (!entities || !academicYear) return null;
  return {
    calls: entities.map(entity => ({ name: entity === 'students' ? 'students_get_student_count' : 'teachers_get_teacher_count', input: { academicYear } })),
    render: results => renderCounts(language, entities, results),
  };
}
