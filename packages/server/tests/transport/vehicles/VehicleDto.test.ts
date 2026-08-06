import { describe, expect, it } from 'bun:test';
import {
  createVehicleDto,
  createVehiclesBulkDto,
  updateVehicleDto,
  vehicleIdParam,
} from '@server/modules/transport/vehicles/VehicleDto';

const validVehicle = {
  name: 'School Bus 1',
  brand: 'Mercedes',
  model: 'Sprinter',
  year: 2024,
  capacity: 50,
  licensePlate: 'MA-1234-A',
};

describe('createVehicleDto', () => {
  it('parses a valid minimal vehicle', () => {
    const result = createVehicleDto.safeParse(validVehicle);
    expect(result.success).toBe(true);
  });

  it('parses a vehicle with all optional fields', () => {
    const data = {
      ...validVehicle,
      id: 'vhl_01',
      type: 'fullbus',
      fuelType: 'diesel',
      driverId: 'drv_01',
      purchaseDate: '2024-01-15',
      purchasePrice: 500000,
      initialMileage: 0,
      currentMileage: 10000,
      status: 'active',
      notes: 'New school bus',
      assignmentDate: '2024-09-01',
      assignedBy: 'admin',
    };
    const result = createVehicleDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('defaults type to fullbus when omitted', () => {
    const result = createVehicleDto.safeParse(validVehicle);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('fullbus');
    }
  });

  it('defaults status to active when omitted', () => {
    const result = createVehicleDto.safeParse(validVehicle);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('rejects name shorter than 2 characters', () => {
    const data = { ...validVehicle, name: 'A' };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects name longer than 100 characters', () => {
    const data = { ...validVehicle, name: 'A'.repeat(101) };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects brand shorter than 2 characters', () => {
    const data = { ...validVehicle, brand: 'A' };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects model shorter than 2 characters', () => {
    const data = { ...validVehicle, model: 'A' };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects year before 1900', () => {
    const data = { ...validVehicle, year: 1899 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects year too far in future', () => {
    const data = { ...validVehicle, year: new Date().getFullYear() + 5 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects capacity less than 1', () => {
    const data = { ...validVehicle, capacity: 0 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects capacity exceeding 200', () => {
    const data = { ...validVehicle, capacity: 201 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects licensePlate shorter than 2 characters', () => {
    const data = { ...validVehicle, licensePlate: 'A' };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects licensePlate longer than 50 characters', () => {
    const data = { ...validVehicle, licensePlate: 'A'.repeat(51) };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative purchasePrice', () => {
    const data = { ...validVehicle, purchasePrice: -100 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects purchasePrice exceeding 10000000', () => {
    const data = { ...validVehicle, purchasePrice: 10000001 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative initialMileage', () => {
    const data = { ...validVehicle, initialMileage: -1 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects negative currentMileage', () => {
    const data = { ...validVehicle, currentMileage: -1 };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects notes longer than 1000 characters', () => {
    const data = { ...validVehicle, notes: 'A'.repeat(1001) };
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('accepts null driverId', () => {
    const data = { ...validVehicle, driverId: null };
    expect(createVehicleDto.safeParse(data).success).toBe(true);
  });

  it('accepts drivers as string or array', () => {
    expect(createVehicleDto.safeParse({ ...validVehicle, drivers: 'drv_01' }).success).toBe(true);
    expect(createVehicleDto.safeParse({ ...validVehicle, drivers: ['drv_01', 'drv_02'] }).success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing brand', () => {
    const { brand, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing model', () => {
    const { model, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing year', () => {
    const { year, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing capacity', () => {
    const { capacity, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing licensePlate', () => {
    const { licensePlate, ...data } = validVehicle;
    expect(createVehicleDto.safeParse(data).success).toBe(false);
  });
});

describe('updateVehicleDto', () => {
  it('parses an empty object', () => {
    expect(updateVehicleDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only name', () => {
    expect(updateVehicleDto.safeParse({ name: 'Updated Bus' }).success).toBe(true);
  });
});

describe('vehicleIdParam', () => {
  it('accepts non-empty id', () => {
    expect(vehicleIdParam.safeParse({ id: 'vhl_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(vehicleIdParam.safeParse({ id: '' }).success).toBe(false);
  });
});

describe('createVehiclesBulkDto', () => {
  it('accepts array of valid vehicles', () => {
    expect(createVehiclesBulkDto.safeParse([validVehicle]).success).toBe(true);
  });

  it('accepts empty array', () => {
    expect(createVehiclesBulkDto.safeParse([]).success).toBe(true);
  });

  it('rejects array with one invalid vehicle', () => {
    expect(createVehiclesBulkDto.safeParse([validVehicle, { ...validVehicle, name: 'A' }]).success).toBe(false);
  });
});
