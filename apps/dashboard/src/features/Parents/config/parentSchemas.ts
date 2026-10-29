import { z } from 'zod';
import { GENDER_VALUES, MARITAL_STATUS_VALUES, RELATIONSHIP_TYPE_VALUES } from '@sms/contracts';

type T = (key: string) => string;

/**
 * The parent forms' schemas. They take `t` so a refused field reads in the
 * page's language.
 */
export const createParentSchemas = (t: T) => {
  const optionalId = z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1, t('validationMessages.idCannotBeEmpty')).nullish().optional(),
  );
  const emailField = z.string().email(t('validationMessages.invalidEmailFormat')).or(z.literal(''));
  const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('validationMessages.invalidPhoneNumber'));
  const nameField = z
    .string()
    .min(2, t('validationMessages.nameMustBeAtLeast2Characters'))
    .max(100, t('validationMessages.nameTooLong'));
  // The date input starts as `''`; read blank as not given rather than as a
  // malformed date, so an optional date of birth can be left empty.
  const optionalDateField = z.preprocess(
    (value) => (value === '' ? null : value),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validationMessages.dateMustBeInYyyyMmDdFormat'))
      .nullable()
      .optional(),
  );
  const cinField = z.string().trim().min(7, t('validationMessages.cinMustBeAtLeast7Characters')).max(20, t('validationMessages.cinTooLong'));
  const addressField = z.string().max(500, t('validationMessages.addressTooLong')).optional();

  /**
   * One parent or guardian.
   *
   * File imports may retain incomplete records from the school's workbook.
   * Manual entry extends this schema to require phone and CIN.
   *
   * `image` accepts a `File` as well as a string: the same schema validates both
   * a freshly picked upload and a record loaded back from the API with a stored
   * path.
   */
  const importParent = z.object({
    id: optionalId,
    name: nameField,
    email: emailField.optional(),
    phone: z.preprocess(value => value === '' ? null : value, phoneField.nullish()),
    gender: z.enum(GENDER_VALUES).optional(),
    address: addressField,
    dateOfBirth: optionalDateField,
    cin: z.preprocess(value => value === '' ? null : value, cinField.nullish()),
    occupation: z.string().max(100, t('validationMessages.occupationTooLong')).optional(),
    nationality: z.string().max(100, t('validationMessages.nationalityTooLong')).optional(),
    maritalStatus: z.enum(MARITAL_STATUS_VALUES).optional(),
    relationshipType: z.enum(RELATIONSHIP_TYPE_VALUES),
    image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
    isEmergencyContact: z.boolean().optional().default(false),
    financialResponsibility: z.boolean().optional().default(false),
  });

  const parent = importParent.extend({
    phone: z.string().trim().min(1, t('validationMessages.required')).pipe(phoneField),
    cin: z.string().trim().min(1, t('validationMessages.required')).pipe(cinField),
  });

  /**
   * A list of parents, as the bulk form and the full student form submit it.
   *
   * Defaults to an empty array rather than requiring one entry: a student can be
   * created before any guardian details are known, and the parents tab is then
   * filled in later.
   */
  const parents = z.object({
    parents: z.array(parent).optional().default([]),
  });

  return { parent, parents, importParent };
};

type ParentSchemas = ReturnType<typeof createParentSchemas>;
export type ParentFormValues = z.input<ParentSchemas['parent']>;
export type ParentImportValues = z.input<ParentSchemas['importParent']>;
export type ParentsFormValues = z.input<ParentSchemas['parents']>;
