import { z } from 'zod';
import { createFeeDto } from './FeeDto';
import { money, requiredId } from '../../../shared/fields';
import { paymentMethodEnum } from '../../../shared/enums';
import { isDateOnly } from '@sms/contracts/academic-years';
import { importDateCorrectionDto } from '../../studentEnrollments/StudentEnrollmentDto';

const day = z.string().refine(isDateOnly, 'Expected a real YYYY-MM-DD date');
export const importStudentFeesDto = z.object({
  studentId: requiredId,
  enrollmentDate: day.optional(),
  fees: z.array(createFeeDto.omit({ studentId: true })).max(200),
  payments: z.array(z.object({
    receiptNumber: z.string().trim().min(1).max(50),
    myskoolPlusReceipt: z.string().trim().max(100).optional(),
    paymentDate: day,
    paymentMethod: paymentMethodEnum,
    checkNumber: z.string().trim().max(50).optional(),
    checkDueDate: day.optional(),
    settledDate: day.optional(),
    notes: z.string().max(800).optional(),
    allocations: z.array(z.object({
      feeTypeId: requiredId,
      month: z.string().regex(/^(registration|\d{4}-(0[1-9]|1[0-2]))$/),
      amount: money().positive(),
    })).min(1).max(200),
  }).refine(payment => payment.allocations.reduce((sum, line) => sum + Math.round(line.amount * 100), 0) <= 100_000_000,
    'Amount too large')
    .refine(payment => !payment.settledDate || (payment.paymentMethod === 'check' && payment.settledDate >= payment.paymentDate),
      'Only a cheque is cashed, and not before it was received')).max(500),
});
export type ImportStudentFeesDto = z.infer<typeof importStudentFeesDto>;
export const importStudentFeesWithDatesDto = importStudentFeesDto.extend({
  enrollmentDate: day,
  dateCorrection: importDateCorrectionDto,
});
export const previewFeeImportDatesDto = z.object({
  students: z.array(z.object({ studentId: z.string().min(1), enrollmentDate: day })).max(5000),
});
export type ImportStudentFeesWithDatesDto = z.infer<typeof importStudentFeesWithDatesDto>;
export type PreviewFeeImportDatesDto = z.infer<typeof previewFeeImportDatesDto>;
