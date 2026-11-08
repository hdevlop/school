// Rendering mocks are isolated from the dashboard suite in this subprocess.
import assert from 'node:assert/strict';
import { mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { translate } from 'najm-i18n';
import { translations } from '@sms/contracts/locales';
import type { MassarImportPreview, MassarSetup } from '@sms/contracts';

let language: 'fr' | 'ar' = 'fr', role = 'registrar', configured = false, opened = false, planned: Array<{ term: number; exam: number; dueDate: string | null }> = [];
mock.module('najm-i18n/react', () => ({ useTranslation: () => ({ language, t: (key: string, params?: Record<string, string | number>) => translate(translations, language, key, params) }) }));
mock.module('next/navigation', () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }));
mock.module('najm-theme/react', () => ({ useNThemeBrandingSlot: () => null }));
mock.module('@/features/AcademicYears/components/ViewingYearSelector', () => ({ ViewingYearSelector: () => null }));
mock.module('@/features/Users/hooks/useViewerRole', () => ({ useViewerRole: () => ({ userId: role, role, isSchoolWide: role === 'registrar', can: (permission: string) => permission !== 'manage:massar' || role === 'registrar' }) }));
mock.module('@/features/AcademicYears/hooks/useViewingAcademicYear', () => ({ useViewingYearKey: () => 'selected-year' }));
mock.module('@/components/SchoolPageHeader', () => ({ SchoolPageHeader: ({ title, subtitle, actions }: any) => <div><h1>{title}</h1><p>{subtitle}</p>{actions}</div> }));
mock.module('@/features/Massar/components/MassarPaper', () => ({ MassarPaper: ({ id }: any) => <div data-paper={id} /> }));
mock.module('@/hooks/useSchoolFormat', () => ({ useSchoolToday: () => '2026-11-06' }));
const setup: MassarSetup = { year: null, yearLabel: '2026-2027', filledExportVerified: false, levels: [], classes: [], subjects: [], enrollments: [], appStudents: [], appClasses: [{ id: 'school-class', name: 'CP' }], appSections: [{ id: 'section', classId: 'school-class', name: 'A' }], appSubjects: [] };
const round = { id: 'round', term: 1, exam: 1, status: 'open' };
const sheet = { id: 'sheet', roundId: 'round', className: '1APG-1', subjectName: 'العربية', teacherName: 'Salma', missing: 1, total: 2, status: 'in_progress' };
const unconfirmedSheet = { ...sheet, id: 'sheet-math', subjectName: 'الرياضيات', subjectConfirmed: false };
mock.module('@/features/Massar/hooks/useMassar', () => ({
  useMassarRead: (path: string) => ({ data: path === '/availability' ? { configured, hasRounds: opened, planned } : path === '/setup' ? setup : path === '/rounds' ? opened ? [round] : [] : opened ? [sheet, unconfirmedSheet] : [], error: null, academicYear: '2026-2027', isLoading: false, refetch: () => {} }),
  useMassarAction: () => ({ pending: false, run: () => {} }), massarPost: () => {}, massarPut: () => {}, previewMassar: () => {}, downloadMassar: () => {},
}));
const { MassarPage } = await import('@/features/Massar/components/MassarPage');
const { MassarImportReview } = await import('@/features/Massar/components/MassarImportReview');
const { MassarDueNotice } = await import('@/features/Massar/components/MassarDueNotice');
let html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /Aucun fichier Massar/); assert.match(html, /Ajouter les fichiers Massar/); assert.doesNotMatch(html, /role="tab|dropzone/);
role = 'teacher'; html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /Massar n’est pas encore prêt/); assert.doesNotMatch(html, /Ajouter les fichiers Massar/);
configured = true; html = renderToStaticMarkup(<MassarPage />);
// Nothing open and nothing planned: a teacher waits, a manager is sent to Planning first.
assert.match(html, /Aucun contrôle ouvert/); assert.doesNotMatch(html, /Ouvrir le Planning|Ouvrir Contrôle/);
role = 'registrar'; html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /Ouvrir le Planning/); assert.doesNotMatch(html, /Ouvrir Contrôle/);
planned = [{ term: 1, exam: 1, dueDate: null }, { term: 1, exam: 2, dueDate: '2026-12-20' }];
html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /Ouvrir Contrôle 1 — Semestre 1/);
opened = true; html = renderToStaticMarkup(<MassarPage />);
// The first class and its first subject open; the overview of every class waits behind its icon button, in a sheet.
assert.match(html, /aria-label="Vue d’ensemble"/); assert.match(html, /data-paper="sheet"/); assert.doesNotMatch(html, /Salma/);
// The opened Contrôle names itself in the picker; the class's subjects are tabs with their progress, one still to confirm.
assert.match(html, /aria-label="Choisir un contrôle"[^>]*><span><strong>Contrôle 1 — Semestre 1<\/strong><small>Sans date<\/small>/);
assert.match(html, /<button[^>]*aria-pressed="true"[^>]*><span dir="auto">العربية<\/span><span[^>]*>50%<\/span>/);
assert.match(html, /<button[^>]*aria-pressed="false"[^>]*><span[^>]*aria-label="À confirmer"><\/span><span dir="auto">الرياضيات<\/span>/);
// Export (a menu: this subject or the whole class), Print and the download for Massar are icon buttons.
assert.match(html, /aria-label="Exporter les fichiers Massar \(\.xlsx\)"/); assert.match(html, /aria-label="Imprimer"/); assert.match(html, /aria-label="Télécharger pour Massar"/);
role = 'teacher'; html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /data-paper="sheet"/); assert.doesNotMatch(html, /Vue d’ensemble|Télécharger pour Massar|Ajouter des fichiers Massar|Exporter les fichiers Massar/);
role = 'supervisor'; html = renderToStaticMarkup(<MassarPage />);
assert.match(html, /Vue d’ensemble/); assert.doesNotMatch(html, /Télécharger pour Massar|Ajouter des fichiers Massar|Exporter les fichiers Massar/);
planned = [];
assert.equal(renderToStaticMarkup(<MassarDueNotice dueDate={null} />), '');
assert.match(renderToStaticMarkup(<MassarDueNotice dueDate="2026-11-06" />), /À saisir aujourd’hui/);
assert.match(renderToStaticMarkup(<MassarDueNotice dueDate="2026-11-09" />), /3 jours restants/);
assert.match(renderToStaticMarkup(<MassarDueNotice dueDate="2026-11-04" />), /2 jours de retard/);

