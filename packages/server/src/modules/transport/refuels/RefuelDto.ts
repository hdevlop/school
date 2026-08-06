import { z } from 'zod';

export const refuelBaseSchema = z.object({
  id: z.string().optional(),
  vehicleId: z.string().min(1),
  drivers: z.string().optional().nullable(),
  datetime: z.string().min(1),
  liters: z.coerce.string(),
  costPerLiter: z.coerce.string().optional().nullable(),
  totalCost: z.coerce.string().optional().nullable(),
  fuelLevelAfter: z.coerce.string().optional().nullable(),
  voucherNumber: z.string().optional().nullable(),
  mileageAtRefuel: z.coerce.string().optional().nullable(),
  attendant: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createRefuelDto = refuelBaseSchema.omit({ id: true });
export const createRefuelsBulkDto = z.array(createRefuelDto);
export const updateRefuelDto = createRefuelDto.partial();

export const refuelIdParam = z.object({ id: z.string().min(1) });
export const vehicleIdParam = z.object({ vehicleId: z.string().min(1) });
export const driverIdParam = z.object({ driverId: z.string().min(1) });
export const voucherNumberParam = z.object({ voucherNumber: z.string().min(1) });
export const dateParam = z.object({ date: z.string().min(1) });

export type CreateRefuelDto = z.infer<typeof createRefuelDto>;
export type UpdateRefuelDto = z.infer<typeof updateRefuelDto>;
