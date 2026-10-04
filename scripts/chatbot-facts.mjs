/** Deterministic, row-bound school facts. No model calls; diagnostic values are indices only. */
export const normalize = (text) => String(text ?? '').normalize('NFC').toLowerCase()
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا')
  .replace(/[*`]/g, '').replace(/[‑–—]/g, '-').replace(/[^\S\n]+/g, ' ');
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function hasValue(text, value) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(value))}(?![\\p{L}\\p{N}])`, 'u').test(normalize(text));
}
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const strings = (value) => Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string' && v.trim());
const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const validTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
export function validateSchoolFacts(facts) {
  if (!record(facts) || !['exams', 'classes'].includes(facts.kind) || !Array.isArray(facts.records)
    || !facts.records.length || !Number.isInteger(facts.totalCount) || facts.totalCount < facts.records.length) return false;
  if (facts.kind === 'classes' && facts.totalCount !== facts.records.length) return false;
  const keys = new Set();
  return facts.records.every((row) => {
    if (!record(row)) return false;
    const key = facts.kind === 'classes' ? row.name : `${row.class}/${row.section}/${row.date}/${row.startTime}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return facts.kind === 'classes'
      ? typeof row.name === 'string' && row.name.trim() && strings(row.sections)
        && new Set(row.sections).size === row.sections.length
      : ['title', 'subject', 'class', 'section'].every((k) => typeof row[k] === 'string' && row[k].trim())
        && validDate(row.date) && validTime(row.startTime) && validTime(row.endTime)
        && row.startTime.slice(0, 5) < row.endTime.slice(0, 5);
  });
}

const MONTHS = [
  ['janvier', 'يناير'], ['février', 'فبراير'], ['mars', 'مارس'], ['avril', 'ابريل'],
  ['mai', 'ماي', 'مايو'], ['juin', 'يونيو'], ['juillet', 'يوليوز', 'يوليو'], ['août', 'غشت', 'اغسطس'],
  ['septembre', 'شتنبر', 'سبتمبر'], ['octobre', 'oct', 'oct.', 'اكتوبر'], ['novembre', 'نونبر', 'نوفمبر'], ['décembre', 'دجنبر', 'ديسمبر'],
];
function canonical(text) {
  let result = normalize(text)
    .replace(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g, (_, d, m, y) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
    .replace(/\b(\d{1,2})\s*[h:]\s*(\d{2})(?::00)?\b/g, (_, h, m) => `${h.padStart(2, '0')}:${m}`);
  MONTHS.forEach((names, index) => {
    for (const name of names) {
      result = result.replace(new RegExp(`(\\d{1,2})\\s+${escape(name)}\\s+(\\d{4})`, 'gu'),
        (_, d, y) => `${y}-${String(index + 1).padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
  });
  return result;
}

// Known numeric claims around domain words. Remove dates, times, class codes,
// academic years and list ordinals first so they cannot be treated as counts.
const NUMBER_WORDS = {
  zero: 0, zéro: 0, صفر: 0, one: 1, un: 1, une: 1, واحد: 1, two: 2, deux: 2, جوج: 2, اثنان: 2,
  three: 3, trois: 3, ثلاثة: 3, تلاتة: 3, four: 4, quatre: 4, اربعة: 4, ربعة: 4, five: 5, cinq: 5, خمسة: 5,
  six: 6, ستة: 6, ستا: 6, seven: 7, sept: 7, سبعة: 7, eight: 8, huit: 8, ثمانية: 8, تمنية: 8, تمانية: 8,
  nine: 9, neuf: 9, تسعة: 9, تسعود: 9, ten: 10, dix: 10, عشرة: 10, eleven: 11, onze: 11, حداش: 11, حداشر: 11,
  twelve: 12, douze: 12, طناش: 12, طناشر: 12, تناش: 12, اثناش: 12, thirteen: 13, treize: 13, تلطاش: 13, تلتاش: 13,
  fourteen: 14, quatorze: 14, ربعطاش: 14,
  fifteen: 15, quinze: 15, sixteen: 16, seize: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, vingt: 20, عشرون: 20, عشرين: 20, thirty: 30, trente: 30, ثلاثون: 30,
};
function countFailures(text, facts, shown) {
  let cleaned = canonical(text).replace(/\d{4}-\d{2}-\d{2}|\d{4}\s*-\s*\d{4}|\d{2}:\d{2}/g, ' ');
  for (const name of MONTHS.flat()) {
    cleaned = cleaned.replace(new RegExp(`(?<!\\d)\\d{1,2}\\s+${escape(name)}(?!\\p{L})`, 'gu'), ' ');
  }
  cleaned = cleaned
    .replace(/(?:اثنا|اثني|اثنتا|اثنتي)\s+عشر(?:ة)?/gu, '12')
    .replace(/(?:احد|احدى)\s+عشر(?:ة)?/gu, '11')
    .replace(/(ثلاثة|اربعة|خمسة|ستة|سبعة|ثمانية|تسعة)\s+عشر(?:ة)?/gu, (_, number) => String(NUMBER_WORDS[number] + 10))
    .replace(/\b(?:c[emp]\d*|\d+ac)\b/gi, ' ').replace(/^\s*\d+(?:[.)]|\ufe0f?\u20e3)\s*/gm, '');
  const failures = [];
  for (const [index, sentence] of cleaned.split(/[\n.!?؟؛]+/u).entries()) {
    const domain = facts.kind === 'exams' ? /exam|امتحان|امتحانات|اختبار|اختبارات|فروض/u : /class|قسم|اقسام/u;
    if (!domain.test(sentence)) continue;
    const remaining = /remain|restant|reste|autres|باقي|باقين|متبقي|اخرى/u.test(sentence);
    const total = /total|مجموع|اجمالي|عددها|عدد الامتحانات|عدد الاقسام/u.test(sentence);
    const sections = facts.kind === 'classes' && /sections|شعب/u.test(sentence);
    const each = /chaque|each|كل/u.test(sentence);
    const totalSections = facts.kind === 'classes' ? facts.records.reduce((sum, row) => sum + row.sections.length, 0) : 0;
    const allowed = sections ? each ? [...new Set(facts.records.map((row) => row.sections.length))] : [totalSections]
      : remaining ? [facts.totalCount - shown] : total ? [facts.totalCount] : [shown, facts.totalCount];
    const words = sentence.split(/[^\p{L}\p{N}]+/u);
    const values = words.flatMap((word) => /^\d+$/.test(word) ? [Number(word)]
      // "un examen précis" is an article, but "il reste un examen" claims one.
      : ['un', 'une'].includes(word) && !remaining && !total ? []
        : Object.hasOwn(NUMBER_WORDS, word) ? [NUMBER_WORDS[word]] : []);
    if (values.some((value) => !allowed.includes(value))) failures.push({ code: 'count', index });
  }
  return failures;
}

