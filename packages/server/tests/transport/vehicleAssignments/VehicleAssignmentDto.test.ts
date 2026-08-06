import { describe, expect, it } from 'bun:test';
import {
  createVehicleAssignmentDto,
  updateVehicleAssignmentDto,
  unassignVehicleAssignmentDto,
  assignDriverDto,
  assignmentIdParam,
  vehicleIdParam,
  driverIdParam,
} from '@server/modules/transport/vehicleAssignments/VehicleAssignmentDto';

const validAssignment = {
  vehicleId: 'vhl_01',
  driverId: 'drv_01',
  assignmentDate: '2024-09-01',
};

describe('createVehicleAssignmentDto', () => {
  it('parses a valid minimal assignment', () => {
    const result = createVehicleAssignmentDto.safeParse(validAssignment);
    expect(result.success).toBe(true);
  });

  it('parses with all optional fields', () => {
    const data = {
      ...validAssignment,
      unassignmentDate: '2024-12-31',
      status: 'active',
      notes: 'Assignment notes',
      assignedBy: 'admin',
    };
    const result = createVehicleAssignmentDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts valid statuses', () => {
    for (const status of ['active', 'completed', 'cancelled']) {
      const data = { ...validAssignment, status };
      expect(createVehicleAssignmentDto.safeParse(data).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const data = { ...validAssignment, status: 'unknown' };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects invalid assignmentDate format', () => {
    const data = { ...validAssignment, assignmentDate: '09/01/2024' };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects invalid unassignmentDate format', () => {
    const data = { ...validAssignment, unassignmentDate: '12-31-2024' };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('accepts null unassignmentDate', () => {
    const data = { ...validAssignment, unassignmentDate: null };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(true);
  });

  it('rejects missing vehicleId', () => {
    const { vehicleId, ...data } = validAssignment;
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing driverId', () => {
    const { driverId, ...data } = validAssignment;
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing assignmentDate', () => {
    const { assignmentDate, ...data } = validAssignment;
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty vehicleId', () => {
    const data = { ...validAssignment, vehicleId: '' };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty driverId', () => {
    const data = { ...validAssignment, driverId: '' };
    expect(createVehicleAssignmentDto.safeParse(data).success).toBe(false);
  });
});

describe('updateVehicleAssignmentDto', () => {
  it('parses an empty object', () => {
    expect(updateVehicleAssignmentDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data', () => {
    expect(updateVehicleAssignmentDto.safeParse({ notes: 'Updated' }).success).toBe(true);
  });
});

describe('unassignVehicleAssignmentDto', () => {
  it('parses with unassignmentDate', () => {
    expect(unassignVehicleAssignmentDto.safeParse({ unassignmentDate: '2024-12-31' }).success).toBe(true);
  });

  it('parses with null unassignmentDate', () => {
    expect(unassignVehicleAssignmentDto.safeParse({ unassignmentDate: null }).success).toBe(true);
  });

  it('parses empty object', () => {
    expect(unassignVehicleAssignmentDto.safeParse({}).success).toBe(true);
  });
});

describe('assignDriverDto', () => {
  it('accepts valid data', () => {
    expect(assignDriverDto.safeParse({ vehicleId: 'vhl_01', driverId: 'drv_01' }).success).toBe(true);
  });

  it('accepts with assignmentDate', () => {
    expect(assignDriverDto.safeParse({ vehicleId: 'vhl_01', driverId: 'drv_01', assignmentDate: '2024-09-01' }).success).toBe(true);
  });

  it('rejects empty vehicleId', () => {
    expect(assignDriverDto.safeParse({ vehicleId: '', driverId: 'drv_01' }).success).toBe(false);
  });

  it('rejects empty driverId', () => {
    expect(assignDriverDto.safeParse({ vehicleId: 'vhl_01', driverId: '' }).success).toBe(false);
  });
});

describe('assignmentIdParam', () => {
  it('accepts non-empty id', () => {
    expect(assignmentIdParam.safeParse({ id: 'asg_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(assignmentIdParam.safeParse({ id: '' }).success).toBe(false);
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
