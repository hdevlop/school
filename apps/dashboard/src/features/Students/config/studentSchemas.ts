import { z } from 'zod';
import { GENDER_VALUES, STUDENT_STATUS_VALUES } from '@sms/contracts';

type T = (key: string) => string;

/**
 * The student forms' schemas. They take `t` so a refused field reads in the
 * page's language.
 */
export const createStudentSchemas = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const requiredId = (message: string) => z.preprocess(
    (value) => value ?? '',
    z.string().min(1, message),
  );
  const emailField = z.string().email(t('validationMessages.invalidEmailFormat')).or(z.literal(''));
  const phoneField = z.preprocess(
    (value) => value === '' ? null : value,
    z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('validationMessages.invalidPhoneNumber')).nullish(),
  );
  const nameField = z
    .string()
    .min(2, t('validationMessages.nameMustBeAtLeast2Characters'))
    .max(100, t('validationMessages.nameTooLong'));
  const dateField = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('validationMessages.dateMustBeInYyyyMmDdMmDd'),
  );
  const optionalDateField = z.preprocess(
    (value) => value === '' ? null : value,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.dateMustBeInYyyyMmDdFormat')).nullish(),
  );
  const locationValueSchema = z.object({
    address: z.string().max(500, t('validationMessages.addressTooLong')),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
  });

  /**
   * A student on their own — the quick-add dialog and the profile edit.
   *
   * `addressLocation` is the map picker's `{ address, latitude, longitude }`
   * object rather than three fields, because that is what the picker writes.
   * The full student form flattens it into `address` / `addressLatitude` /
   * `addressLongitude` just before the request is built; nothing else does, so
   * that flattening stays in `FullStudentForm` rather than in this schema.
   *
   * `image` accepts a `File` so a freshly picked photo and a stored path both
   * validate against the same schema.
   */
  const student = z.object({
    id: optionalId,
    classId: requiredId(t('validationMessages.classIsRequired')),
    sectionId: requiredId(t('validationMessages.sectionIsRequired')),
    studentCode: z.string().trim().min(1, t('validationMessages.required')),
    name: nameField,
    arabicName: z.string().trim().max(100, t('validationMessages.arabicNameTooLong')).nullish(),
    email: emailField,
    phone: phoneField,
    addressLocation: locationValueSchema,
    addressPlaceId: z.string().max(255).optional().nullable(),
    dateOfBirth: optionalDateField,
    gender: z.enum(GENDER_VALUES),
    enrollmentDate: dateField,
    medicalConditions: z.string().max(1000, t('validationMessages.medicalConditionsDescriptionTooLong')).nullish().optional(),
    previousSchool: z.string().max(500, t('validationMessages.previousSchoolNameTooLong')).optional().nullable(),
    image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
    status: z.enum(STUDENT_STATUS_VALUES).default('active'),
  });

  /**
   * The profile edit. Class, section and enrollment status belong to the dated
   * enrollment records, which the server refuses to change through a profile
   * edit, so they are shown read-only and not required: a student viewed in a
   * year without a placement has none.
   */
  const profileEdit = student.extend({
    classId: optionalId,
    sectionId: optionalId,
    status: z.string().nullish(),
  });

  return { student, profileEdit };
};

export type StudentFormValues = z.input<ReturnType<typeof createStudentSchemas>['student']>;

/** The fields a profile edit leaves to the enrollment records. */
export const PLACEMENT_FIELDS = ['classId', 'sectionId', 'status'] as const;
