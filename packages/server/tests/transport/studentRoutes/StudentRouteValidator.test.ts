import { describe, expect, it, mock } from 'bun:test';
import { StudentRouteValidator } from '@server/modules/transport/studentRoutes/StudentRouteValidator';

function createValidator(overrides: Record<string, unknown> = {}) {
  const routeRepository = {
    getById: mock(() => Promise.resolve(null)),
    getActiveByStudentId: mock(() => Promise.resolve(null)),
    lockVehicle: mock(() => Promise.resolve({ id: 'vhl_01', name: 'Bus 01', status: 'active', capacity: 30 })),
    getActiveCountByVehicleId: mock(() => Promise.resolve(12)),
    ...overrides,
  };
  const studentRepository = {
    getById: mock(() => Promise.resolve({ id: 'stu_01', status: 'active' })),
  };
  return {
    validator: new StudentRouteValidator(routeRepository as any, studentRepository as any),
    routeRepository,
    studentRepository,
  };
}

describe('StudentRouteValidator', () => {
  it('validates an active student against locked vehicle capacity', async () => {
    const { validator, routeRepository } = createValidator();
    const result = await validator.validateAssignment('stu_01', 'vhl_01');
    expect(routeRepository.lockVehicle).toHaveBeenCalledWith('vhl_01');
    expect(result.occupancy).toBe(12);
  });

  it('rejects a duplicate active student assignment', async () => {
    const { validator } = createValidator({
      getActiveByStudentId: mock(() => Promise.resolve({ id: 'route_existing', vehicle: { name: 'Bus 02' } })),
    });
    await expect(validator.validateAssignment('stu_01', 'vhl_01')).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a full vehicle', async () => {
    const { validator } = createValidator({
      getActiveCountByVehicleId: mock(() => Promise.resolve(30)),
    });
    await expect(validator.validateAssignment('stu_01', 'vhl_01')).rejects.toMatchObject({ status: 409 });
  });

  it('allows the current assignment to remain on a full vehicle', async () => {
    const { validator } = createValidator({
      getById: mock(() => Promise.resolve({ id: 'route_01', vehicleId: 'vhl_01', status: 'active' })),
      getActiveByStudentId: mock(() => Promise.resolve({ id: 'route_01' })),
      getActiveCountByVehicleId: mock(() => Promise.resolve(30)),
    });
    await expect(validator.validateAssignment('stu_01', 'vhl_01', 'route_01')).resolves.toBeDefined();
  });

  it('requires latitude and longitude together', async () => {
    const { validator } = createValidator();
    await expect(validator.validate({ pickupLatitude: 33.5 })).rejects.toMatchObject({ status: 400 });
    await expect(validator.validate({ pickupLongitude: -7.6 })).rejects.toMatchObject({ status: 400 });
  });
});
