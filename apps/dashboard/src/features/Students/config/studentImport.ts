import { findClassByName, GENDER_VALUES, SCHEDULE_VALUES, STUDENT_STATUS_VALUES, type Gender, type Schedule, type StudentStatus } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';
import { academicYearStartDate, firstYearEnrolledOn } from './newStudentEnrollment';
import { createParentSchemas, type ParentImportValues } from '@/features/Parents/config/parentSchemas';

// The import reports which guardian fields failed, never their messages, so the
// schema's translator is irrelevant here.
const parentSchema = createParentSchemas((key) => key).importParent;

/**
 * The columns an import reads. Exported table columns use these same keys,
 * so an exported file imports back unchanged; the others are optional extras.
 * Class names accept official codes and familiar app names, matched against
 * classes a new student may join, never by id. Sections also accept
 * equivalent numeric/letter names (1 = A, 2 = B, through 26 = Z).
 *
 * A JSON row may also carry `parents` (a list replacing the guardian columns)
 * and `fees` (the student's fee assignments, each naming its fee type by
 * `feeType` name or `feeTypeId`). Spreadsheets keep the flat guardian columns.
 */
export const STUDENT_IMPORT_COLUMNS = [
  'studentCode', 'name', 'email', 'phone', 'class', 'section', 'gender', 'status',
  'address', 'dateOfBirth', 'enrollmentDate', 'arabicName',
  'guardianName', 'guardianPhone', 'guardianPhone2', 'guardianEmail', 'guardianCin', 'guardianRelationship',
  'parents', 'fees', 'left', 'leftOn',
] as const;

export type StudentImportReason =
  | 'missingName'
  | 'invalidArabicName'
  | 'invalidGender'
  | 'invalidStatus'
  | 'missingLeavingDate'
  | 'unknownClass'
  | 'unknownSection'
  | 'invalidDate'
  | 'invalidGuardian'
  | 'duplicateCode'
  | 'unknownFeeType'
  | 'invalidFee'
  | 'feeYearMismatch'
  | 'feeBeforeEnrollment';

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
  departure?: { leftOn: string; status: 'withdrawn' };
  classId: string;
  sectionId: string;
  enrollmentDate: string;
  yearEnrolledOn: string;
  parents?: ParentImportValues[];
  fees?: StudentImportFee[];
}

/**
 * A fee assignment as the student import route takes it, without the student
 * and without the year: the server bills the year the student joins.
 */
export interface StudentImportFee {
  feeTypeId: string;
  schedule: Schedule;
  baseAmount?: number;
  effectiveDate?: string;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
}

interface ImportClass {
  id: string;
  name: string;
  academicYear?: string | null;
  sections?: { id: string; name: string }[] | null;
}

