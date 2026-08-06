import { z } from 'zod';
import { maintenanceStatusEnum, maintenanceTypeEnum } from '@server/shared/enums';

export const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  type: maintenanceTypeEnum,
  title: z.string().min(1),
  status: maintenanceStatusEnum.optional(),
  dueHours: z.union([z.string(), z.number()]).optional().nullable(),
  cost: z.union([z.string(), z.number()]).optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  partsUsed: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createMaintenanceDto = maintenanceSchema;
export const updateMaintenanceDto = maintenanceSchema.partial();

export const updateMaintenanceStatusDto = z.object({
  status: maintenanceStatusEnum,
});

export const maintenanceIdParam = z.object({ id: z.string().min(1) });
export const vehicleIdParam = z.object({ vehicleId: z.string().min(1) });
export const statusParam = z.object({ status: z.string().min(1) });
export const typeParam = z.object({ type: z.string().min(1) });
export const upcomingMaintenanceQueryDto = z.object({
  withinHours: z.coerce.number().int().positive().max(24 * 365).optional(),
});

export type CreateMaintenanceDto = z.infer<typeof createMaintenanceDto>;
export type UpdateMaintenanceDto = z.infer<typeof updateMaintenanceDto>;
export type UpcomingMaintenanceQueryDto = z.infer<typeof upcomingMaintenanceQueryDto>;
export type UpdateMaintenanceStatusDto = z.infer<typeof updateMaintenanceStatusDto>;
