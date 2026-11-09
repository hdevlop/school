import { toAppClassName, type MassarMatchReason } from '@sms/contracts';
import type { MassarRepository } from './MassarRepository';
import type { MassarExport } from './workbook/readExport';
import { sameComponents } from './massarModel';
export type Setup = Awaited<ReturnType<MassarRepository['setup']>>;
export type ImportedFile = { name: string; data: MassarExport };
export type RefusedFile = { name: string; key: string };
export const rosterSignature = (data: MassarExport) => JSON.stringify(data.students.map(({ marks: _marks, ...student }) => student));
const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').normalize('NFC');
export const dateFromMassar = (date: string) => /^(\d{2})-(\d{2})-(\d{4})$/.test(date) ? date.split('-').reverse().join('-') : date;
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
/** Words a School subject name usually contains, per Massar subject code. */
const SUBJECT_WORDS: Record<string, string[]> = {
  '0011': ['arab', 'عربي', 'العربية'], '0012': ['franc', 'french', 'الفرنسية'], '0013': ['angl', 'english', 'ingl', 'الإنجليزية', 'الانجليزية'],
  '0019': ['math', 'الرياضيات'], '0034': ['scien', 'eveil', 'العلمي', 'العلوم'], '0024': ['islam', 'الإسلامية', 'الاسلامية'],
  '1000': ['artist', 'arts', 'plasti', 'الفنية'], '0018': ['social', 'histoire', 'geograph', 'الاجتماعيات'], '0030': ['informat', 'robot', 'comput', 'المعلوميات'],
  // Collège. "physi" alone would also fit physical education.
  '0020': ['svt', 'vie et de la terre', 'biolog', 'الحياة والأرض'], '0023': ['chimi', 'chemis', 'الفيزياء'], '0026': ['sport', 'البدنية'],
};
/**
 * A name's consonant outline, comparable across alphabets: طهري and TAHRI both
 * give "thr", قصي and QOSSAI give "ks". Vowels, long vowels and doubled letters
 * are dropped, and the letters Moroccan spelling swaps (q/k/g, c/k) are merged.
 */
const ARABIC_SOUNDS: Record<string, string> = {
  'ب': 'b', 'ت': 't', 'ث': 't', 'ج': 'j', 'ح': 'h', 'خ': 'k', 'د': 'd', 'ذ': 'd', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 's', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'd',
  'غ': 'k', 'ف': 'f', 'ق': 'k', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'پ': 'b', 'ڤ': 'f', 'گ': 'k',
};
const outline = (word: string) => {
  const arabic = /[؀-ۿ]/.test(word);
  const sounds = arabic ? [...word].map(letter => ARABIC_SOUNDS[letter] ?? '').join('')
    : fold(word).replace(/[^a-z]/g, '').replace(/dj/g, 'j').replace(/(ch|sh)/g, 's').replace(/(kh|gh|q|c|g)/g, 'k').replace(/th/g, 't').replace(/dh/g, 'd').replace(/x/g, 'ks').replace(/p/g, 'b').replace(/v/g, 'f').replace(/[aeiouyw]/g, '');
  return sounds.replace(/(.)\1+/g, '$1');
};
/**
 * Every word of the shorter name, family name included, shares its outline
 * with the other name: "MOHAMMED ISLAM" alone is common to many children.
 */
export const similarName = (a: string, b: string) => {
  const words = (name: string) => [...new Set(normalizeName(name).split(' ').map(outline).filter(Boolean))];
  const [short, long] = [words(a), words(b)].sort((x, y) => x.length - y.length);
  return short.length > 0 && short.every(word => long.includes(word));
};
/** School's default catalogue code for each Massar subject code: "scien" alone fits two School subjects. */
const SCHOOL_CODES: Record<string, string> = { '0011': 'AR', '0012': 'FR', '0013': 'ENG', '0018': 'HG', '0019': 'MATH', '0024': 'EI', '0030': 'INFO', '0034': 'SCI', '1000': 'ART',
  '0020': 'SVT', '0023': 'PHY', '0026': 'PE' };
type AppSubject = Setup['appSubjects'][number];
export function proposeSubject(appSubjects: AppSubject[], code: string, name: string) {
  const exact = appSubjects.find(subject => normalizeName(subject.name) === normalizeName(name) || subject.code === code)
    ?? appSubjects.find(subject => !!SCHOOL_CODES[code] && subject.code === SCHOOL_CODES[code]);
  if (exact) return exact;
  const words = SUBJECT_WORDS[code] ?? [];
  const matches = appSubjects.filter(subject => words.some(word => fold(subject.name).includes(fold(word))));
  return matches.length === 1 ? matches[0] : undefined;
}
/**
 * Massar writes names in Arabic; School may hold only the Latin name. Only an
 * Arabic name School has and spells differently counts; like a different class
 * or birth date, it is offered as a fix (`school`).
 */
const identityDiffers = (app: Setup['appStudents'][number], name: string) => !!app.arabicName && !sameName(app.arabicName, name);
/**
 * Massar writes the family name first; School often the given name first. Same
 * words in any order, ignoring hamza, ta marbuta, alif maqsura and diacritics.
 */
export const sameName = (a: string, b: string) => {
  const words = (name: string) => normalizeName(name).replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .toLowerCase().split(' ').filter(Boolean).sort().join(' ');
  return words(a) === words(b);
};
type MassarSource = { studentCode: string; name: string; dateOfBirth: string };
/**
 * "Same student?" guesses: a School student no Massar code reaches (neither
 * `massarCodes` nor a saved Massar enrollment), with the same birth date, or
 * failing that the one similar name.
 */
