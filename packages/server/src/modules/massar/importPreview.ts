import { toAppClassName } from '@sms/contracts';
import type { MassarRepository } from './MassarRepository';
import type { MassarExport } from './workbook/readExport';
export type Setup = Awaited<ReturnType<MassarRepository['setup']>>;
export type ImportedFile = { name: string; data: MassarExport };
export type RefusedFile = { name: string; key: string };
export const rosterSignature = (data: MassarExport) => JSON.stringify(data.students.map(({ marks: _marks, ...student }) => student));
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').normalize('NFC');
export const dateFromMassar = (date: string) => /^(\d{2})-(\d{2})-(\d{4})$/.test(date) ? date.split('-').reverse().join('-') : date;
export function buildImportPreview(files: ImportedFile[], setup: Setup, refused: RefusedFile[] = []) {
  const accepted: ImportedFile[] = [], rejected = [...refused];
  const classFiles = new Map<string, MassarExport>(), subjectFiles = new Map<string, MassarExport>(), studentClasses = new Map<string, string>();
  let schoolCode = setup.year?.schoolCode, yearId = setup.year?.massarYearId;
  for (const file of files) {
    const data = file.data;
    let key: string | undefined;
    if (data.yearLabel.replace('/', '-') !== setup.yearLabel || (yearId && data.yearId !== yearId)) key = 'wrongYear';
    else if (schoolCode && data.schoolCode !== schoolCode) key = 'wrongSchool';
    const previous = classFiles.get(data.className);
    const existing = setup.classes.find(cls => cls.name === data.className);
    if (!key && ((previous && (previous.classGuid !== data.classGuid || rosterSignature(previous) !== rosterSignature(data))) || (existing && existing.guid !== data.classGuid) || setup.classes.some(cls => cls.name !== data.className && cls.guid === data.classGuid) || [...classFiles.values()].some(cls => cls.className !== data.className && cls.classGuid === data.classGuid))) key = 'classConflict';
    const subject = subjectFiles.get(`${data.level}:${data.subjectCode}`);
    if (!key && subject && (subject.subjectName !== data.subjectName || (data.kind === 'components' && JSON.stringify(subject.components) !== JSON.stringify(data.components)))) key = 'subjectConflict';
    if (!key && data.students.some(student => studentClasses.has(student.studentCode) && studentClasses.get(student.studentCode) !== data.className)) key = 'classConflict';
    if (key) { rejected.push({ name: file.name, key }); continue; }
    schoolCode ??= data.schoolCode; yearId ??= data.yearId;
    accepted.push(file); classFiles.set(data.className, data); subjectFiles.set(`${data.level}:${data.subjectCode}`, data);
    data.students.forEach(student => studentClasses.set(student.studentCode, data.className));
  }
  const classes = [...classFiles.values()].map(data => {
    const old = setup.classes.find(cls => cls.name === data.className);
    const app = setup.appClasses.find(cls => cls.name === toAppClassName(data.level));
    const number = Number(data.className.split('-').at(-1));
    const section = setup.appSections.find(section => section.classId === app?.id && section.name === String.fromCharCode(64 + number));
    const oldRoster = setup.enrollments.filter(row => row.enrollment.massarClassId === old?.id).sort((a, b) => a.enrollment.position - b.enrollment.position);
    const unchanged = old && old.levelId && oldRoster.length === data.students.length && oldRoster.every((row, i) => row.studentCode === data.students[i].studentCode && String(row.enrollment.massarStudentId ?? '') === String(data.students[i].massarStudentId ?? '') && row.enrollment.name === data.students[i].name && row.enrollment.dateOfBirth === data.students[i].dateOfBirth);
    const classId = old?.classId ?? app?.id ?? null, sectionId = old?.sectionId ?? section?.id ?? null;
    return { name: data.className, level: data.level, classId, sectionId, change: old ? unchanged ? 'known' : 'changed' : 'new',
      students: data.students.map(student => {
        const match = setup.appStudents.find(app => app.studentCode === student.studentCode);
        return { studentCode: student.studentCode, name: student.name, studentId: match?.id ?? null,
          warning: !!match && (normalizeName(match.arabicName || match.name) !== normalizeName(student.name) || (match.dateOfBirth && dateFromMassar(student.dateOfBirth) !== match.dateOfBirth)) };
      }),
      missing: setup.appStudents.filter(student => student.classId === classId && student.sectionId === sectionId && !data.students.some(imported => imported.studentCode === student.studentCode)).map(student => ({ studentCode: student.studentCode, name: student.name })),
    };
  });
  const subjects = [...subjectFiles.values()].map(data => {
    const level = setup.levels.find(level => level.code === data.level);
    const old = setup.subjects.find(subject => subject.levelId === level?.id && subject.code === data.subjectCode);
    const proposed = setup.appSubjects.find(subject => normalizeName(subject.name) === normalizeName(data.subjectName) || subject.code === data.subjectCode);
    return { level: data.level, code: data.subjectCode, name: data.subjectName, components: data.components, subjectId: old?.subjectId ?? proposed?.id ?? null,
      change: old ? old.name === data.subjectName && JSON.stringify(old.components) === JSON.stringify(data.components) ? 'known' : 'changed' : 'new' };
  });
  return { accepted, preview: { classes, subjects, refused: rejected,
    missingClasses: setup.appClasses.filter(cls => !setup.classes.some(mapped => mapped.classId === cls.id) && !classes.some(mapped => mapped.classId === cls.id)).map(cls => cls.name),
    hasCleanTemplate: !!setup.year?.templateFileId || accepted.some(file => file.data.clean), acceptedCount: accepted.length } };
}
