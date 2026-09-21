import { z } from 'zod';

/**
 * Field primitives every feature form is built from.
 *
 * This is the deliberately small escape hatch the feature-config migration
 * allows: an id field, a phone, a date string, a coerced number. They are
 * genuinely shared and carry no domain meaning, so they live here instead of
 * being copied into twenty `config/` folders — or, as before, dragging every
 * feature back into one global validation module.
 *
 * What does *not* belong here: anything naming a domain (a student, a fee, a
 * vehicle), any enum, any translation key, any schema a form is bound to.
 * Those are owned by the feature that renders them.
 *
 * The behaviour below is carried over verbatim from the module this replaced.
 * Messages, optionality and coercion are load-bearing: forms across the
 * dashboard already submit against them.
 */

/** An id the form must have. `null`/`undefined` become `''` so the message reads as "required". */
export const requiredId = z.preprocess((val) => val ?? '', z.string().min(1, 'ID is required'));

/** An id the form may omit. An empty select submits `''`, which means "not chosen", not "invalid". */
export const optionalId = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);

/** An email, or the empty string — a cleared optional email field is not a malformed one. */
export const emailField = z.string().email('Invalid email format').or(z.literal(''));

export const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');

export const nameField = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name too long');

/** A date the user typed, in any of the formats the dashboard's date inputs emit. */
export const dateField = z
  .string()
  .regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
  );

/** A stored date. Narrower than `dateField` on purpose: these come back from the API normalized. */
export const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();

const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;

/** A time, normalized to zero-padded `HH:MM`. A cleared field collapses to `undefined`. */
export const timeField = z
  .union([
    z.literal('').transform(() => undefined),
    z
      .string()
      .regex(timePattern, 'Time must be in HH:MM format')
      .transform((val) => {
        const match = val.trim().match(timePattern);
        return match ? `${match[1].padStart(2, '0')}:${match[2]}` : val;
      }),
  ])
  .optional()
  .nullable();

export const cinField = z
  .string()
  .min(8, 'CIN must be at least 8 characters')
  .max(20, 'CIN too long');

export const addressField = z.string().max(500, 'Address too long').optional();

export const academicYearField = z
  .string()
  .min(9, 'Academic year is required')
  .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');

/**
 * A number that arrives as a string.
 *
 * Every numeric `FormInput` submits text, so the bound schema has to accept
 * `'12'` and hand the API `12`. The chainable wrapper exists because the
 * transform has to run first: `z.number().min(...)` would reject the string
 * before it was ever converted, so each constraint is expressed as a refine
 * over the already-transformed value.
 */
export const num = () => {
  const createChainable = (currentSchema: z.ZodTypeAny): any => {
    const methods = {
      positive: (msg = 'Must be positive') =>
        createChainable(currentSchema.refine((val: number) => val > 0, { message: msg })),

      min: (value: number, msg?: string) =>
        createChainable(
          currentSchema.refine((val: number) => val >= value, {
            message: msg || `Must be at least ${value}`,
          }),
        ),

      max: (value: number, msg?: string) =>
        createChainable(
          currentSchema.refine((val: number) => val <= value, {
            message: msg || `Cannot exceed ${value}`,
          }),
        ),

      int: (msg = 'Must be an integer') =>
        createChainable(
          currentSchema.refine((val: number) => Number.isInteger(val), { message: msg }),
        ),
    };

    return Object.assign(currentSchema, methods);
  };

  const isValidNumber = (val: any) => {
    if (val === null || val === undefined || Number.isNaN(val)) return false;
    if (typeof val === 'number') return true;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed !== '' && !isNaN(Number(trimmed));
    }
    return false;
  };

  const baseSchema = z
    .any()
    .refine(isValidNumber, { message: 'Must be a valid number' })
    .transform((val) => (typeof val === 'string' ? Number(val) : val));

  return createChainable(baseSchema);
};
