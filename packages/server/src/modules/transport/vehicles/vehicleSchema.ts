import { sql } from 'drizzle-orm';
import { date, integer, numeric, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';

import { idField, timestamps } from '@server/database/shared';
import { getEnumValues } from '@server/shared/enums';

export const vehicleStatusEnum = pgEnum('vehicleStatus', getEnumValues('vehicleStatus'));
export const vehicleTypeEnum = pgEnum('vehicleType', getEnumValues('vehicleType'));
export const vehicleDocumentTypeEnum = pgEnum('vehicleDocumentType', getEnumValues('vehicleDocumentType'));
export const busStatusEnum = pgEnum('busStatus', getEnumValues('busStatus'));

export const vehicles = pgTable('vehicles', {
  id: idField(),
  name: text('name').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  type: vehicleTypeEnum('type').notNull().default('fullbus'),
  capacity: integer('capacity').notNull(),
  licensePlate: text('license_plate').notNull().unique(),
  purchaseDate: date('purchase_date').default(sql`CURRENT_DATE`),
  purchasePrice: numeric('purchase_price', { precision: 12, scale: 2 }).default('0'),
  initialMileage: numeric('initial_mileage', { precision: 10, scale: 2 }).default('0'),
  currentMileage: numeric('current_mileage', { precision: 10, scale: 2 }).default('0'),
  status: vehicleStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  ...timestamps,
});
