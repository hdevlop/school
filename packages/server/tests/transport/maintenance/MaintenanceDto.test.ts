import { describe, expect, it } from 'bun:test';
import {
  createMaintenanceDto,
  updateMaintenanceDto,
  updateMaintenanceStatusDto,
  maintenanceIdParam,
  vehicleIdParam,
  statusParam,
  typeParam,
  upcomingMaintenanceQueryDto,
} from '@server/modules/transport/maintenance/MaintenanceDto';

const validMaintenance = {
  vehicleId: 'vhl_01',
  type: 'oilChange',
  title: 'Oil Change',
};

describe('createMaintenanceDto', () => {
  it('parses a valid minimal maintenance', () => {
    const result = createMaintenanceDto.safeParse(validMaintenance);
    expect(result.success).toBe(true);
  });

  it('parses a maintenance with all optional fields', () => {
    const data = {
      ...validMaintenance,
      status: 'scheduled',
      dueHours: '5000',
      cost: '500',
      scheduledDate: '2025-06-01',
      priority: 'high',
      partsUsed: 'Oil filter, Engine oil',
      assignedTo: 'mech_01',
      notes: 'Regular oil change',
    };
    const result = createMaintenanceDto.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts dueHours as number', () => {
    const data = { ...validMaintenance, dueHours: 5000 };
    expect(createMaintenanceDto.safeParse(data).success).toBe(true);
  });

  it('accepts dueHours as string', () => {
    const data = { ...validMaintenance, dueHours: '5000' };
    expect(createMaintenanceDto.safeParse(data).success).toBe(true);
  });

  it('accepts cost as number', () => {
    const data = { ...validMaintenance, cost: 500 };
    expect(createMaintenanceDto.safeParse(data).success).toBe(true);
  });

  it('accepts cost as string', () => {
    const data = { ...validMaintenance, cost: '500' };
    expect(createMaintenanceDto.safeParse(data).success).toBe(true);
  });

  it('accepts null optional fields', () => {
    const data = {
      ...validMaintenance,
      dueHours: null,
      cost: null,
      scheduledDate: null,
      priority: null,
      partsUsed: null,
      assignedTo: null,
      notes: null,
    };
    expect(createMaintenanceDto.safeParse(data).success).toBe(true);
  });

  it('rejects missing vehicleId', () => {
    const { vehicleId, ...data } = validMaintenance;
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty vehicleId', () => {
    const data = { ...validMaintenance, vehicleId: '' };
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing type', () => {
    const { type, ...data } = validMaintenance;
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty type', () => {
    const data = { ...validMaintenance, type: '' };
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title, ...data } = validMaintenance;
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });

  it('rejects empty title', () => {
    const data = { ...validMaintenance, title: '' };
    expect(createMaintenanceDto.safeParse(data).success).toBe(false);
  });
});

describe('updateMaintenanceDto', () => {
  it('parses an empty object', () => {
    expect(updateMaintenanceDto.safeParse({}).success).toBe(true);
  });

  it('parses partial data with only title', () => {
    expect(updateMaintenanceDto.safeParse({ title: 'Updated' }).success).toBe(true);
  });

  it('parses partial data with type', () => {
    expect(updateMaintenanceDto.safeParse({ type: 'repair' }).success).toBe(true);
  });
});

describe('updateMaintenanceStatusDto', () => {
  it('accepts non-empty status', () => {
    expect(updateMaintenanceStatusDto.safeParse({ status: 'inProgress' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(updateMaintenanceStatusDto.safeParse({ status: '' }).success).toBe(false);
  });
});

describe('maintenanceIdParam', () => {
  it('accepts non-empty id', () => {
    expect(maintenanceIdParam.safeParse({ id: 'mnt_01' }).success).toBe(true);
  });

  it('rejects empty id', () => {
    expect(maintenanceIdParam.safeParse({ id: '' }).success).toBe(false);
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

describe('statusParam', () => {
  it('accepts non-empty status', () => {
    expect(statusParam.safeParse({ status: 'scheduled' }).success).toBe(true);
  });

  it('rejects empty status', () => {
    expect(statusParam.safeParse({ status: '' }).success).toBe(false);
  });
});

describe('typeParam', () => {
  it('accepts non-empty type', () => {
    expect(typeParam.safeParse({ type: 'oilChange' }).success).toBe(true);
  });

  it('rejects empty type', () => {
    expect(typeParam.safeParse({ type: '' }).success).toBe(false);
  });
});

describe('upcomingMaintenanceQueryDto', () => {
  it('parses empty object with default', () => {
    expect(upcomingMaintenanceQueryDto.safeParse({}).success).toBe(true);
  });

  it('parses valid withinHours', () => {
    expect(upcomingMaintenanceQueryDto.safeParse({ withinHours: 100 }).success).toBe(true);
  });

  it('coerces string withinHours to number', () => {
    expect(upcomingMaintenanceQueryDto.safeParse({ withinHours: '50' }).success).toBe(true);
  });

  it('rejects zero withinHours', () => {
    expect(upcomingMaintenanceQueryDto.safeParse({ withinHours: 0 }).success).toBe(false);
  });

  it('rejects negative withinHours', () => {
    expect(upcomingMaintenanceQueryDto.safeParse({ withinHours: -1 }).success).toBe(false);
  });
});
