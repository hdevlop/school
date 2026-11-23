import { describe, expect, it } from 'bun:test';
import { buildTeacherDeskCards, deskCard, deskCardLanguage, taughtClasses, type DeskCardOptions } from '@/features/Teachers/config/teacherDeskCards';

const subjects = [
  { id: 'ar', name: 'العربية', nameAr: 'اللغة العربية' },
  { id: 'ei', name: 'التربية الإسلامية' },
  { id: 'fr', name: 'Français' },
  { id: 'math', name: 'Mathématiques' },
];
const classes = [
  { id: 'ce1', name: 'CE1', sections: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] },
  { id: 'cp', name: 'CP', sections: [{ id: 'c', name: 'A' }] },
];
const options: DeskCardOptions = {
  subjects, classes, school: { name: 'École Najm', nameAr: 'مدرسة نجم' }, year: '2026-2027',
  fallback: 'fr', assetOrigin: 'https://school.test', accent: { color: '#d64e57', foreground: '#ffffff' },
};
const teacher = (id: string, subjectIds: string[], extra = {}) => ({
  id, name: `Teacher ${id}`, gender: 'F', assignments: [{ classId: 'ce1', sectionIds: ['a', 'b'], subjectIds }], ...extra,
});

describe('teacher desk cards', () => {
  it('reads in the language its subjects are taught in', () => {
    expect(deskCardLanguage([subjects[0], subjects[1]], 'fr')).toBe('ar');
    expect(deskCardLanguage([subjects[2], subjects[3]], 'ar')).toBe('fr');
    // A tie follows the first subject; no subject, the interface.
    expect(deskCardLanguage([subjects[2], subjects[0]], 'ar')).toBe('fr');
    expect(deskCardLanguage([], 'ar')).toBe('ar');
  });

  it('names an Arabic subject by its Arabic name, and the teacher by gender', () => {
    const card = deskCard(teacher('1', ['ar', 'ei']), options);
    expect(card).toMatchObject({ language: 'ar', title: 'الأستاذة', subjects: ['اللغة العربية', 'التربية الإسلامية'] });
    expect(deskCard(teacher('2', ['fr'], { gender: 'M' }), options).title).toBe('Enseignant');
  });

  it('names each class once, by its level alone, never its sections', () => {
    expect(taughtClasses({ id: 't', name: 'T', assignments: [
      { classId: 'ce1', sectionIds: ['b'] }, { classId: 'cp', sectionIds: ['c'] }, { classId: 'ce1', sectionIds: ['a'] },
    ] }, classes)).toEqual(['CE1', 'CP']);
  });

  it('puts two cards on each A4 page, escaped', () => {
    const html = buildTeacherDeskCards([teacher('1', ['fr']), teacher('2', ['ar']), teacher('<3>', ['math'])], options);
    expect(html.match(/<section class="page">/g)).toHaveLength(2);
    expect(html.match(/<article class="card/g)).toHaveLength(3);
    expect(html).toContain('lang="ar" dir="rtl"');
    expect(html).toContain('مدرسة نجم');
    expect(html).toContain('Teacher &lt;3&gt;');
    expect(html).not.toContain('Teacher <3>');
  });
});
