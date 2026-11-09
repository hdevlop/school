import { describe, expect, it } from 'bun:test';
import { buildImportPreview, proposeSubject, sameName, similarName } from '../../src/modules/massar/importPreview';
import type { Setup } from '../../src/modules/massar/importPreview';
import { exportFixture, setupFixture } from './fixtures';
describe('Massar import preview', () => {
  it('finds the School subject for the collège subjects, by catalogue code or by name', () => {
    const catalogue = [{ id: 'svt', code: 'SVT', name: 'Sciences de la vie et de la Terre' }, { id: 'phy', code: 'PHY', name: 'Physique-chimie' },
      { id: 'pe', code: 'PE', name: 'Éducation physique et sportive' }] as Setup['appSubjects'];
    expect(['0020', '0023', '0026'].map(code => proposeSubject(catalogue, code, 'x')?.id)).toEqual(['svt', 'phy', 'pe']);
    // Renamed subjects without a catalogue code: physics never lands on physical education.
    const renamed = catalogue.map(subject => ({ ...subject, code: null, name: subject.name.toUpperCase() })) as Setup['appSubjects'];
    expect(['0020', '0023', '0026'].map(code => proposeSubject(renamed, code, 'x')?.id)).toEqual(['svt', 'phy', 'pe']);
  });
  it('matches only code Massar, proposes app class/section, and offers a different birth date as a fix', async () => {
    const source = await exportFixture(), setup = setupFixture();
    source.students.push({ ...source.students[0], studentCode: 'UNKNOWN', name: 'Synthetic student' });
    setup.appStudents[0].dateOfBirth = '2018-02-01';
    setup.appStudents.push({ ...setup.appStudents[0], id: 'school-only', studentCode: 'SCHOOLONLY', name: 'Other Child', dateOfBirth: '2017-05-05' });
    const { preview } = buildImportPreview([{ name: 'one.xlsx', data: source }], setup);
    expect(preview.classes[0]).toMatchObject({ name: '1APG-1', classId: 'class-cp', sectionId: 'section-a', change: 'new' });
    expect(preview.classes[0].students.map(student => [student.studentId, student.warning])).toEqual([['student-1', false], [null, false]]);
    expect(preview.classes[0].students[0].school).toMatchObject({ dateOfBirth: '2018-02-01', dateDiffers: true, placeDiffers: false });
    expect(preview.classes[0].missing.map(student => student.studentCode)).toEqual(['SCHOOLONLY']);
    expect(preview.subjects[0].subjectId).toBe('subject-arabic');
  });
  it('warns only on a different Arabic name or birth date, never on a Latin-only School name', async () => {
    const source = await exportFixture(), setup = setupFixture();
    setup.appStudents[0].name = 'LATIN ONLY NAME';
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students[0].warning).toBe(false);
    setup.appStudents[0].arabicName = 'اسم آخر';
    const student = buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students[0];
    expect(student.warning).toBe(true);
    expect(student.school).toMatchObject({ arabicName: 'اسم آخر', nameDiffers: true, placeDiffers: false });
  });
  it('treats the same Arabic words in another order or spelling as the same name', () => {
    expect(sameName('ازوكاع محمد إسلام', 'محمد اسلام ازوكاع')).toBe(true);
    expect(sameName('خياطي آية', 'ايه خياطي')).toBe(true);
    expect(sameName('مصدقين ياسمين', 'مصدقين سلمى')).toBe(false);
  });
  it('suggests the one School student no Massar code reaches, with the same birth date', async () => {
    const source = await exportFixture(), setup = setupFixture();
    source.students.push({ ...source.students[0], studentCode: 'F200000002', name: 'تلميذ جديد', dateOfBirth: '05-03-2019' });
    setup.appStudents.push({ ...setup.appStudents[0], id: 'school-number', studentCode: '8889991/26', name: 'NEW PUPIL', dateOfBirth: '2019-03-05' });
    setup.appStudents.push({ ...setup.appStudents[0], id: 'other-born', studentCode: '8889992/26', name: 'OTHER PUPIL', dateOfBirth: '2019-07-07' });
    const added = buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students.at(-1)!;
    // Same birth date and same class: a strong match.
    expect(added).toMatchObject({ studentId: null, dateOfBirth: '2019-03-05', suggestion: { studentId: 'school-number', studentCode: '8889991/26', name: 'NEW PUPIL', reasons: ['birthDate', 'class'], strong: true } });
    // Birth date alone, in another class: a weak match, decided one by one.
    setup.appStudents.find(app => app.id === 'school-number')!.sectionId = 'section-b';
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students.at(-1)!.suggestion).toMatchObject({ reasons: ['birthDate'], strong: false });
    setup.appStudents.find(app => app.id === 'school-number')!.sectionId = 'section-a';
    // Two candidates born the same day, neither named the same nor alone in the class: no guess.
    setup.appStudents.push({ ...setup.appStudents[0], id: 'twin', studentCode: '8889993/26', dateOfBirth: '2019-03-05' });
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students.at(-1)!.suggestion).toBeNull();
  });
  it('compares Arabic and Latin spellings of a name by their consonants', () => {
    expect(similarName('بنعلي يوسف', 'BENALI YOUSSEF')).toBe(true);
    expect(similarName('قاسمي سارة', 'KASSIMI SARA')).toBe(true);
    expect(similarName('بنعلي يوسف', 'MANSOURI HIND')).toBe(false);
    // Shared given names are not enough: the family name must match too.
    expect(similarName('بنعلي محمد اسلام', 'MOHAMMED ISLAM KASSIMI')).toBe(false);
    expect(similarName('بنعلي  محمد اسلام', 'BENALI MOHAMED ISLAM')).toBe(true);
  });
  it('suggests a similar name as a weak match when no birth date is shared', async () => {
    const source = await exportFixture(), setup = setupFixture();
    source.students.push({ ...source.students[0], studentCode: 'F200000001', name: 'بنعلي يوسف', dateOfBirth: '14-01-2019' });
    setup.appStudents.push({ ...setup.appStudents[0], id: 'typo-date', studentCode: '8800001/26', name: 'BENALI YOUSSEF', dateOfBirth: '2019-01-03', sectionId: 'section-b' });
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students.at(-1)!.suggestion)
      .toMatchObject({ studentId: 'typo-date', reasons: ['similarName'], strong: false });
    // The same birth date and a similar name, even in another section: strong.
    setup.appStudents.find(app => app.id === 'typo-date')!.dateOfBirth = '2019-01-14';
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.classes[0].students.at(-1)!.suggestion)
      .toMatchObject({ studentId: 'typo-date', reasons: ['birthDate', 'similarName'], strong: true });
  });
  it('offers the Massar class as a fix, and lists only students no Massar file has as missing', async () => {
    const source = await exportFixture(), setup = setupFixture();
    setup.appStudents[0].sectionId = 'section-b';
    const other = { ...source, className: '1APG-2', classGuid: 'second-guid', students: [{ ...source.students[0], studentCode: 'ELSEWHERE' }] };
    setup.appStudents.push({ ...setup.appStudents[0], id: 'elsewhere', studentCode: 'ELSEWHERE', sectionId: 'section-a' });
    const { preview } = buildImportPreview([{ name: 'one.xlsx', data: source }, { name: 'two.xlsx', data: other }], setup);
    expect(preview.classes[0].students[0].school).toMatchObject({ sectionId: 'section-b', placeDiffers: true });
    // In Massar, only in another class: not "missing" from this one.
    expect(preview.classes[0].missing).toEqual([]);
    // A student who left, or one suggested as the same child, is not missing either.
    setup.appStudents.push({ ...setup.appStudents[0], id: 'left', studentCode: 'LEFT', sectionId: 'section-a', leftOn: '2026-09-15' });
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }, { name: 'two.xlsx', data: other }], setup).preview.classes[0].missing).toEqual([]);
  });
  it('guesses the School subject from its usual name when nothing matches exactly', async () => {
    const source = await exportFixture(), setup = setupFixture();
    setup.appSubjects = [{ id: 'subject-ar', code: null, name: 'Langue Arabe' }, { id: 'subject-fr', code: null, name: 'Français' }] as Setup['appSubjects'];
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.subjects[0].subjectId).toBe('subject-ar');
    setup.appSubjects.push({ id: 'subject-ar2', code: null, name: 'Arabe oral' } as Setup['appSubjects'][number]);
    expect(buildImportPreview([{ name: 'one.xlsx', data: source }], setup).preview.subjects[0].subjectId).toBeNull();
  });
  it('refuses wrong year/school, inconsistent class GUIDs, roster and subject components', async () => {
    const source = await exportFixture(), setup = setupFixture();
    const second = (data: typeof source) => buildImportPreview([{ name: 'good.xlsx', data: source }, { name: 'bad.xlsx', data }], setup).preview.refused[0]?.key;
    expect(second({ ...source, yearLabel: '2025/2026' })).toBe('wrongYear');
    expect(second({ ...source, yearId: 18 })).toBe('wrongYear');
    expect(second({ ...source, schoolCode: 'OTHER' })).toBe('wrongSchool');
    expect(second({ ...source, classGuid: 'OTHER' })).toBe('classConflict');
    expect(second({ ...source, students: [] })).toBe('classConflict');
    expect(second({ ...source, components: [{ code: '1001', name: 'Changed' }] })).toBe('subjectConflict');
  });
  it('refuses assigning the same code Massar to two classes, even with different hidden ids', async () => {
    const source = await exportFixture();
    const result = buildImportPreview([{ name: 'one.xlsx', data: source }, { name: 'two.xlsx', data: { ...source, className: '1APG-2', classGuid: 'another-guid' } }], setupFixture());
    expect(result.preview.refused).toEqual([{ name: 'two.xlsx', key: 'classConflict' }]);
  });
  it('compares reimports, preserves chosen mappings and reports known records', async () => {
    const source = await exportFixture(), setup = setupFixture();
    setup.levels = [{ id: 'level-1', code: source.level }] as Setup['levels'];
    setup.classes = [{ id: 'massar-class', name: source.className, levelId: 'level-1', guid: source.classGuid, classId: 'class-cp', sectionId: 'section-a' }] as Setup['classes'];
    setup.subjects = [{ id: 'massar-subject', levelId: 'level-1', code: source.subjectCode, name: source.subjectName, components: source.components, subjectId: 'subject-arabic' }] as Setup['subjects'];
    setup.enrollments = [{ studentCode: 'SYNTHETIC1', enrollment: { studentId: 'student-1', massarClassId: 'massar-class', massarStudentId: 'synthetic-hidden', position: 0, name: 'Synthetic student', dateOfBirth: '01-01-2018' } }] as Setup['enrollments'];
    const preview = buildImportPreview([{ name: 'known.xlsx', data: source }], setup).preview;
    expect(preview.classes[0].change).toBe('known'); expect(preview.subjects[0].change).toBe('known');
    source.students[0].massarStudentId = 'new-hidden';
    expect(buildImportPreview([{ name: 'changed.xlsx', data: source }], setup).preview.classes[0].change).toBe('changed');
  });
});
