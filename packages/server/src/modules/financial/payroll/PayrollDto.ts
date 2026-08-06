import { z } from 'zod';
import { dateField, num } from '@server/shared/fields';
import { paymentMethodEnum, payslipStatusEnum } from '@server/shared/enums';

const periodField = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in YYYY-MM format');

export const runPayrollDto = z.object({
  period: periodField,
});

export const payPayslipDto = z.object({
  paymentMethod: paymentMethodEnum,
  paymentDate: dateField.optional(),
  transactionRef: z.preprocess((val) => (val === '' ? null : val), z.string().max(100, 'Transaction reference too long').optional().nullable()),
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, 'Notes too long').optional().nullable()),
});

export const updatePayslipDto = z.object({
  totalAllowances: num().min(0, 'Allowances cannot be negative').optional(),
  totalDeductions: num().min(0, 'Deductions cannot be negative').optional(),
  status: payslipStatusEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  paymentDate: z.preprocess((val) => (val === '' ? null : val), dateField.optional().nullable()),
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, 'Notes too long').optional().nullable()),
}).strict();

// One-click: create-and-pay a payslip for a staff member in a period (no separate "run" step).
const payCommonFields = {
  paymentMethod: paymentMethodEnum.optional(),
  paymentDate: dateField.optional(),
  transactionRef: z.preprocess((val) => (val === '' ? null : val), z.string().max(100, 'Transaction reference too long').optional().nullable()),
  notes: z.preprocess((val) => (val === '' ? null : val), z.string().max(1000, 'Notes too long').optional().nullable()),
};

export const payStaffDto = z.object({
  staffId: z.string().min(1),
  period: periodField,
  ...payCommonFields,
});

export const payStaffBulkDto = z.object({
  staffIds: z.array(z.string().min(1)).min(1, 'At least one staff member is required'),
  period: periodField,
  ...payCommonFields,
});

// Undo a payment: keep the payslip snapshot and return it to pending.
export const unpayStaffDto = z.object({
  staffId: z.string().min(1),
  period: periodField,
});

export const payslipIdParam = z.object({ id: z.string().min(1) });
export const payslipPeriodParam = z.object({ period: periodField });
export const deleteBulkPayslipsDto = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one payslip is required'),
});

export type RunPayrollDto = z.infer<typeof runPayrollDto>;
export type PayPayslipDto = z.infer<typeof payPayslipDto>;
export type PayStaffDto = z.infer<typeof payStaffDto>;
export type PayStaffBulkDto = z.infer<typeof payStaffBulkDto>;
export type UnpayStaffDto = z.infer<typeof unpayStaffDto>;
export type UpdatePayslipDto = z.infer<typeof updatePayslipDto>;
export type DeleteBulkPayslipsDto = z.infer<typeof deleteBulkPayslipsDto>;
