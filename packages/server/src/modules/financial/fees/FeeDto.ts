import { z } from 'zod';
import { academicYearField, num, optionalDateField, optionalId, requiredId } from '@server/shared/fields';
import { feeStatusEnum, scheduleEnum } from '@server/shared/enums';

const feeSchema = z.object({
  id: optionalId,
  studentId: requiredId,
  feeTypeId: requiredId,
  academicYear: academicYearField.optional(),
  effectiveDate: optionalDateField,
  status: feeStatusEnum.optional(),
  schedule: scheduleEnum,
  baseAmount: num().positive('Base amount must be positive').optional(),
  grossAmount: num().positive('Gross amount must be positive').optional(),
  netAmount: num().optional(),
  paidAmount: num().min(0, 'Paid amount cannot be negative').optional(),
  discountAmount: num().min(0, 'Discount cannot be negative').optional(),
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
});
export const updateFeeDto = createFeeDto.partial().extend({
  status: feeStatusEnum.optional(),
});

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

export const classBulkFeeDto = z.object({
  classId: requiredId,
  sectionId: optionalId,
  feeTypeId: requiredId,
  schedule: scheduleEnum,
  academicYear: academicYearField.optional(),
  baseAmount: num().positive('Base amount must be positive').optional(),
  discountAmount: num().min(0, 'Discount cannot be negative').optional(),
  discountReason: z.string().max(500, 'Discount reason too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type CreateFeeDto = z.infer<typeof createFeeDto>;
export type UpdateFeeDto = z.infer<typeof updateFeeDto>;
export type CreateFeesBulkDto = z.infer<typeof createFeesBulkDto>;
export type DeleteFeesBulkDto = z.infer<typeof deleteFeesBulkDto>;
export type ClassBulkFeeDto = z.infer<typeof classBulkFeeDto>;
