import { describe, expect, it } from 'bun:test';
import {
  createRefuelDto,
  createRefuelsBulkDto,
  updateRefuelDto,
  refuelIdParam,
  vehicleIdParam,
  driverIdParam,
  voucherNumberParam,
  dateParam,
} from '@server/modules/transport/refuels/RefuelDto';

const validRefuel = {
  vehicleId: 'vhl_01',
  datetime: '2024-09-01T10:00:00',
  liters: '50',
};

describe('createRefuelDto', () => {
  it('parses a valid minimal refuel', () => {
    const result = createRefuelDto.safeParse(validRefuel);
    expect(result.success).toBe(true);
  });

  it('parses a refuel with all optional fields', () => {
    const data = {
      ...validRefuel,
      drivers: 'drv_01',
      costPerLiter: '12.50',
      totalCost: '625.00',
      fuelLevelAfter: '80',
      voucherNumber: 'VCH-001',
      mileageAtRefuel: '50000',
      attendant: 'Station Worker',
      notes: 'Regular refuel',
    };
    const result = createRefuelDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing vehicleId', () => {
    const { vehicleId, ...data } = validRefuel;
    expect(createRefuelDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty vehicleId', () => {
    const data = { ...validRefuel, vehicleId: '' };
    expect(createRefuelDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing datetime', () => {
    const { datetime, ...data } = validRefuel;
    expect(createRefuelDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty datetime', () => {
    const data = { ...validRefuel, datetime: '' };
    expect(createRefuelDto.safeParse(data).success).toBe(false);
  });

  it('accepts null optional fields', () => {
    const data = {
      ...validRefuel,
      drivers: null,
      costPerLiter: null,
      totalCost: null,
      fuelLevelAfter: null,
      voucherNumber: null,
      mileageAtRefuel: null,
      attendant: null,
      notes: null,
    };
    expect(createRefuelDto.safeParse(data).success).toBe(true);
  });

  it('strips id field from input', () => {
    const data = { ...validRefuel, id: 'rfl_01' };
    const result = createRefuelDto.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).id).toBeUndefined();
    }
  });
});

describe('updateRefuelDto', () => {
  it('parses an empty object', () => {
    expect(updateRefuelDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only liters', () => {
    expect(updateRefuelDto.safeParse({ liters: '60' }).success).toBe(true);
  });
});

describe('refuelIdParam', () => {
  it('accepts non-empty id', () => {
    expect(refuelIdParam.safeParse({ id: 'rfl_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(refuelIdParam.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('vehicleIdParam', () => {
  it('accepts non-empty vehicleId', () => {
    expect(vehicleIdParam.safeParse({ vehicleId: 'vhl_01' }).success).toBe(true);
  });

  it('rejects empty vehicleId', () => {
    expect(vehicleIdParam.safeParse({ vehicleId: '' }).success).toBe(false);
  });
});

describe('driverIdParam', () => {
  it('accepts non-empty driverId', () => {
    expect(driverIdParam.safeParse({ driverId: 'drv_01' }).success).toBe(true);
  });

  it('rejects empty driverId', () => {
    expect(driverIdParam.safeParse({ driverId: '' }).success).toBe(false);
  });
});

describe('voucherNumberParam', () => {
  it('accepts non-empty voucherNumber', () => {
    expect(voucherNumberParam.safeParse({ voucherNumber: 'VCH-001' }).success).toBe(true);
  });

  it('rejects empty voucherNumber', () => {
    expect(voucherNumberParam.safeParse({ voucherNumber: '' }).success).toBe(false);
  });
});

describe('dateParam', () => {
  it('accepts non-empty date', () => {
    expect(dateParam.safeParse({ date: '2024-09-01' }).success).toBe(true);
  });

  it('rejects empty date', () => {
    expect(dateParam.safeParse({ date: '' }).success).toBe(false);
  });
});

describe('createRefuelsBulkDto', () => {
  it('accepts array of valid refuels', () => {
    expect(createRefuelsBulkDto.safeParse([validRefuel]).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(createRefuelsBulkDto.safeParse([]).success).toBe(true);
  });

  it('rejects array with one invalid refuel', () => {
    expect(createRefuelsBulkDto.safeParse([validRefuel, { liters: '50' }]).success).toBe(false);
  });
});
