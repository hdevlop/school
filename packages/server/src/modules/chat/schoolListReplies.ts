import { normalizeReplyText, type ReplyLanguage, type ReplyTemplate } from 'najm-chatbot';

type ListKind = 'classes' | 'exams' | 'attendance';
const phrases: Record<ListKind, string[]> = {
  classes: ["Liste les classes de l'école", 'Affiche les classes de l’école',
    'اعرض قائمة أقسام المدرسة', 'عطيني اللائحة ديال الأقسام ديال المدرسة'],
  exams: ['Quels examens sont prévus prochainement', 'ما هي الامتحانات القادمة', 'شنو هوما الامتحانات اللي جايين'],
  attendance: ["Affiche les présences des élèves aujourd'hui", 'اعرض حضور التلاميذ اليوم', 'وريني الحضور ديال التلاميذ اليوم'],
};
const intentText = (text: string) => normalizeReplyText(text).replace(/’/gu, "'")
  .replace(/[.!?؟]+$/u, '').replace(/\s+/gu, ' ').trim();
const intents = new Map(Object.entries(phrases).flatMap(([kind, values]) =>
  values.map(value => [intentText(value), kind as ListKind] as const)));

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
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid school list date');
  }
  return value;
}
function time(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(value)) {
    throw new Error('Invalid school list time');
  }
  return value.slice(0, 5);
}
function relationName(value: unknown, missing = ''): string {
  if (value == null) return missing;
  const relation = row(value);
  return relation.name === null ? missing : name(relation.name);
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

function renderExams(value: unknown, language: ReplyLanguage, year: string) {
  const missing = { fr: 'Non renseigné', ar: 'غير مسجل', ary: 'ما مسجلش' }[language];
  const records = rows(value).map(record => ({ title: name(record.title),
    className: relationName(record.class, missing), section: relationName(record.section, missing),
    date: date(record.date), start: time(record.startTime), end: time(record.endTime) }));
  const empty = { fr: 'Aucun examen à venir pour cette année.', ar: 'لا توجد امتحانات قادمة لهذه السنة.', ary: 'ما كاين حتى امتحان جاي فهاد العام.' };
  if (!records.length) return `${empty[language]} (${year})`;
  records.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const header = { fr: `Prochains examens — année ${year} :`, ar: `الامتحانات القادمة للسنة الدراسية ${year}:`, ary: `هادو الامتحانات الجايين فهاد العام الدراسي ${year}:` };
  const more = { fr: 'Plus d’examens sont disponibles si vous souhaitez les voir ou les filtrer.',
    ar: 'توجد امتحانات أخرى إذا رغبت في عرضها أو تصفيتها.', ary: 'كاينين مزال امتحانات خرين، إلا بغيتي تشوفهم ولا تختار منهم.' };
  const lines = records.slice(0, 5).map(record => `- ${record.title} — ${record.className} / ${record.section} — ${record.date} — ${record.start}–${record.end}`);
  return `${header[language]}\n\n${lines.join('\n')}${records.length > 5 ? `\n\n${more[language]}` : ''}`;
}

function renderAttendance(value: unknown, language: ReplyLanguage, year: string) {
  const records = rows(value);
  const empty = { fr: "Aucun enregistrement de présence ou d'absence n'a été trouvé pour cette date.",
    ar: 'لا توجد سجلات حضور أو غياب مسجلة لهذا التاريخ.', ary: 'ما كاين حتى شي سجل ديال الحضور ولا الغياب فهاد التاريخ.' };
  if (!records.length) return `${empty[language]} (${year})`;
  const statuses = {
    fr: { present: 'Présent', absent: 'Absent', late: 'En retard' },
    ar: { present: 'حاضر', absent: 'غائب', late: 'متأخر' },
    ary: { present: 'حاضر', absent: 'غايب', late: 'جا معطل' },
  }[language];
  const entries = records.map(record => {
    if (record.type !== 'student' || typeof record.status !== 'string' || !Object.hasOwn(statuses, record.status)) {
      throw new Error('Invalid student attendance result');
    }
    const missingStudent = { fr: 'Nom de l’élève non renseigné', ar: 'اسم التلميذ غير مسجل', ary: 'سمية التلميذ ما مسجلاش' }[language];
    const details = [relationName(record.class), relationName(record.section), relationName(record.subject)].filter(Boolean).join(' / ');
    return `- ${relationName(record.student, missingStudent)} — ${date(record.date)} — ${statuses[record.status as keyof typeof statuses]}${details ? ` — ${details}` : ''}`;
  });
  const header = { fr: `Enregistrements de présence des élèves aujourd’hui — année ${year} :`,
    ar: `سجلات حضور التلاميذ اليوم للسنة الدراسية ${year}:`, ary: `هادي سجلات الحضور ديال التلاميذ اليوم فهاد العام الدراسي ${year}:` };
  const more = { fr: 'D’autres enregistrements sont disponibles dans la page des présences.',
    ar: 'توجد سجلات أخرى في صفحة الحضور والغياب.', ary: 'كاينين سجلات خرين فصفحة الحضور والغياب.' };
  return `${header[language]}\n\n${entries.slice(0, 20).join('\n')}${entries.length > 20 ? `\n\n${more[language]}` : ''}`;
}

/** Exact unqualified intents only; the shared Najm executor performs all reads and guards. */
export function schoolListReply(userText: string, language: ReplyLanguage, academicYear: string): ReplyTemplate | null {
  // Normalization removes quoted bodies; never let that hide a read qualifier.
  if (/[«»“”"`]/u.test(userText)) return null;
  const kind = intents.get(intentText(userText));
  if (!kind) return null;
  const tool = { classes: 'classes_get_classes', exams: 'exams_get_upcoming_exams', attendance: 'attendance_get_today_students' }[kind];
  return { calls: [{ name: tool, input: { academicYear } }], render: results => {
    if (results.length !== 1) throw new Error('Invalid school list result count');
    return kind === 'classes' ? renderClasses(results[0], language, academicYear)
      : kind === 'exams' ? renderExams(results[0], language, academicYear)
        : renderAttendance(results[0], language, academicYear);
  } };
}
