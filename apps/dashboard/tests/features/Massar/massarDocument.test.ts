import { expect, it } from 'bun:test';
import { buildMassarDocument } from '@/features/Massar/config/massarDocument';

const printed = (students: number) => buildMassarDocument([{
  sheet: { id: 'sheet', revision: 1, className: '2APG-2', subjectName: 'Arabic' }, schoolName: 'School', yearLabel: '2026-2027', levelLabel: 'Level',
  round: { term: 1, exam: 1, termLabel: 'T', examLabel: 'E' }, maxMark: 10, components: [{ code: 'a', name: 'Lexique' }], marks: [],
  students: Array.from({ length: students }, (_, position) => ({ id: `s${position}`, name: `Student ${position}`, studentCode: `F${position}`, position })),
} as never], { language: 'ar', title: 'Notes', student: 'Student', teacher: 'Teacher', term: 'Term', exam: 'Exam' });

it('compacts a class that would spill onto a second page, and only that class', () => {
  // The usual sheet holds 25 students whatever the part names are.
  for (const students of [1, 25]) expect(printed(students)).toContain('<section class="sheet" ');
  for (const students of [26, 32, 38]) expect(printed(students)).toContain('<section class="sheet compact" ');
  // Too many for one page even when compact: the usual rows, on two pages.
  for (const students of [39, 45]) expect(printed(students)).toContain('<section class="sheet" ');
});

it('prints every student of a compact sheet', () => {
  expect(printed(32).match(/<td class="number">/g)).toHaveLength(32);
});
