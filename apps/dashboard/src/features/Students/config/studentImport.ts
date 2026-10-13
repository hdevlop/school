import { GENDER_VALUES, STUDENT_STATUS_VALUES, type Gender, type StudentStatus } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { firstYearEnrolledOn } from './newStudentEnrollment';

/**
 * The columns an import reads. The first eight are the ones the table exports,
 * so an exported file imports back unchanged; the others are optional extras.
 * Class and section are matched by name against the classes a new student may
 * join, never by id, so a file made by hand works too.
 */
export const STUDENT_IMPORT_COLUMNS = [
  'studentCode', 'name', 'email', 'phone', 'class', 'section', 'gender', 'status',
  'address', 'dateOfBirth', 'enrollmentDate',
] as const;

export type StudentImportReason =
  | 'missingName'
  | 'invalidGender'
  | 'invalidStatus'
  | 'unknownClass'
  | 'unknownSection'
  | 'invalidDate'
  | 'duplicateCode';

/** `row` is the spreadsheet line: the header is line 1, the first record line 2. */
export interface StudentImportProblem {
  row: number;
  reason: StudentImportReason;
  value?: string;
}

export interface StudentImportPayload {
  studentCode: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  gender: Gender;
  status?: StudentStatus;
  classId: string;
  sectionId: string;
  enrollmentDate: string;
  yearEnrolledOn: string;
}

interface ImportClass {
  id: string;
  name: string;
  academicYear?: string | null;
  sections?: { id: string; name: string }[] | null;
}

/** Spreadsheet cells arrive as strings, numbers or ISO date-times. */
const cellText = (value: unknown) => (value == null ? '' : String(value).trim());
const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
/** An Excel date cell is read as `2025-09-01T00:00:00.000Z`; only the day counts. */
const dayOf = (text: string) => (/^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text);

/**
 * Checks every row before any is sent, so a file with a mistake creates
 * nobody rather than half the class. What only the server knows — a code
 * already taken, an email in use — is refused per row when it is created.
 */
export function buildStudentImport(
  rows: Record<string, unknown>[],
  classes: ImportClass[],
  admissionDate: string,
): { students: StudentImportPayload[]; problems: StudentImportProblem[] } {
  const students: StudentImportPayload[] = [];
  const problems: StudentImportProblem[] = [];
  const codes = new Set<string>();

  rows.forEach((record, index) => {
    const row = index + 2;
    const field = (key: (typeof STUDENT_IMPORT_COLUMNS)[number]) => cellText(record[key]);
    const rowProblems: StudentImportProblem[] = [];
    const problem = (reason: StudentImportReason, value?: string) => rowProblems.push({ row, reason, value });

    const name = field('name');
    if (!name) problem('missingName');

    const studentCode = field('studentCode');
    if (studentCode && codes.has(studentCode)) problem('duplicateCode', studentCode);
    if (studentCode) codes.add(studentCode);

    const gender = GENDER_VALUES.find(value => sameName(value, field('gender')));
    if (!gender) problem('invalidGender', field('gender'));

    const statusText = field('status');
    const status = statusText ? STUDENT_STATUS_VALUES.find(value => sameName(value, statusText)) : undefined;
    if (statusText && !status) problem('invalidStatus', statusText);

    const className = field('class');
    const studentClass = classes.find(candidate => sameName(candidate.name, className));
    if (!studentClass) problem('unknownClass', className);
    const sectionName = field('section');
    const section = studentClass?.sections?.find(candidate => sameName(candidate.name, sectionName));
    if (studentClass && !section) problem('unknownSection', sectionName);

    const date = (key: 'dateOfBirth' | 'enrollmentDate') => {
      const text = dayOf(field(key));
      if (text && !isDateOnly(text)) problem('invalidDate', field(key));
      return text || undefined;
    };
    const dateOfBirth = date('dateOfBirth');
    const enrollmentDate = date('enrollmentDate') ?? admissionDate;

    if (rowProblems.length || !gender || !studentClass || !section) {
      problems.push(...rowProblems);
      return;
    }

    const phone = field('phone');
    const address = field('address');
    students.push({
      studentCode,
      name,
      email: field('email'),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(dateOfBirth && { dateOfBirth }),
      gender,
      ...(status && { status }),
      classId: studentClass.id,
      sectionId: section.id,
      enrollmentDate,
      yearEnrolledOn: firstYearEnrolledOn(enrollmentDate, studentClass.academicYear),
    });
  });

  return { students, problems };
}
