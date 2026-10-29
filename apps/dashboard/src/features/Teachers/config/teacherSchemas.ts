import { z } from 'zod';
import { EMPLOYMENT_TYPE_VALUES, GENDER_VALUES, TEACHER_STATUS_VALUES } from '@sms/contracts';

type T = (key: string) => string;

const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

/** A cleared number input holds `null` or `''`; an optional field reads it as not given. */
const optionalNumberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => (value === null || value === '' ? undefined : value), numberField(schema).optional());

/**
 * An optional text or phone input starts as `''`. Read blank as not given, so
 * it is neither checked against the field's rules nor sent: the API refuses
 * `''` for these fields.
 */
const optionalText = <S extends z.ZodType>(schema: S) =>
  z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), schema.optional());

/**
 * Hiring a teacher, in the three steps the wizard walks through. The schemas
 * take `t` so a refused field reads in the page's language.
 *
 * Each step binds its own schema so the user is stopped at the step that has
 * the problem, and `full` is the same three merged for the final submit.
 * Keeping the parts and the whole in one place is what stops a field from
 * being validated on one screen and not the other.
 */
export const createTeacherSchemas = (t: T, { requireEmail = true } = {}) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const validEmail = z.string().trim().email(t('validationMessages.invalidEmailFormat'));
  const emailField = requireEmail
    ? z.string().trim().min(1, t('teachers.errors.invitationEmailRequired')).email(t('validationMessages.invalidEmailFormat'))
    : validEmail.or(z.literal(''));
  const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('validationMessages.invalidPhoneNumber'));
  const nameField = z
    .string()
    .min(2, t('validationMessages.nameMustBeAtLeast2Characters'))
    .max(100, t('validationMessages.nameTooLong'));
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );
  const cinField = z.string().min(7, t('validationMessages.cinMustBeAtLeast7Characters')).max(20, t('validationMessages.cinTooLong'));
  const addressField = z.string().max(500, t('validationMessages.addressTooLong')).optional();
  const validNumber = () => z.number({ error: t('validationMessages.mustBeAValidNumber') });

  /** Step 1 — who they are. */
  const personal = z.object({
    id: optionalId,
    name: nameField,
    cin: cinField,
    email: emailField,
    phone: phoneField,
    address: addressField,
    gender: z.enum(GENDER_VALUES).optional(),
    emergencyContact: optionalText(nameField),
    emergencyPhone: optionalText(phoneField),
    status: z.enum(TEACHER_STATUS_VALUES).default('active'),
    image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  });

  /** Step 2 — the terms of their employment. */
  const professional = z.object({
    specialization: z.string().max(100, t('validationMessages.specializationTooLong')).optional(),
    yearsOfExperience: optionalNumberField(validNumber().int(t('validationMessages.mustBeAnInteger'))
      .min(0, t('validationMessages.yearsOfExperienceMustBeNonNegative'))),
    salary: optionalNumberField(validNumber().positive(t('validationMessages.salaryMustBePositive'))),
    hireDate: dateField,
    bankAccount: z.coerce.string().max(100, { message: t('validationMessages.bankAccountTooLong') }).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional(),
    workloadHours: optionalNumberField(validNumber().int(t('validationMessages.mustBeAnInteger'))
      .min(0, t('validationMessages.workloadHoursMustBeNonNegative'))
      .max(60, t('validationMessages.workloadHoursCannotExceed60'))),
    academicDegrees: z.string().max(500, t('validationMessages.academicDegreesDescriptionTooLong')).optional(),
  });

  /** One line of "this teacher teaches these subjects to these sections". */
  const assignment = z.object({
    classId: z.string().min(1, t('validationMessages.classIsRequired')),
    sectionIds: z.array(z.string()).min(1, t('validationMessages.atLeastOneSectionIsRequired')),
    subjectIds: z.array(z.string()).min(1, t('validationMessages.atLeastOneSubjectIsRequired')),
  });

  /** The bulk assignment dialog: it is opened to assign, so it needs one line. */
  const assignments = z.object({
    assignments: z.array(assignment).min(1, t('validationMessages.atLeastOneAssignmentIsRequired')),
  });

  /**
   * Step 3 — the timetable. A teacher may have none yet, and removing the last
   * one is how an edit clears the year's assignments before a delete.
   */
  const assignmentsStep = z.object({
    assignments: z.array(assignment),
  });

  const full = z.object({
    ...personal.shape,
    ...professional.shape,
    ...assignmentsStep.shape,
  });

  return { personal, professional, assignment, assignments, assignmentsStep, full };
};

type TeacherSchemas = ReturnType<typeof createTeacherSchemas>;
export type TeacherPersonalFormValues = z.input<TeacherSchemas['personal']>;
export type TeacherProfessionalFormValues = z.input<TeacherSchemas['professional']>;
export type TeacherAssignmentFormValues = z.input<TeacherSchemas['assignment']>;
export type TeacherFullFormValues = z.input<TeacherSchemas['full']>;
