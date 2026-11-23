import { describe, expect, it } from 'bun:test';
import {
  buildTeacherDeskCards, DEFAULT_DESK_CARD_DISPLAY, deskCard, deskCardDisplay, deskCardLanguage, deskCardNames, nameSize, taughtClasses, type DeskCardOptions,
} from '@/features/Teachers/config/teacherDeskCards';
import { deskCardBackgroundFileName } from '@/services/deskCardBackgroundApi';

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
    // Teaching one subject named in Arabic makes the whole card Arabic; no subject follows the interface.
    expect(deskCardLanguage([subjects[2], subjects[0]], 'fr')).toBe('ar');
    expect(deskCardLanguage([], 'ar')).toBe('ar');
  });

  it('shows the names the display asks for', () => {
    const named = { name: 'Ilham Achtouk', nameAr: 'إلهام أشتوك' };
    expect(deskCardNames(named, 'ar', 'auto')).toEqual({ name: 'إلهام أشتوك', altName: null });
    expect(deskCardNames(named, 'fr', 'auto')).toEqual({ name: 'Ilham Achtouk', altName: null });
    expect(deskCardNames(named, 'ar', 'latin')).toEqual({ name: 'Ilham Achtouk', altName: null });
    expect(deskCardNames(named, 'fr', 'arabic')).toEqual({ name: 'إلهام أشتوك', altName: null });
    expect(deskCardNames(named, 'ar', 'both')).toEqual({ name: 'إلهام أشتوك', altName: 'Ilham Achtouk' });
    expect(deskCardNames(named, 'fr', 'both')).toEqual({ name: 'Ilham Achtouk', altName: 'إلهام أشتوك' });
    // No Arabic name: the Latin one, whatever was asked.
    expect(deskCardNames({ name: 'Ilham Achtouk' }, 'ar', 'arabic')).toEqual({ name: 'Ilham Achtouk', altName: null });
  });

  it('leaves out the parts the display hides, and scales the text', () => {
    const full = buildTeacherDeskCards([teacher('1', ['fr'])], options);
    expect(full).toContain('<header>');
    expect(full).toContain('<footer>');
    expect(full).toContain('class="role"');
    const bare = buildTeacherDeskCards([teacher('1', ['fr'])], {
      ...options, display: { title: false, subjects: false, classes: false, school: false, year: false, textSize: 'large' },
    });
    expect(bare).not.toContain('<header>');
    expect(bare).not.toContain('<footer>');
    expect(bare).not.toContain('class="role"');
    expect(bare).not.toContain('<h2');
    expect(bare).toContain(`font-size:${Math.round(nameSize('Teacher 1') * 1.2 * 10) / 10}pt`);
  });

  it('prints in the chosen font, every family hosted by School', () => {
    expect(buildTeacherDeskCards([teacher('1', ['fr'])], options)).toContain(':root{--latin:MassarLatin;--arabic:MassarArabic}');
    const hand = buildTeacherDeskCards([teacher('1', ['ar'])], { ...options, display: { font: 'hand' } });
    expect(hand).toContain(':root{--latin:MassarPenKalam;--arabic:MassarHand}');
    const modern = buildTeacherDeskCards([teacher('1', ['ar'])], { ...options, display: { font: 'modern' } });
    expect(modern).toContain("url('https://school.test/fonts/insurance/NotoNaskhArabic-700.woff2')");
    // No family is named outside the variables, so the choice reaches every part of the card.
    expect(modern.replace(/@font-face\{[^}]*\}/g, '')).not.toMatch(/font(-family)?:[^;}]*Massar/);
  });

  it('reads a stored display safely', () => {
    expect(deskCardDisplay(null)).toEqual(DEFAULT_DESK_CARD_DISPLAY);
    expect(deskCardDisplay({ names: 'nope', textSize: 'huge', classes: 'yes', school: false }))
      .toEqual({ ...DEFAULT_DESK_CARD_DISPLAY, school: false });
  });

  it('writes every subject of the Arabic teacher in Arabic, even those named in French', () => {
    const french = [
      { id: 'ar', name: 'العربية', nameAr: 'اللغة العربية' },
      { id: 'ei', name: 'Éducation islamique', nameAr: 'التربية الإسلامية' },
      { id: 'art', name: 'Éducation artistique', nameAr: 'التربية الفنية' },
      { id: 'hg', name: 'Histoire-géographie', nameAr: 'الاجتماعيات' },
    ];
    const card = deskCard(teacher('1', ['ar', 'ei', 'art', 'hg']), { ...options, subjects: french });
    expect(card.language).toBe('ar');
    expect(card.subjects).toEqual(['اللغة العربية', 'التربية الإسلامية', 'التربية الفنية', 'الاجتماعيات']);
  });

  it('names an Arabic subject by its Arabic name, and the teacher by gender', () => {
    const card = deskCard(teacher('1', ['ar', 'ei']), options);
    expect(card).toMatchObject({ language: 'ar', title: 'الأستاذة', subjects: ['اللغة العربية', 'التربية الإسلامية'] });
    expect(deskCard(teacher('2', ['fr'], { gender: 'M' }), options).title).toBe('Enseignant');
  });

  it('writes the Arabic name on an Arabic card only, else the usual name', () => {
    expect(deskCard(teacher('1', ['ar'], { nameAr: ' فاطمة العلوي ' }), options).name).toBe('فاطمة العلوي');
    expect(deskCard(teacher('2', ['fr'], { nameAr: 'فاطمة العلوي' }), options).name).toBe('Teacher 2');
    expect(deskCard(teacher('3', ['ar'], { nameAr: '' }), options).name).toBe('Teacher 3');
  });

  it('names each class once, by its level alone, never its sections', () => {
    expect(taughtClasses({ id: 't', name: 'T', assignments: [
      { classId: 'ce1', sectionIds: ['b'] }, { classId: 'cp', sectionIds: ['c'] }, { classId: 'ce1', sectionIds: ['a'] },
    ] }, classes)).toEqual(['CE1', 'CP']);
  });

  it('puts an imported image behind each card, and nothing for plain or an unsafe URL', () => {
    const html = buildTeacherDeskCards([teacher('1', ['fr'])], { ...options, backgroundImage: '/api/desk-card-backgrounds/files/serve/1-a.png' });
    expect(html).toContain('<img class="backdrop" src="https://school.test/api/desk-card-backgrounds/files/serve/1-a.png" alt="">');
    expect(html).toContain('<span class="veil"></span>');
    expect(buildTeacherDeskCards([teacher('1', ['fr'])], options)).not.toContain('class="backdrop"');
    expect(buildTeacherDeskCards([teacher('1', ['fr'])], { ...options, backgroundImage: 'javascript:alert(1)' })).not.toContain('class="backdrop"');
  });

  it('names an imported background safely for storage', () => {
    expect(deskCardBackgroundFileName('Fond École (2).JPG', 'image/jpeg', 42)).toBe('42-fond-cole-2.jpg');
    expect(deskCardBackgroundFileName('../../x.exe', 'image/webp', 7)).toBe('7-x.webp');
    expect(deskCardBackgroundFileName('صورة.png', 'image/png', 7)).toBe('7-background.png');
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
