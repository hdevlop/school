import { expect, it } from 'bun:test';
import { componentLabel } from '@/features/Massar/config/componentLabels';
import { buildMassarDocument } from '@/features/Massar/config/massarDocument';

it('shortens only the long French components Massar writes, matched as Massar spells them', () => {
  expect(componentLabel('communication et actes de langage')).toBe('Communication');
  expect(componentLabel('Orthographe/Dictée')).toBe('Ortho./Dictée');
  // Massar writes a curly apostrophe; spacing and case do not matter.
  expect(componentLabel('Production de l’écrit')).toBe("Prod. de l'écrit");
  expect(componentLabel('  Activités  orales ')).toBe('Act. orales');
  // Short French names, Arabic names and anything unknown stay exactly as given.
  for (const name of ['Lexique', 'Graphisme', 'التعبير الكتابي', 'الإستماع والتحدث', 'Something new']) expect(componentLabel(name)).toBe(name);
});

it('prints the short name in the column header and never changes the component itself', () => {
  const components = [{ code: '1012', name: 'Orthographe/Dictée' }, { code: '1001', name: 'التعبير الكتابي' }];
  const data = { sheet: { id: 'sheet', revision: 1, className: '4APG-1', subjectName: 'اللغة الفرنسية' }, schoolName: 'School', yearLabel: '2026-2027', levelLabel: 'Level',
    round: { term: 1, exam: 1, termLabel: 'T', examLabel: 'E' }, maxMark: 10, students: [], components, marks: [] };
  const html = buildMassarDocument([data as never], { language: 'ar', title: 'Notes', student: 'Student', teacher: 'Teacher', term: 'Term', exam: 'Exam' });
  expect(html).toContain('>Ortho./Dictée</th>');
  expect(html).not.toContain('>Orthographe/Dictée</th>');
  expect(html).toContain('>التعبير الكتابي</th>');
  expect(components[0].name).toBe('Orthographe/Dictée');
});
