import { describe, expect, it } from 'bun:test';
import { StudentRouteService } from '../../src/modules/transport/studentRoutes/StudentRouteService';
import { StudentRouteValidator } from '../../src/modules/transport/studentRoutes/StudentRouteValidator';
import { VehicleAssignmentService } from '../../src/modules/transport/vehicleAssignments/VehicleAssignmentService';
import { VehicleAssignmentValidator } from '../../src/modules/transport/vehicleAssignments/VehicleAssignmentValidator';
import { withEnglishMessages } from '../support/englishMessages';

const year = { id: 'year-1', label: '2025-2026', reportingStartsOn: '2025-09-01', reportingEndsOn: '2026-08-31' };

function routeHarness(status = 'active') {
  const calls: string[] = [];
  const validator = Object.assign(withEnglishMessages(new StudentRouteValidator({} as any, {} as any, {} as any)), {
    checkExists: async () => ({ studentId: 'student-1', assignmentDate: '2025-10-01', status }),
  }) as any;
  validator.year = year;
  const service = new StudentRouteService(
    { lockStudent: async () => {}, update: async () => { calls.push('update'); } } as any, validator,
    { endTransportFee: async () => { calls.push('end-fee'); } } as any,
    { getAll: async () => { calls.push('fee-types'); return []; } } as any,
  );
  (service as any).year = year;
  return { service, calls };
}

describe('route unassignment guards', () => {
  it.each([
    { status: 'completed', date: '2025-11-01', errorStatus: 409, message: 'Route is not active' },
    { status: 'active', date: '2026-09-01', errorStatus: 409, message: 'Route unassignment date is outside the selected school year' },
    { status: 'active', date: '2025-10-01', errorStatus: 400, message: 'Route unassignment date must follow its start and cannot be in the future' },
  ])('rejects an invalid end before changing the route or billing: %j', async ({ status, date, errorStatus, message }) => {
    const { service, calls } = routeHarness(status);
    await expect(service.unassign('route-1', date)).rejects.toMatchObject({ status: errorStatus, message });
    expect(calls).toEqual([]);
  });
});

function driverHarness(existing: object) {
  const calls: string[] = [];
  const validator = withEnglishMessages(new VehicleAssignmentValidator({} as any));
  const service = new VehicleAssignmentService(
    {
      lockAssignmentChanges: async () => {},
      getActiveAssignmentByVehicleAcrossYears: async () => { calls.push('read'); return existing; },
      closeActiveAssignmentAcrossYears: async () => { calls.push('close'); },
      create: async () => { calls.push('create'); },
    } as any,
    validator, {} as any,
  );
  (service as any).year = year;
  return { service, calls };
}

describe('driver replacement guards', () => {
  it('rejects a replacement at the old start before closing that assignment', async () => {
    const { service, calls } = driverHarness({ id: 'assignment-1', driverId: 'old-driver', assignmentDate: '2025-10-01' });
    await expect(service.assignDriver('vehicle-1', 'new-driver', '2025-10-01'))
      .rejects.toMatchObject({ status: 400, message: 'Driver reassignment date must follow the old start' });
    expect(calls).toEqual(['read']);
  });

  it('preserves an idempotent assignment without closing or duplicating it', async () => {
    const assignment = { id: 'assignment-1', driverId: 'driver-1', assignmentDate: '2025-10-01' };
    const { service, calls } = driverHarness(assignment);
    const result = await service.assignDriver('vehicle-1', 'driver-1', '2025-11-01');
    expect(result === assignment).toBe(true);
    expect(calls).toEqual(['read']);
  });
});
