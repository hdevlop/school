import { describe, expect, it } from 'bun:test';
import { buildImportPreview } from '../../src/modules/massar/importPreview';
import type { Setup } from '../../src/modules/massar/importPreview';
import { exportFixture, setupFixture } from './fixtures';
describe('Massar import preview', () => {
  it('matches only code Massar, proposes app class/section, and warns on names and birth dates', async () => {
    const source = await exportFixture(), setup = setupFixture();
    source.students.push({ ...source.students[0], studentCode: 'UNKNOWN', name: 'Synthetic student' });
    setup.appStudents[0].dateOfBirth = '2018-02-01';
    setup.appStudents.push({ ...setup.appStudents[0], id: 'school-only', studentCode: 'SCHOOLONLY' });
    const { preview } = buildImportPreview([{ name: 'one.xlsx', data: source }], setup);
    expect(preview.classes[0]).toMatchObject({ name: '1APG-1', classId: 'class-cp', sectionId: 'section-a', change: 'new' });
    expect(preview.classes[0].students.map(student => [student.studentId, student.warning])).toEqual([['student-1', true], [null, false]]);
    expect(preview.classes[0].missing.map(student => student.studentCode)).toEqual(['SCHOOLONLY']);
    expect(preview.subjects[0].subjectId).toBe('subject-arabic');
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
