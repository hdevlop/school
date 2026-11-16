import { expect, test } from 'bun:test';
import { schoolRoutingContext } from '../../src/modules/chat/routing/schoolRoutingContext';
import { rewriteDarijaForRouting } from '../../src/modules/chat/routing/darijaRouting';

test.each([
  ['bghit no9at dyal bnti', 'student-profile_get_academic'],
  ['وريني الغياب ديال ولدي', 'student-profile_get_attendance_summary'],
  ['bghit l9ism dyal wladi', 'student-profile_get_overview'],
  ['f achmen classe w section kay9ra weldi?', 'student-profile_get_overview'],
])('keeps parent-child lookup before personal records: %s', (query, detail) => {
  const result = schoolRoutingContext(query);
  expect(result).toContain('parents_get_my_identity');
  expect(result).toContain('parents_get_children');
  expect(result).toContain(detail);
});

test('class-count discovery preserves the class code and offers an explicit count read', () => {
  const query = 'شحال من تلميذ كاين ف CM2 هاد العام؟';
  const result = schoolRoutingContext(query);
  expect(result).toContain('classes_get_class_student_count');
  expect(result).toContain('classes_get_classes');
  expect(result).toEndWith(query);
});

test('a whole-school student count does not offer the per-class count', () => {
  for (const query of ['شحال من تلميذ مسجل عندنا هاد العام؟', 'ch7al mn tlamid 3ndna', 'how many students do we have?']) {
    const result = schoolRoutingContext(query);
    expect(result).toContain('students_get_student_count');
    expect(result).not.toContain('classes_get_class_student_count');
  }
});

test('a class named by level or code offers the per-class count', () => {
  for (const query of ['ch7al mn tilmid f ssadis', 'شحال من تلميذ فالسادس ابتدائي؟', 'how many students in 2B?']) {
    expect(schoolRoutingContext(query)).toContain('classes_get_class_student_count');
  }
});

test('upcoming assessments read the exam calendar, not today\'s assessments', () => {
  for (const query of ['شنو هما الفروض الجايين؟', 'werini lforod jayin', 'upcoming assignments please']) {
    const result = schoolRoutingContext(query);
    expect(result).toContain('exams_get_upcoming_exams');
    expect(result).not.toContain('assessments_get_today_assessments');
  }
});

test('assessments discover assessment records separately from exams and pending grading', () => {
  const result = schoolRoutingContext('شنو هما الفروض اللي عندنا اليوم؟');
  expect(result).toContain('assessments_get_today_assessments');
  expect(result).not.toContain('exams_get_today_exams');
  expect(result).not.toContain('teacher-profile_get_pending_grading');
});

test.each(['ch7al mn bent kayna f lmdrasa?', 'شحال من بنت فالأقسام؟',
  'Liste les filles de la classe CP.', 'Show children in class CP.'])('does not invent a personal child request: %s', query => {
  expect(schoolRoutingContext(query)).not.toContain('parents_get_my_identity');
  expect(schoolRoutingContext(query)).not.toContain('parents_get_children');
});

test.each([
  ['chno homa nno9at dyal l9ism rrabi3 f riyadiyat?', 'grades_get_by_section'],
  ['werini lghiyab dyal tlamd f chher li fat.', 'attendance_get_by_date'],
  ['شكون غايب اليوم؟', 'attendance_get_all'],
  ['werini lghiyab dyal tlamid li ma jawch', 'attendance_get_all'],
  ['bghit smiyat a9sam f lmdrasa', 'classes_get_classes'],
])('general reads discover domain tools instead of personal profiles: %s', (query, tool) => {
  const result = schoolRoutingContext(query);
  expect(result).toContain(tool);
  expect(result).not.toContain('student-profile_');
  expect(result).not.toContain('teacher-profile_');
  expect(result).not.toContain('_get_my_identity');
});

// The one-student hint pulled report-card questions to grades_get_by_student;
// a bulletin alone gave no grades hint at all. Measured 2026-11-16 on 200
// staff grades questions: right tool first 66 -> 74, other features unchanged.
test.each(['bghit kachf nno9at dyal ABID Amine', 'وريني البوليطان ديال التلميذ يوسف',
  'le bulletin de Salma Idrissi', 'report card for Omar Bennani'])('a report card gets its own hint: %s', query => {
  const result = schoolRoutingContext(query, rewriteDarijaForRouting(query));
  expect(result).toContain('grades_get_student_report');
  expect(result).not.toContain('grades_get_by_student');
});

test('a parent asking for a child\'s bulletin keeps the personal grades hint', () => {
  const result = schoolRoutingContext('bghit bulletin dyal bnti f nno9at');
  expect(result).not.toContain('grades_get_student_report');
  expect(result).toContain('student-profile_get_academic');
});

