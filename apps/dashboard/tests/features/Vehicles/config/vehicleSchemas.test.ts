import { describe, expect, it } from 'bun:test';

import { vehicleSchema } from '@/features/Vehicles/config/vehicleSchemas';

const vehicle = {
  name: 'Bus 3',
  brand: 'Iveco',
  model: 'Daily',
  year: '2024',
  capacity: '12',
  licensePlate: '12345-A-6',
  purchaseDate: '',
};

describe('vehicle schema', () => {
  it('saves a vehicle whose optional purchase date was left empty', () => {
    const result = vehicleSchema.safeParse(vehicle);
    expect(result.success).toBe(true);
    expect(result.data?.purchaseDate).toBeNull();
  });

  it('still rejects a malformed purchase date', () => {
    expect(vehicleSchema.safeParse({ ...vehicle, purchaseDate: '16/10/2026' }).success).toBe(false);
  });
});
