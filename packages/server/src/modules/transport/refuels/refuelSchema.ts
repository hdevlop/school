import { numeric, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';
import { drivers } from '../drivers/driverSchema';
import { vehicles } from '../vehicles/vehicleSchema';

export const refuelStatusEnum = pgEnum('refuelStatus', getEnumValues('refuelStatus'));
export const fuelTypeEnum = pgEnum('fuelType', getEnumValues('fuelType'));

export const refuels = pgTable('refuels', {
  id: idField(),
  vehicleId: text('vehicle_id').references(() => vehicles.id).notNull(),
  drivers: text('operator_id').references(() => drivers.id, { onDelete: 'cascade' }).notNull(),
  datetime: timestamp('datetime', { mode: 'string' }).notNull(),
  voucherNumber: text('voucher_number'),
  liters: numeric('liters', { precision: 8, scale: 2 }).notNull(),
  costPerLiter: numeric('cost_per_liter', { precision: 6, scale: 2 }),
  totalCost: numeric('total_cost', { precision: 10, scale: 2 }),
  mileageAtRefuel: numeric('mileage_at_refuel', { precision: 10, scale: 2 }),
  fuelLevelAfter: numeric('fuel_level_after', { precision: 5, scale: 1 }).default('100'),
  attendant: text('attendant'),
  notes: text('notes'),
  ...timestamps,
});