const preview: MassarImportPreview = { previewId: 'preview', digest: 'synthetic-digest', acceptedCount: 1, hasCleanTemplate: true, missingClasses: [], refused: [], subjects: [], classes: [{ name: '1APG-1', level: '1APG', classId: 'school-class', sectionId: 'section', change: 'new', students: [
  { studentCode: 'SYNTHETIC1', name: 'Synthetic student', dateOfBirth: '2019-01-14', studentId: null, warning: false, suggestion: null, school: null },
  { studentCode: 'SYNTHETIC2', name: 'Synthetic pair', dateOfBirth: '2019-02-15', studentId: null, warning: false, suggestion: { studentId: 'school-2', name: 'SCHOOL PAIR', studentCode: '8800002/26', reasons: ['birthDate', 'class'], strong: true }, school: null },
  { studentCode: 'SYNTHETIC3', name: 'Synthetic moved', dateOfBirth: '2019-03-16', studentId: 'school-3', warning: false, suggestion: null, school: { classId: 'school-class', sectionId: null, dateOfBirth: '2019-03-06', arabicName: 'اسم آخر', placeDiffers: true, dateDiffers: true, nameDiffers: true } },
  { studentCode: 'SYNTHETIC4', name: 'Synthetic dated', dateOfBirth: '2019-04-20', studentId: 'school-4', warning: false, suggestion: null, school: { classId: 'school-class', sectionId: 'section', dateOfBirth: '2019-04-02', arabicName: null, placeDiffers: false, dateDiffers: true, nameDiffers: false } },
], missing: [{ studentCode: '8800009/26', name: 'ONLY IN SCHOOL' }] }] };
role = 'registrar';
const review = (hasCleanTemplate = true) => renderToStaticMarkup(<MassarImportReview preview={{ ...preview, hasCleanTemplate }} setup={setup} pending={false} cancel={async () => {}} commit={async () => {}} recheck={async () => {}} />);
assert.match(review(), /1APG-1/); assert.match(review(), /SYNTHETIC1/); assert.match(review(), /Importer 1 classes/);
// Each decision is a choice, applied with the import: same student, or a new one with its gender.
assert.match(review(), /SCHOOL PAIR/); assert.match(review(), /Même<\/button>/); assert.match(review(), /Différent<\/button>/); assert.match(review(), /Accepter les sûrs/);
assert.match(review(), /\+ Garçon<\/button>/); assert.match(review(), /\+ Fille<\/button>/); assert.match(review(), /Ignorer<\/button>/);
assert.match(review(false), /<button(?=[^>]*disabled="")[^>]*>Importer 1 classes<\/button>/);
// Massar is the reference: a different class or birth date follows Massar unless kept.
assert.match(review(), /Différent dans School/); assert.match(review(), /Classe : CP → CP A/); assert.match(review(), /Naissance : 06\/03\/2019 → 16\/03\/2019/);
assert.match(review(), /aria-pressed="true"[^>]*>✓ Suivre Massar<\/button>/); assert.match(review(), /Nom arabe : اسم آخر → Synthetic moved/);
assert.match(review(), /Dans School, absents de Massar : 1/); assert.match(review(), /ONLY IN SCHOOL/);
assert.doesNotMatch(review(), /En attente de papiers|role="dialog"/); // Information only: no action on the import screen.

