import { z } from 'zod';

export const requiredId = z.preprocess((val) => val ?? '', z.string().min(1, 'ID is required'));
export const optionalId = z.string().min(1, 'ID cannot be empty').nullish().optional();
export const emailField = z.string().email('Invalid email format').or(z.literal(''));
export const phoneField = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');
export const nameField = z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');
export const dateField = z
  .string()
  .regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    'Date must be in YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YY, or DD-MM-YYYY format',
  );
export const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const timePattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::[0-5][0-9])?$/;
export const timeField = z.union([
  z.literal('').transform(() => undefined),
  z.string()
    .regex(timePattern, 'Time must be in HH:MM format')
    .transform((val) => {
      const match = val.trim().match(timePattern);
      return match ? `${match[1].padStart(2, '0')}:${match[2]}` : val;
    }),
]).optional().nullable();
export const cinField = z.string().min(8, 'CIN must be at least 8 characters').max(20, 'CIN too long');
export const addressField = z.string().max(500, 'Address too long').optional();
export const academicYearField = z
  .string()
  .min(9, 'Academic year is required')
  .regex(/^\d{4}-\d{4}$/, 'Academic year must be in YYYY-YYYY format');

type ZodNumChainable = z.ZodNumber & {
  positive: (msg?: string) => ZodNumChainable;
  min: (value: number, msg?: string) => ZodNumChainable;
  max: (value: number, msg?: string) => ZodNumChainable;
  int: (msg?: string) => ZodNumChainable;
};

export const num = (): ZodNumChainable => {
  const createChainable = (currentSchema: z.ZodNumber): ZodNumChainable => {
    // Capture native methods before Object.assign overwrites them
    const nativePositive = currentSchema.positive.bind(currentSchema);
    const nativeMin = currentSchema.min.bind(currentSchema);
    const nativeMax = currentSchema.max.bind(currentSchema);
    const nativeInt = currentSchema.int.bind(currentSchema);

    const methods = {
      positive: (msg = 'Must be positive') => createChainable(nativePositive(msg)),
      min: (value: number, msg?: string) => createChainable(nativeMin(value, msg || `Must be at least ${value}`)),
      max: (value: number, msg?: string) => createChainable(nativeMax(value, msg || `Cannot exceed ${value}`)),
      int: (msg = 'Must be an integer') => createChainable(nativeInt(msg)),
    };

    return Object.assign(currentSchema, methods) as ZodNumChainable;
  };

  return createChainable(z.coerce.number());
};