interface ImportFeeType {
  id: string;
  name: string;
  paymentType?: string | null;
  amount?: string | number | null;
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
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';
/** A JSON number or a spreadsheet's numeric text; blank means not given. */
const amountOf = (value: unknown): number | undefined | null => {
  const text = cellText(value);
  if (!text) return undefined;
  const amount = Number(text);
  return Number.isFinite(amount) && Math.round(amount * 100) === amount * 100 ? amount : null;
};

/**
 * Checks every row before any is sent, so a file with a mistake creates
 * nobody rather than half the class. What only the server knows — a code
 * already taken, an email in use — is refused per row when it is created.
 */
export function buildStudentImport(
  rows: Record<string, unknown>[],
  classes: ImportClass[],
  admissionDate: string,
  feeTypes: ImportFeeType[] = [],
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

    const parents: ParentImportValues[] = [];
    const addGuardian = (values: Record<string, unknown>, label?: string) => {
      const parsed = parentSchema.safeParse(values);
      if (parsed.success) parents.push(parsed.data);
      else {
        const paths = [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))].join(', ');
        problem('invalidGuardian', label ? `${label}: ${paths}` : paths);
      }
    };
    const guardianName = field('guardianName');
    const guardianPhone = field('guardianPhone') || field('guardianPhone2');
    const guardianEmail = field('guardianEmail');
    const guardianCin = field('guardianCin');
    if (hasValue(record.parents)) {
      // A JSON list of guardians replaces the guardian columns.
      if (!Array.isArray(record.parents) || !record.parents.every(isRecord)) problem('invalidGuardian', 'parents');
      else record.parents.forEach((entry, position) => {
        const text = (key: string) => cellText(entry[key]);
        const phone = text('phone') || text('phone2');
        addGuardian({
          name: text('name'),
          ...(phone && { phone }),
          ...(text('email') && { email: text('email') }),
          ...(text('cin') && { cin: text('cin') }),
          relationshipType: (text('relationshipType') || text('relationship')).toLowerCase() || 'guardian',
          ...(typeof entry.isEmergencyContact === 'boolean' && { isEmergencyContact: entry.isEmergencyContact }),
          ...(typeof entry.financialResponsibility === 'boolean' && { financialResponsibility: entry.financialResponsibility }),
        }, `parents[${position + 1}]`);
      });
    } else if (guardianName || guardianPhone || guardianEmail || guardianCin) {
      addGuardian({
        name: guardianName,
        ...(guardianPhone && { phone: guardianPhone }),
        ...(guardianEmail && { email: guardianEmail }),
        ...(guardianCin && { cin: guardianCin }),
        relationshipType: field('guardianRelationship').toLowerCase() || 'guardian',
      });
    }

    const fees: StudentImportFee[] = [];
    if (hasValue(record.fees)) {
      if (!Array.isArray(record.fees)) problem('invalidFee', 'fees');
      else record.fees.forEach((entry, position) => {
        const at = `fees[${position + 1}]`;
        if (!isRecord(entry)) {
          problem('invalidFee', at);
          return;
        }
        const before = rowProblems.length;
        const text = (key: string) => cellText(entry[key]);
        // Fee types are matched by id, else by name as the fee types page shows it.
        const typeId = text('feeTypeId');
        const typeName = text('feeType') || text('feeTypeName');
        const feeType = (typeId ? feeTypes.find(candidate => candidate.id === typeId) : undefined)
          ?? (typeName ? feeTypes.find(candidate => sameName(candidate.name.trim(), typeName)) : undefined);
        if (!feeType) {
          problem('unknownFeeType', typeName || typeId);
          return;
        }

        const scheduleText = text('schedule');
        const schedule = scheduleText
          ? SCHEDULE_VALUES.find(value => sameName(value, scheduleText))
          : feeType.paymentType === 'oneTime' ? 'oneTime' : 'monthly';
        if (!schedule) problem('invalidFee', `${at}.schedule`);
        const baseAmount = amountOf(entry.baseAmount);
        if (baseAmount === null || (baseAmount !== undefined && baseAmount <= 0)) problem('invalidFee', `${at}.baseAmount`);
        const discountAmount = amountOf(entry.discountAmount);
        if (discountAmount === null || (discountAmount !== undefined && discountAmount < 0)) problem('invalidFee', `${at}.discountAmount`);
        const discountReason = text('discountReason');
        if (discountReason.length > 500) problem('invalidFee', `${at}.discountReason`);
        const notes = text('notes');
        if (notes.length > 1000) problem('invalidFee', `${at}.notes`);

        // The server bills the year the student joins, from their enrollment
        // (never before the year's first day), and refuses anything else.
        const year = text('academicYear');
        if (year && studentClass?.academicYear && year !== studentClass.academicYear) problem('feeYearMismatch', year);
        const effectiveDate = dayOf(text('effectiveDate'));
        if (effectiveDate && !isDateOnly(effectiveDate)) problem('invalidDate', text('effectiveDate'));
        else if (effectiveDate && studentClass && isDateOnly(enrollmentDate)) {
          const yearStart = academicYearStartDate(studentClass.academicYear, enrollmentDate);
          const firstBillable = enrollmentDate > yearStart ? enrollmentDate : yearStart;
          if (effectiveDate < firstBillable) problem('feeBeforeEnrollment', effectiveDate);
        }

        if (schedule === 'occasional' && (!effectiveDate || (discountAmount ?? 0) !== 0)) problem('invalidFee', at);
        if (rowProblems.length > before || !schedule) return;
        // Student creation sets up an empty container. The finance import reads
        // the original file and restores each historical occasional charge.
        if (schedule === 'occasional') {
          const existing = fees.find(fee => fee.feeTypeId === feeType.id && fee.schedule === 'occasional');
          if (existing) {
            if (effectiveDate < existing.effectiveDate!) existing.effectiveDate = effectiveDate;
            return;
          }
        }
        fees.push({
          feeTypeId: feeType.id,
          schedule,
          ...(schedule === 'occasional' && Number(feeType.amount) > 0
            ? { baseAmount: Number(feeType.amount) } : baseAmount != null ? { baseAmount } : {}),
          ...(effectiveDate && { effectiveDate }),
          ...(discountAmount != null && { discountAmount }),
          ...(discountReason && { discountReason }),
          ...(notes && { notes }),
        });
      });
    }

    if (rowProblems.length || !gender || !studentClass || !section) {
      problems.push(...rowProblems);
      return;
    }

    const left = record.left === true || ['true', '1', 'yes'].includes(field('left').toLowerCase());
    const leftOn = dayOf(field('leftOn'));
    if (left && !leftOn) {
      problems.push({ row, reason: 'missingLeavingDate' });
      return;
    }
    if (leftOn && (!isDateOnly(leftOn) || leftOn <= firstYearEnrolledOn(enrollmentDate, studentClass.academicYear))) {
      problems.push({ row, reason: 'invalidDate', value: leftOn });
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
      ...(leftOn && { departure: { leftOn, status: 'withdrawn' as const } }),
      classId: studentClass.id,
      sectionId: section.id,
      enrollmentDate,
      yearEnrolledOn: firstYearEnrolledOn(enrollmentDate, studentClass.academicYear),
      ...(parents.length > 0 && { parents }),
      ...(fees.length > 0 && { fees }),
    });
  });

  return { students, problems };
}
