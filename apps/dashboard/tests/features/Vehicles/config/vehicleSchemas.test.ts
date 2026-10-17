import { describe, expect, it } from 'bun:test';

import { createEndDriverAssignmentSchema, vehicleSchema } from '@/features/Vehicles/config/vehicleSchemas';

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

describe('createEndDriverAssignmentSchema', () => {
  const schema = createEndDriverAssignmentSchema((key) => key, '2026-06-15');

  it('accepts an end date after the start', () => {
    expect(schema.safeParse({ unassignmentDate: '2026-06-20' }).success).toBe(true);
  });

  // The server refuses an end on or before the start; say so before sending.
  it('refuses an end on or before the start, naming the catalog key', () => {
    for (const unassignmentDate of ['2026-06-15', '2026-06-01']) {
      const result = schema.safeParse({ unassignmentDate });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('vehicles.validation.endAfterStart');
    }
  });
});
