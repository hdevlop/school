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
