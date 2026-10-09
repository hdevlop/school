import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';

/** Only an unfiltered count of the authenticated teacher's own students. */
export function schoolTeacherCountReply(query: string, language: ReplyLanguage, academicYear?: string, role?: string, teacherId?: string): ReplyTemplate | null {
  if (role !== 'teacher' || !teacherId || !academicYear) return null;
  const text = normalizeReplyText(query);
  const tokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!tokens.some(x => ['ch7al', 'chhal', 'شحال', 'كم', 'combien'].includes(x))
    || !tokens.some(x => ['tilmid', 'tlamid', 'tlamd', 'تلميذ', 'التلاميذ', 'تلاميذ', 'élèves', 'eleves'].includes(x))
    || !tokens.some(x => ['3ndi', 'dyali', 'عندي', 'ديالي', 'تلاميذي', 'mes'].includes(x))) return null;
  // Names, section codes, subjects, gender and other qualifiers keep the router.
  const allowed = new Set(['ch7al', 'chhal', 'mn', 'tilmid', 'tlamid', 'tlamd', '3ndi', 'ana', 'dyali', 'f', 'l2a9sam', 'a9sam', 'li', 'kan9erri', 'kan9eri',
    'شحال', 'كم', 'من', 'عدد', 'تلميذ', 'التلاميذ', 'تلاميذ', 'تلاميذي', 'عندي', 'أنا', 'انا', 'ديالي', 'فالأقسام', 'فالاقسام', 'الأقسام', 'الاقسام', 'اللي', 'كنقري', 'كنقريهم',
    'combien', 'de', 'mes', 'élèves', 'eleves', 'dans', 'classes']);
  if (tokens.some(token => !allowed.has(token))) return null;
  return { label: 'school:teacher-own-student-count', calls: [{ name: 'teacher-profile_get_my_students', input: { teacherId, academicYear } }],
    render: results => {
      const count = (results[0] as { studentCount?: unknown } | null)?.studentCount;
      if (results.length !== 1 || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) throw Error('Invalid personal teacher count');
      return language === 'ary' ? `عندك ${count} تلميذ فالأقسام اللي كتقريهم فهاد العام الدراسي ${academicYear}.`
        : language === 'ar' ? `عدد تلاميذك في الأقسام التي تدرسها لهذه السنة ${academicYear} هو ${count}.`
          : `Vous avez ${count} élèves dans vos classes pour l'année scolaire ${academicYear}.`;
    } };
}
