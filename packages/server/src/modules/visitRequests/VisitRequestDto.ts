import { z } from 'zod';
import { VISIT_REQUEST_STATUS_VALUES } from '@sms/contracts';
import { phoneField } from '../../shared/fields';
export const createVisitRequestDto = z.object({ parentName: z.string().trim().min(2).max(120), phone: phoneField,
  email: z.string().email().max(254).optional().or(z.literal('')), cycleId: z.string().min(1).max(100).optional(),
  message: z.string().max(1000).optional(), website: z.string().max(1000).optional(),
});
export const updateVisitRequestDto = z.object({ status: z.enum(VISIT_REQUEST_STATUS_VALUES), staffNote: z.string().max(2000).nullable().optional() });
export const visitRequestIdParam = z.object({ id: z.string().min(1) });
export const visitRequestQueryDto = z.object({ status: z.enum(VISIT_REQUEST_STATUS_VALUES).optional() });
export type CreateVisitRequestDto = z.infer<typeof createVisitRequestDto>;
export type UpdateVisitRequestDto = z.infer<typeof updateVisitRequestDto>;
