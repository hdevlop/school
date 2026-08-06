import { z } from 'zod';
import { dateField, num, optionalDateField, optionalId } from '@server/shared/fields';
import { expenseCategoryEnum, expenseStatusEnum, paymentMethodEnum } from '@server/shared/enums';

const expenseSchema = z.object({
  id: optionalId,
  category: expenseCategoryEnum,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  amount: num().positive('Amount must be greater than 0').max(10000000, 'Amount too large'),
  expenseDate: dateField,
  paymentMethod: paymentMethodEnum.optional().nullable(),
  paymentDate: optionalDateField.nullable(),
  vendor: z.string().max(200, 'Vendor name too long').optional().nullable(),
  invoiceNumber: z.string().max(100, 'Invoice number too long').optional().nullable(),
  receiptNumber: z.string().max(100, 'Receipt number too long').optional().nullable(),
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  status: expenseStatusEnum.optional(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

const expenseApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000, 'Rejection reason too long').optional().nullable(),
});

const expensePaymentSchema = z.object({
  paymentMethod: paymentMethodEnum,
  paymentDate: dateField,
  checkNumber: z.string().max(50, 'Check number too long').optional().nullable(),
  transactionRef: z.string().max(100, 'Transaction reference too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export const createExpenseDto = expenseSchema.omit({ id: true, status: true });
export const updateExpenseDto = createExpenseDto.partial().extend({
  status: expenseStatusEnum.optional(),
});

export const expenseApprovalDto = expenseApprovalSchema;
export const expensePaymentDto = expensePaymentSchema;

export const expenseIdParam = z.object({ id: z.string().min(1) });
export const expenseDateRangeParam = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export type CreateExpenseDto = z.infer<typeof createExpenseDto>;
export type UpdateExpenseDto = z.infer<typeof updateExpenseDto>;
export type ExpenseApprovalDto = z.infer<typeof expenseApprovalDto>;
export type ExpensePaymentDto = z.infer<typeof expensePaymentDto>;
