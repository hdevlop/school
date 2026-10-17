import { describe, expect, it } from 'bun:test';
import { schoolI18n } from '@sms/contracts/locales';

import { createTransportSchemas } from '@/features/Transport/config/transportSchemas';

// The English catalog, so a message a test reads proves its key exists.
const english = (key: string, params?: Record<string, unknown>) => schoolI18n.translate('en', key as never, params as never);
const standaloneTransportAssignmentSchema = createTransportSchemas(english).standaloneAssignment;
const transportSchema = createTransportSchemas(english).transport;

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
