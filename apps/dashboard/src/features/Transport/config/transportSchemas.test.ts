import { describe, expect, it } from 'bun:test';

import {
  standaloneTransportAssignmentSchema,
  transportSchema,
} from './transportSchemas';

const somewhere = { address: '12 Rue des Écoles', latitude: 33.57, longitude: -7.59 };
const nowhere = { address: '', latitude: null, longitude: null };

describe('transportSchema', () => {
  it('checks nothing while the toggle is off', () => {
    expect(transportSchema.safeParse({ transportEnabled: false }).success).toBe(true);
    expect(
      transportSchema.safeParse({
        transportEnabled: false,
        transportAssignment: { vehicleId: '', pickup: nowhere, dropoff: nowhere },
      }).success,
    ).toBe(true);
  });

  it('defaults the toggle to off', () => {
    expect(transportSchema.parse({}).transportEnabled).toBe(false);
  });

  it('needs a vehicle and a pickup point once the toggle is on', () => {
    const result = transportSchema.safeParse({
      transportEnabled: true,
      transportAssignment: { vehicleId: '', pickup: nowhere, dropoff: nowhere },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual([
      'transportAssignment.vehicleId',
      'transportAssignment.pickup.address',
    ]);
  });

  it('reports against the nested paths the inputs are bound to', () => {
    const result = transportSchema.safeParse({
      transportEnabled: true,
      transportAssignment: { vehicleId: 'v1', pickup: nowhere, dropoff: somewhere },
    });

    expect(result.error?.issues[0]?.path).toEqual([
      'transportAssignment',
      'pickup',
      'address',
    ]);
    expect(result.error?.issues[0]?.message).toBe('Pickup location is required');
  });

  it('accepts a complete assignment', () => {
    expect(
      transportSchema.safeParse({
        transportEnabled: true,
        transportAssignment: { vehicleId: 'v1', pickup: somewhere, dropoff: somewhere },
      }).success,
    ).toBe(true);
  });
});

describe('standaloneTransportAssignmentSchema', () => {
  it('requires a vehicle and a pickup point outright', () => {
    const result = standaloneTransportAssignmentSchema.safeParse({
      vehicleId: '',
      pickup: nowhere,
      dropoff: nowhere,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.')).sort()).toEqual([
      'pickup.address',
      'vehicleId',
    ]);
  });

  it('leaves the drop-off optional, because many routes only book a pickup', () => {
    expect(
      standaloneTransportAssignmentSchema.safeParse({
        vehicleId: 'v1',
        pickup: somewhere,
        dropoff: nowhere,
      }).success,
    ).toBe(true);
  });
});
