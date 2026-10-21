import { z } from 'zod';
import { COMPENSATION_MODE_VALUES, EMPLOYMENT_TYPE_VALUES, SHIFT_VALUES, STAFF_STATUS_VALUES } from '@sms/contracts';
import { isDateOnly } from '@sms/contracts/academic-years';

type T = (key: string) => string;

const blankToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

/**
 * The staff wizard's schemas, one per step plus the whole record. They take
 * `t` so a refused field reads in the page's language; Zod's own defaults are
 * English, so every check that can fail on user input names its message.
 */
export const createStaffSchemas = (t: T, today = new Date().toISOString().slice(0, 10)) => {
  const tooLong = t('staff.validation.tooLong');
  const optionalString = (schema: z.ZodString) => schema.optional().or(z.literal(''));
  const optionalNumber = (schema: z.ZodCoercedNumber) => z.preprocess(blankToUndefined, schema.optional());
  // A blank number input reaches the schema as `''`; read it as missing so the
  // field says it is required instead of failing as a malformed number.
  const requiredNumber = (schema: z.ZodCoercedNumber) => z.preprocess(blankToUndefined, schema);
  const dateString = z.string().regex(
    /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})$/,
    t('staff.validation.dateInvalid'),
  );
  const optionalDateString = dateString.optional().or(z.literal(''));
  const phoneString = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, t('staff.validation.phoneInvalid'));
  const nameString = z.string().min(2, t('staff.validation.nameMin')).max(100, tooLong);
  const number = () => z.coerce.number(t('staff.validation.numberInvalid'));

  const personal = z.object({
    id: z.string().optional(),
    name: nameString,
    employeeCode: optionalString(z.string().max(50, tooLong)),
    cin: z.string().min(8, t('staff.validation.cinMin')).max(20, tooLong),
    gender: z.enum(['M', 'F']).optional(),
    phone: phoneString,
    email: z.string().email(t('staff.validation.emailInvalid')).optional().or(z.literal('')),
    address: z.string().min(1, t('staff.validation.addressRequired')).max(500, tooLong),
    medicalConditions: z.string().max(1000, tooLong).optional().nullable().or(z.literal('')),
    image: z.string().nullish(),
    role: z.string().min(1, t('staff.validation.roleRequired')),
    status: z.enum(STAFF_STATUS_VALUES),
    emergencyContact: optionalString(nameString),
    emergencyPhone: optionalString(phoneString),
  });

  const employment = z.object({
    department: optionalString(z.string().max(100, tooLong)),
    employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).optional().or(z.literal('')),
    compensationMode: z.enum(COMPENSATION_MODE_VALUES).default('monthly'),
    salary: requiredNumber(
      z.coerce.number(t('staff.validation.salaryRequired')).positive(t('staff.validation.salaryPositive')),
    ),
    hourlyRate: optionalNumber(number().positive(t('staff.validation.positiveNumber'))),
    workloadHours: optionalNumber(number().int(t('staff.validation.wholeNumber')).min(0, t('staff.validation.wholeNumber'))),
    shift: z.enum(SHIFT_VALUES).optional().or(z.literal('')),
    hireDate: dateString,
    endDate: optionalDateString,
    bankAccount: optionalString(z.string().max(100, tooLong)),
  });

  const assignment = z.object({
    zoneId: z.string().optional().or(z.literal('')),
    classId: z.string().optional().or(z.literal('')),
    sectionId: z.string().optional().or(z.literal('')),
    cycleId: z.string().optional().or(z.literal('')),
    vehicleId: z.string().optional().or(z.literal('')),
    startDate: optionalDateString,
    endDate: optionalDateString,
    notes: optionalString(z.string().max(1000, tooLong)),
  });

  const assignments = z.object({
    assignments: z.array(assignment).optional(),
    // Assistant-only: many classes selected in a single multiselect (expanded on submit).
    classIds: z.array(z.string()).optional(),
  });

  const driverDetails = z.object({
    licenseNumber: optionalString(z.string().min(5, t('staff.validation.licenseNumberMin')).max(20, tooLong)),
    licenseType: optionalString(z.string().max(10, tooLong)),
    licenseExpiry: z.string()
      .refine((value) => !value || isDateOnly(value), t('staff.validation.dateInvalid'))
      .refine((value) => !value || !isDateOnly(value) || value >= today, t('staff.validation.licenseExpired'))
      .optional(),
    yearsOfExperience: optionalNumber(number().int(t('staff.validation.wholeNumber')).min(0, t('staff.validation.wholeNumber'))),
    notes: optionalString(z.string().max(1000, tooLong)),
  });

  const issue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => {
    ctx.addIssue({ code: 'custom', path, message });
  };

  const validateCompensation = (data, ctx: z.RefinementCtx) => {
    if (data.compensationMode === 'hourly') {
      if (!(Number(data.hourlyRate) > 0)) issue(ctx, ['hourlyRate'], t('staff.validation.hourlyRateRequired'));
      if (!(Number(data.workloadHours) > 0)) issue(ctx, ['workloadHours'], t('staff.validation.workloadHoursRequired'));
    }
  };

  const validateDriverDetails = (data, ctx: z.RefinementCtx) => {
    if (data.role === 'driver') {
      if (!data.licenseNumber) issue(ctx, ['licenseNumber'], t('staff.validation.licenseNumberRequired'));
      if (!data.licenseType) issue(ctx, ['licenseType'], t('staff.validation.licenseTypeRequired'));
      if (!data.licenseExpiry) issue(ctx, ['licenseExpiry'], t('staff.validation.licenseExpiryRequired'));
    }
  };

  const validateAssignments = (data, ctx: z.RefinementCtx) => {
      if ((data.role === 'cleaner' || data.role === 'security') && data.assignments?.some((item) => !item.zoneId)) {
        issue(ctx, ['assignments', 0, 'zoneId'], t('staff.validation.zoneRequired'));
      }
      if (data.role === 'assistant' && !(data.classIds?.length)) {
        issue(ctx, ['classIds'], t('staff.validation.classRequired'));
      }
      if ((data.role === 'driver' || data.role === 'busAssistant') && (!data.assignments?.length || data.assignments.some((item) => !item.vehicleId))) {
        issue(ctx, ['assignments', 0, 'vehicleId'], t('staff.validation.vehicleRequired'));
      }
      if (data.role === 'accountant' && data.assignments?.some((item) => !item.cycleId)) {
        issue(ctx, ['assignments', 0, 'cycleId'], t('staff.validation.cycleRequired'));
      }
  };

  // A missing salary must not postpone the license checks until the final save.
  const details = z.intersection(
    employment.superRefine(validateCompensation),
    driverDetails.extend({ role: z.string() }).superRefine(validateDriverDetails),
  );
  const assignmentStep = assignments.extend({ role: z.string() }).superRefine(validateAssignments);
  const full = personal.merge(employment).merge(assignments).merge(driverDetails)
    .superRefine(validateCompensation).superRefine(validateDriverDetails).superRefine(validateAssignments);

  return { personal, employment, assignments, driverDetails, details, assignmentStep, full };
};

export type StaffSchemas = ReturnType<typeof createStaffSchemas>;