// Subjects: a matched one is a chip below; one with no School match is a decision at the top, and the import asks first.
const withSubjects = renderToStaticMarkup(<MassarImportReview preview={{ ...preview, subjects: [
  { level: '1APG', code: '0011', name: 'اللغة العربية', components: [], change: 'new', subjectId: 'school-arabic' },
  { level: '2APG', code: '0011', name: 'اللغة العربية', components: [], change: 'new', subjectId: 'school-arabic' },
  { level: '1APG', code: '1000', name: 'التربية الفنية', components: [], change: 'new', subjectId: null },
] }} setup={{ ...setup, appSubjects: [{ id: 'school-arabic', name: 'Arabe' }] }} pending={false} cancel={async () => {}} commit={async () => {}} recheck={async () => {}} />);
assert.match(withSubjects, /⏸ 1 matières à choisir/); assert.match(withSubjects, /Choisir la matière School/);
assert.match(withSubjects, /1000<\/bdi>[\s\S]*التربية الفنية[\s\S]*1 levels|1000<\/bdi>[\s\S]*التربية الفنية[\s\S]*1 niveaux/);
assert.match(withSubjects, /Matières \(1\)/); assert.match(withSubjects, /<button[^>]*title="Changer la matière School de اللغة العربية"[^>]*>✓ <bdi dir="auto">اللغة العربية<\/bdi> <span>→ <bdi dir="auto">Arabe<\/bdi>/);
assert.doesNotMatch(withSubjects, /0011<\/bdi>/); // Matched: not a decision row. assert.match(review(), /Garder School<\/button>/);
// The birth date always follows Massar: shown, never offered to keep.
assert.match(review(), /Naissance : 02\/04\/2019 → 20\/04\/2019/); assert.equal(review().match(/Garder School<\/button>/g)?.length, 1);
role = 'supervisor'; assert.match(review(), /Seuls l(&#x27;|')administrateur/); assert.doesNotMatch(review(), /Suivre Massar/); role = 'registrar';
language = 'ar'; assert.match(review(), /استيراد 1 أقسام/); assert.doesNotMatch(review(), /massar\.flow\.|\{\{/);
console.log('Massar page states and role-specific UI render correctly');
