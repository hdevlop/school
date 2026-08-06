import { z } from 'zod';
import { getBusinessDate } from '@server/shared/businessDate';
import { num, optionalDateField, optionalId } from '@server/shared/fields';
import { vehicleStatusEnum, vehicleTypeEnum } from '@server/shared/enums';

const vehicleSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Vehicle name must be at least 2 characters').max(100, 'Vehicle name too long'),
  brand: z.string().min(2, 'Brand must be at least 2 characters').max(100, 'Brand too long'),
  model: z.string().min(2, 'Model must be at least 2 characters').max(100, 'Model too long'),
  year: num().int().min(1900, 'Year must be after 1900').max(getBusinessDate().getFullYear() + 1, 'Year cannot be in future'),
  type: vehicleTypeEnum.default('fullbus'),
  capacity: num().int().min(1, 'Capacity must be at least 1').max(200, 'Capacity cannot exceed 200'),
  licensePlate: z.string().min(2, 'License plate must be at least 2 characters').max(50, 'License plate too long'),
  driverId: optionalId.nullable(),
  drivers: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  fuelType: z.string().optional().nullable(),
  image: z.string().max(500, 'Image path too long').optional().nullable().default('novehicle.png'),
  purchaseDate: optionalDateField.nullable(),
  purchasePrice: num().min(0, 'Purchase price must be non-negative').max(10000000, 'Purchase price too large').optional().nullable(),
  initialMileage: num().min(0, 'Initial mileage must be non-negative').max(10000000, 'Initial mileage too large').optional().nullable(),
  currentMileage: num().min(0, 'Current mileage must be non-negative').max(10000000, 'Current mileage too large').optional().nullable(),
  status: vehicleStatusEnum.default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
  assignmentDate: z.string().optional().nullable(),
  assignedBy: z.string().optional().nullable(),
});

export const createVehicleDto = vehicleSchema;
export const createVehiclesBulkDto = z.array(createVehicleDto);
export const updateVehicleDto = createVehicleDto.partial();

export const vehicleIdParam = z.object({ id: z.string().min(1) });

export type CreateVehicleDto = z.infer<typeof createVehicleDto>;
export type UpdateVehicleDto = z.infer<typeof updateVehicleDto>;
export type CreateVehiclesBulkDto = z.infer<typeof createVehiclesBulkDto>;
