import { expect, test } from 'bun:test';
import { countQueryVeto } from '../../src/modules/chat/jev/guards/countGuard';
import { queryVeto, explainQueryVeto } from '../../src/modules/chat/jev/guards/queryGuard';

test('a plain count can exclude names without becoming a list request', () => {
  const query = "Combien d'élèves, sans noms ?";
  expect(countQueryVeto(query, 'student_count')).toBeNull();
  expect(queryVeto(query, 'student_count')).toBeNull();
  for (const text of ["Donne les noms des élèves.", "Combien d'élèves avec leurs noms ?", `"${query}"`]) {
    expect(countQueryVeto(text, 'student_count')).not.toBeNull();
    expect(queryVeto(text, 'student_count')).not.toBeNull();
  }
});

test.each([
  ['chhal mn ostad kayn f madrasa?', 'teacher_count'],
  ['chhal mn ostad kayn f mdrasa?', 'teacher_count'],
  ['3tini lista dyal les classes li kaynin f madrasa.', 'class_list'],
])('accepts school spelling variants while preserving qualifiers: %s', (query, choice) => {
  expect(queryVeto(query, choice)).toBeNull();
  expect(queryVeto(query + ' CM2', choice)).not.toBeNull();
  expect(queryVeto(query + ' 2025-2026', choice)).not.toBeNull();
  expect(queryVeto(query + ' ZzUnknown', choice)).not.toBeNull();
});

test.each([
  ['Combien de filles dans la classe CP ?', 'student_count'],
  ["Combien d'élèves en 2025-2026 ?", 'student_count'],
  ["Combien d'élèves pour le programme ZzUnknown ?", 'student_count'],
  ["Calcule la somme du nombre d'élèves et d'enseignants.", 'student_and_teacher_count'],
  ["Enregistre l'élève Salma.", 'student_count'],
  ['imta lfard jay dyal l9ism A?', 'upcoming_exams'],
])('keeps qualified, unknown, arithmetic and write requests off the shortcut: %s', (query, choice) => {
  expect(queryVeto(query, choice)).not.toBeNull();
});

test('class-name aliases keep unknown qualifiers instead of discarding them', () => {
  const query = 'بغيت غير سميات الأقسام فالمدرسة كاملة بلا معلومات أخرى.';
  const accepted = explainQueryVeto(query, 'class_list');
  expect(accepted.veto).toBeNull();
  expect(accepted.aliases).toContain('class_names_darija');
  const filtered = explainQueryVeto(query + ' غير البنات', 'class_list');
  expect(filtered.veto).not.toBeNull();
  expect(filtered.aliases).toContain('class_names_darija');
});
