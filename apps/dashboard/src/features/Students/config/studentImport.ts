import { findClassByName, GENDER_VALUES, STUDENT_STATUS_VALUES, type Gender, type StudentStatus } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { firstYearEnrolledOn } from './newStudentEnrollment';
import { createParentSchemas, type ParentFormValues } from '@/features/Parents/config/parentSchemas';

// The import reports which guardian fields failed, never their messages, so the
// schema's translator is irrelevant here.
const parentSchema = createParentSchemas((key) => key).parent;

/**
 * The columns an import reads. Exported table columns use these same keys,
 * so an exported file imports back unchanged; the others are optional extras.
 * Class names accept official codes and familiar app names, matched against
 * classes a new student may join, never by id. Sections also accept
 * equivalent numeric/letter names (1 = A, 2 = B, through 26 = Z).
 */
export const STUDENT_IMPORT_COLUMNS = [
  'studentCode', 'name', 'email', 'phone', 'class', 'section', 'gender', 'status',
  'address', 'dateOfBirth', 'enrollmentDate', 'arabicName',
  'guardianName', 'guardianPhone', 'guardianPhone2', 'guardianEmail', 'guardianCin', 'guardianRelationship',
] as const;

export type StudentImportReason =
  | 'missingName'
  | 'invalidArabicName'
  | 'invalidGender'
  | 'invalidStatus'
  | 'unknownClass'
  | 'unknownSection'
  | 'invalidDate'
  | 'invalidGuardian'
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
  arabicName?: string;
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
  parents?: ParentFormValues[];
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
/** Alternate naming convention, independent of the order sections are returned. */
const sectionAlias = (name: string): string | undefined => {
  if (/^[a-z]$/i.test(name)) return String(name.toUpperCase().charCodeAt(0) - 64);
  if (/^[1-9]\d*$/.test(name) && Number(name) <= 26) return String.fromCharCode(64 + Number(name));
  return undefined;
};
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
    const arabicName = field('arabicName');
    if (arabicName.length > 100) problem('invalidArabicName');

    const studentCode = field('studentCode');
    if (studentCode && codes.has(studentCode)) problem('duplicateCode', studentCode);
    if (studentCode) codes.add(studentCode);

    const gender = GENDER_VALUES.find(value => sameName(value, field('gender')));
    if (!gender) problem('invalidGender', field('gender'));

    const statusText = field('status');
    const status = statusText ? STUDENT_STATUS_VALUES.find(value => sameName(value, statusText)) : undefined;
    if (statusText && !status) problem('invalidStatus', statusText);

    const className = field('class');
    const studentClass = findClassByName(classes, className);
    if (!studentClass) problem('unknownClass', className);
    const sectionName = field('section');
    const alias = sectionAlias(sectionName);
    const section = studentClass?.sections?.find(candidate => sameName(candidate.name, sectionName))
      ?? (alias ? studentClass?.sections?.find(candidate => sameName(candidate.name, alias)) : undefined);
    if (studentClass && !section) problem('unknownSection', sectionName);

    const date = (key: 'dateOfBirth' | 'enrollmentDate') => {
      const text = dayOf(field(key));
      if (text && !isDateOnly(text)) problem('invalidDate', field(key));
      return text || undefined;
    };
    const dateOfBirth = date('dateOfBirth');
    const enrollmentDate = date('enrollmentDate') ?? admissionDate;

    let guardian: ParentFormValues | undefined;
    const guardianName = field('guardianName');
    const guardianPhone = field('guardianPhone') || field('guardianPhone2');
    const guardianEmail = field('guardianEmail');
    const guardianCin = field('guardianCin');
    if (guardianName || guardianPhone || guardianEmail || guardianCin) {
      const parsed = parentSchema.safeParse({
        name: guardianName,
        ...(guardianPhone && { phone: guardianPhone }),
        ...(guardianEmail && { email: guardianEmail }),
        ...(guardianCin && { cin: guardianCin }),
        relationshipType: field('guardianRelationship').toLowerCase() || 'guardian',
      });
      if (parsed.success) guardian = parsed.data;
      else problem('invalidGuardian', [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))].join(', '));
    }

    if (rowProblems.length || !gender || !studentClass || !section) {
      problems.push(...rowProblems);
      return;
    }

    const phone = field('phone');
    const address = field('address');
    students.push({
      studentCode,
      name,
      ...(arabicName && { arabicName }),
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
      ...(guardian && { parents: [guardian] }),
    });
  });

  return { students, problems };
}