export function studentSuggester(setup: Setup, massarCodes: Iterable<string>) {
  const knownCodes = new Set([...massarCodes, ...setup.enrollments.map(row => row.studentCode)]);
  const unclaimed = setup.appStudents.filter(app => !knownCodes.has(app.studentCode));
  return (student: MassarSource, classId: string | null, sectionId: string | null) => {
    const born = unclaimed.filter(app => !!app.dateOfBirth && app.dateOfBirth === dateFromMassar(student.dateOfBirth));
    const named = born.filter(app => !!app.arabicName && sameName(app.arabicName, student.name));
    const inClass = born.filter(app => app.classId === classId && app.sectionId === sectionId);
    const byDate = named.length === 1 ? named[0] : inClass.length === 1 ? inClass[0] : born.length === 1 ? born[0] : undefined;
    // No birth date in common (often a typing mistake): a similar name alone is a weak guess.
    const alike = byDate ? [] : unclaimed.filter(app => similarName(app.arabicName || app.name, student.name));
    const found = byDate ?? (alike.length === 1 ? alike[0] : undefined);
    if (!found) return null;
    if (!byDate) return { studentId: found.id, name: found.name, studentCode: found.studentCode, reasons: ['similarName', ...(found.classId === classId && found.sectionId === sectionId ? ['class'] : [])] as MassarMatchReason[], strong: false };
    // Always the birth date; a strong match also shares the name (or a similar one) or the class.
    const nameReason = !!found.arabicName && sameName(found.arabicName, student.name) ? ['name'] : similarName(found.arabicName || found.name, student.name) ? ['similarName'] : [];
    const reasons = (['birthDate', ...nameReason, ...(found.classId === classId && found.sectionId === sectionId ? ['class'] : [])]) as MassarMatchReason[];
    return { studentId: found.id, name: found.name, studentCode: found.studentCode, reasons, strong: reasons.length > 1 };
  };
}
/** The Massar students a saved class still waits for, each with its "same student?" guess. */
export function pendingWithSuggestions(setup: Setup) {
  const suggestFor = studentSuggester(setup, setup.classes.flatMap(cls => (cls.pendingStudents ?? []).map(student => student.studentCode)));
  return new Map(setup.classes.map(cls => [cls.id, (cls.pendingStudents ?? []).map(student => ({
    studentCode: student.studentCode, name: student.name, dateOfBirth: dateFromMassar(student.dateOfBirth), suggestion: suggestFor(student, cls.classId, cls.sectionId),
  }))]));
}
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
  const suggestFor = studentSuggester(setup, [...classFiles.values()].flatMap(data => data.students.map(student => student.studentCode)));
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
        const suggestion = match ? null : suggestFor(student, classId, sectionId), born = dateFromMassar(student.dateOfBirth);
        const linked = match ?? (suggestion ? setup.appStudents.find(app => app.id === suggestion.studentId) : undefined);
        const placeDiffers = !!linked && !!classId && !!sectionId && (linked.classId !== classId || linked.sectionId !== sectionId);
        const dateDiffers = !!linked && !!born && linked.dateOfBirth !== born, nameDiffers = !!linked && identityDiffers(linked, student.name);
        return { studentCode: student.studentCode, name: student.name, dateOfBirth: born, studentId: match?.id ?? null,
          warning: !!match && nameDiffers, suggestion,
          school: linked && (placeDiffers || dateDiffers || nameDiffers) ? { classId: linked.classId ?? null, sectionId: linked.sectionId ?? null, dateOfBirth: linked.dateOfBirth ?? null, arabicName: linked.arabicName ?? null, placeDiffers, dateDiffers, nameDiffers } : null };
      }),
      missing: [] as Array<{ studentCode: string; name: string }>,
    };
  });
  // School students of a class that no Massar file lists, nor suggests as the same child, and who have not left.
  const suggested = new Set(classes.flatMap(cls => cls.students.map(student => student.suggestion?.studentId)));
  for (const cls of classes) cls.missing = setup.appStudents.filter(student => student.classId === cls.classId && student.sectionId === cls.sectionId && !student.leftOn
    && !studentClasses.has(student.studentCode) && !suggested.has(student.id)).map(student => ({ studentCode: student.studentCode, name: student.name }));
  const subjects = [...subjectFiles.values()].map(data => {
    const level = setup.levels.find(level => level.code === data.level);
    const old = setup.subjects.find(subject => subject.levelId === level?.id && subject.code === data.subjectCode);
    const proposed = proposeSubject(setup.appSubjects, data.subjectCode, data.subjectName);
    // A subject from the default model is confirmed by this file; a re-saved model's spacing is not a change.
    const confirms = !!old && !old.confirmed;
    const same = !!old && old.name.trim() === data.subjectName.trim() && (confirms ? sameComponents(old.components, data.components) : JSON.stringify(old.components) === JSON.stringify(data.components));
    return { level: data.level, code: data.subjectCode, name: data.subjectName, components: data.components, subjectId: old?.subjectId ?? proposed?.id ?? null,
      change: old ? same ? 'known' : 'changed' : 'new', confirms, lostMarks: 0 };
  });
  return { accepted, preview: { classes, subjects, refused: rejected,
    missingClasses: setup.appClasses.filter(cls => !setup.classes.some(mapped => mapped.classId === cls.id) && !classes.some(mapped => mapped.classId === cls.id)).map(cls => cls.name),
    hasCleanTemplate: !!setup.year?.templateFileId || accepted.some(file => file.data.clean && !file.data.termRounds), acceptedCount: accepted.length } };
}
