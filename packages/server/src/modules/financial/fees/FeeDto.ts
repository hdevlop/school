import { z } from 'zod';
import { academicYearField, optionalDateField, optionalId, requiredId, money } from '../../../shared/fields';
import { feeStatusEnum, scheduleEnum } from '../../../shared/enums';

const feeSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  feeTypeId: requiredId,
  academicYear: academicYearField.optional(),
  effectiveDate: optionalDateField,
  status: feeStatusEnum.optional(),
  schedule: scheduleEnum,
  baseAmount: money().positive('Base amount must be positive').optional(),
  grossAmount: money().positive('Gross amount must be positive').optional(),
  netAmount: money().optional(),
  paidAmount: money().min(0, 'Paid amount cannot be negative').optional(),
  discountAmount: money().min(0, 'Discount cannot be negative').optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  assignedBy: optionalId.nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const createFeeDto = feeSchema.omit({
  id: true,
  status: true,
  paidAmount: true,
  grossAmount: true,
  netAmount: true,
  assignedBy: true,
}); // FIX: SEC-002 — assignment comes from the trusted service actor.
export const updateFeeDto = createFeeDto.partial(); // FIX: SEC-011 — status is allocation-derived.

export const createFeesBulkDto = z.object({
  fees: z.array(createFeeDto).min(1),
});

export const deleteFeeIdsDto = z.array(z.string().min(1)).min(1);
export const deleteFeesBulkInputDto = z.object({
  ids: deleteFeeIdsDto,
});
export const deleteFeesBulkDto = z.preprocess(
  (value) => (Array.isArray(value) ? { ids: value } : value),
  deleteFeesBulkInputDto,
);

export const feeIdParam = z.object({ id: z.string().min(1) });
export const studentIdParam = z.object({ studentId: z.string().min(1) });
// The normal list year is resolved by the shared REST/MCP request scope.
export const overdueStudentBody = studentIdParam;
export type OverdueStudentBody = z.infer<typeof overdueStudentBody>;

export const classBulkFeeDto = z.object({
  classId: requiredId,
  sectionId: optionalId,
  feeTypeId: requiredId,
  schedule: scheduleEnum,
  academicYear: academicYearField.optional(),
  effectiveDate: optionalDateField,
  baseAmount: money().positive('Base amount must be positive').optional(),
  discountAmount: money().min(0, 'Discount cannot be negative').optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type CreateFeeDto = z.infer<typeof createFeeDto>;
export type UpdateFeeDto = z.infer<typeof updateFeeDto>;
export type CreateFeesBulkDto = z.infer<typeof createFeesBulkDto>;
export type DeleteFeesBulkDto = z.infer<typeof deleteFeesBulkDto>;
export type ClassBulkFeeDto = z.infer<typeof classBulkFeeDto>;