export function scoreSchoolFacts(text, facts) {
  if (!facts) return { factFailures: [], factReviewRequired: false };
  const plain = canonical(text);
  const failures = [];
  const lines = plain.split('\n').map((line) => line.trim()).filter(Boolean);
  let shown = 0;
  if (facts.kind === 'exams') {
    const dates = lines.filter((line) => /\b(?:cp|ce\d+|cm\d+|\d+ac)\b/i.test(line))
      .flatMap((line) => [...line.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]));
    if (dates.length !== facts.records.length) failures.push({ code: 'exam_row_count' });
    facts.records.forEach((exam, index) => {
      if (dates[index] !== exam.date) failures.push({ code: 'exam_order', index });
      // Date anchors a record; never match a title/section/time from another row.
      const anchors = lines.flatMap((line, i) => line.includes(exam.date) ? [i] : []);
      const candidates = anchors.map((i) => {
        let start = i;
        // Support a multiline bullet record, but never cross another dated row.
        while (start > 0 && !/\d{4}-\d{2}-\d{2}|^\s*(?:[-*]|\d+[.)])\s|\|/.test(lines[start - 1])) start--;
        return lines.slice(start, i + 1).join(' ');
      });
      const row = candidates.find((line) => hasValue(line, exam.class));
      if (!row) { failures.push({ code: 'exam_missing', index }); return; }
      shown++;
      if (!hasValue(row, exam.title) && !hasValue(row, exam.subject)) failures.push({ code: 'exam_name', index });
      if (facts.records.some((other) => other.title !== exam.title && hasValue(row, other.title))) failures.push({ code: 'exam_name', index });
      const classes = row.match(/\b(?:CP|CE\d+|CM\d+|\d+AC)\b/gi) ?? [];
      if (classes.some((name) => normalize(name) !== normalize(exam.class))) failures.push({ code: 'exam_class', index });
      const sections = row.match(/(?<![\p{L}\p{N}])(?:\d+)?[a-z](?:\d+)?(?![\p{L}\p{N}])/gu) ?? [];
      if (sections.length !== 1 || sections[0] !== normalize(exam.section)) failures.push({ code: 'exam_section', index });
      const times = row.match(/\b\d{2}:\d{2}(?::\d{2})?\b/g) ?? [];
      const sameTime = (actual, expected) => actual === expected.slice(0, 5) || actual === expected;
      if (!times.length || !sameTime(times[0], exam.startTime)
        || times.length > 2 || (times.length === 2 && !sameTime(times[1], exam.endTime))) failures.push({ code: 'exam_time', index });
    });
    if (dates.some((date) => !facts.records.some((exam) => exam.date === date))) failures.push({ code: 'exam_date' });
  } else {
    const codes = plain.match(/\b(?:CP|CE\d+|CM\d+|\d+AC)\b/gi) ?? [];
    if (codes.some((code) => !facts.records.some((row) => normalize(row.name) === normalize(code)))) failures.push({ code: 'class_unknown' });
    facts.records.forEach((klass, index) => {
      const rows = lines.filter((line) => hasValue(line, klass.name));
      if (rows.length !== 1) { failures.push({ code: 'class_missing_or_duplicate', index }); return; }
      shown++;
      const sections = rows[0].match(/(?<![\p{L}\p{N}])(?:\d+)?[a-z](?:\d+)?(?![\p{L}\p{N}])/gu) ?? [];
      if (sections.length !== klass.sections.length || sections.some((s) => !klass.sections.map(normalize).includes(s))
        || new Set(sections).size !== sections.length) failures.push({ code: 'class_sections', index });
    });
  }
  failures.push(...countFailures(text, facts, shown));
  return { factFailures: failures, factReviewRequired: false };
}
