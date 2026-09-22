import { z } from 'zod';
import { VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from '@sms/contracts';

const optionalId = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1, 'ID cannot be empty').nullish().optional(),
);
const optionalDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .nullable()
  .optional();
const numberField = (schema: z.ZodNumber): any =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? value : Number(trimmed);
  }, schema);

export const vehicleSchema = z.object({
  id: optionalId,
  name: z.string().min(2, 'Vehicle name must be at least 2 characters').max(100, 'Vehicle name too long'),
  brand: z.string().min(2, 'Brand must be at least 2 characters').max(100, 'Brand too long'),
  model: z.string().min(2, 'Model must be at least 2 characters').max(100, 'Model too long'),
  year: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(1900, 'Year must be after 1900').max(new Date().getFullYear() + 1, 'Year cannot be in future')),
  type: z.enum(VEHICLE_TYPE_VALUES).default('fullbus'),
  capacity: numberField(z.number({ error: 'Must be a valid number' }).int('Must be an integer').min(1, 'Capacity must be at least 1').max(200, 'Capacity cannot exceed 200')),
  licensePlate: z.string().min(2, 'License plate must be at least 2 characters').max(50, 'License plate too long'),
  driverId: optionalId.nullable(),
  image: z.string().max(500, 'Image path too long').optional().nullable().default('novehicle.png'),
  purchaseDate: optionalDateField.nullable(),
  purchasePrice: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Purchase price must be non-negative').max(10000000, 'Purchase price too large')).optional().nullable(),
  initialMileage: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Initial mileage must be non-negative').max(10000000, 'Initial mileage too large')).optional().nullable(),
  currentMileage: numberField(z.number({ error: 'Must be a valid number' }).min(0, 'Current mileage must be non-negative').max(10000000, 'Current mileage too large')).optional().nullable(),
  status: z.enum(VEHICLE_STATUS_VALUES).default('active'),
  notes: z.string().max(1000, 'Notes too long').optional().nullable(),
});

export type VehicleFormValues = z.input<typeof vehicleSchema>;