test('self grades and teaching survive the routing rewrite with separate identity chains', () => {
  for (const query of ['bghit no9ati dyali', 'بغيت نقطي']) {
    expect(schoolRoutingContext(query, rewriteDarijaForRouting(query))).toContain('students_get_my_identity');
  }
  const query = '3tini lmawadd li kan9erri dyali';
  const result = schoolRoutingContext(query, rewriteDarijaForRouting(query));
  expect(result).toContain('teachers_get_my_identity');
  expect(result).toContain('teacher-profile_get_my_classes');
  expect(result).not.toContain('students_get_my_identity');
});

test('pending grading needs pending/correction wording, not any assessment mention', () => {
  expect(schoolRoutingContext('bghit ta9yim dyal l9ism')).not.toContain('teacher-profile_get_pending_grading');
  for (const query of ['bghit forod li ba9i khasni ns7ho', 'بغيت الفروض اللي باقي خاصني نصححو']) {
    expect(schoolRoutingContext(query)).toContain('teacher-profile_get_pending_grading');
    expect(schoolRoutingContext(query)).toContain('teachers_get_my_identity');
  }
  expect(schoolRoutingContext('bghit forod li ma tsjjel fihom nno9at')).not.toContain('student-profile_get_academic');
});

test.each(['bghit l7odour dyali', 'بغيت غيابي'])('self attendance retains the identity and summary tools: %s', query => {
  const result = schoolRoutingContext(query);
  expect(result).toContain('students_get_my_identity');
  expect(result).toContain('student-profile_get_attendance_summary');
});

test.each(['classic notebook maquette filsType childhood', 'abno9at9x ghiyab_id X9ism',
  'Show "bghit no9ati dyali".', 'اعرض السجل «بنتي غايبة»'])('names, prefixes and quoted content do not create discovery hints: %s', query => {
  expect(schoolRoutingContext(query)).toBe(query);
});

test('discovery appends the supplied routing copy without changing names, IDs or dates', () => {
  const query = 'werini nno9at dyal l9ism rrabi3 f riyadiyat ab9z 4b 2025-2026';
  const routing = rewriteDarijaForRouting(query);
  expect(schoolRoutingContext(query, routing)).toEndWith('\n' + routing);
  expect(routing).toContain('ab9z 4b 2025-2026');
});

// najm-rag lowercases and folds أ/إ/آ, ى and ة before calling the hook.
const routed = (query: string) => {
  const normalized = query.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
  return schoolRoutingContext(normalized, rewriteDarijaForRouting(normalized));
};

test('hint words spelled with ة still match after najm-rag folds them', () => {
  expect(routed('شنو هي الفروض الجاية؟')).toContain('exams_get_upcoming_exams');
  expect(routed('شنو هي الأنشطة المقبلة؟')).toContain('events_get_upcoming');
});

test.each([
  'شحال باقي عليا ديال الواجبات الشهرية؟',
  'ch7al ba9i 3liya nkhelles?',
  'Combien me reste-t-il à payer pour mes enfants ?',
  'كم بقي من الرسوم على أبنائي؟',
])("a parent's own fees offer the family balance, not staff fee reports: %s", (query) => {
  const result = routed(query);
  expect(result).toContain('parent-profile_get_all_fees_due');
  expect(result).toContain('parents_get_my_identity');
  expect(result).not.toContain('fees_get_student_fees');
});

test.each([
  'شحال خاص EL AMRANI SARA تخلص؟',
  "Quels sont les frais de l'élève Karim ?",
])("a named student's fees offer that student's fee read: %s", (query) => {
  const result = routed(query);
  expect(result).toContain('fees_get_student_fees');
  expect(result).toContain('search_search_students');
  expect(result).not.toContain('parent-profile_get_all_fees_due');
});

test('a whole-school fee question gets no single-student or family hint', () => {
  const result = routed('شحال دخلنا من الرسوم هاد الشهر؟');
  expect(result).not.toContain('fees_get_student_fees');
  expect(result).not.toContain('parent-profile_get_all_fees_due');
});

test('an Arabizi absence verb about my child offers the attendance summary', () => {
  expect(routed('wach weldi kayghib bzaf?')).toContain('student-profile_get_attendance_summary');
  // Without a personal word it adds no hint: "absents aujourd'hui" routes on its own.
  expect(routed("Quels élèves sont absents aujourd'hui ?")).not.toContain('student-profile_get_attendance_summary');
});

test.each([
  ['ga3 les devoirs dyal had simana', 'homework_get_all'],
  ['wach kayn chi bus l bnti?', 'student-profile_get_transport'],
  ['واش وصلوني شي إشعارات؟', 'parent-profile_get_unread_alerts'],
  ['كاينة شي حفلة فالمدرسة اليوم؟', 'events_get_today'],
])('topic hints: %s', (query, tool) => {
  expect(routed(query)).toContain(tool);
});

test('monthly-fee wording "الواجبات الشهرية" is not homework', () => {
  expect(routed('شحال باقي عليا ديال الواجبات الشهرية؟')).not.toContain('homework_get');
});
