import { describe, expect, it, mock } from 'bun:test';

mock.module('najm-event', () => ({
  Events: () => () => undefined,
  EventService: class {},
  On: () => () => undefined,
  events: () => ({ services: () => ({ build: () => ({}) }) }),
  getEventListeners: () => [],
  EVENTS_META: Symbol('events'),
  EVENT_CONFIG: Symbol('event_config'),
  EVENT_SERVICE: Symbol('event_service'),
}));

const { StaffService } = await import('@server/modules/staff/StaffService');

function createMockDeps() {
  return {
    staffRepository: {
      update: mock((_id, data) => Promise.resolve({ id: 'stf_01', role: data.role ?? 'cleaner', ...data })),
      delete: mock((id) => Promise.resolve({ id })),
      getLinkedTeacher: mock(() => Promise.resolve(null)),
      getLinkedDriver: mock(() => Promise.resolve(null)),
    },
    staffValidator: {
      ensureExists: mock(() => Promise.resolve({
        id: 'stf_01',
        role: 'cleaner',
        userId: 'usr_01',
      })),
      ensureEmployeeCodeUnique: mock(() => Promise.resolve()),
      ensureCinUnique: mock(() => Promise.resolve()),
      ensureEmailUnique: mock(() => Promise.resolve()),
      ensureRoleExists: mock(() => Promise.resolve({ code: 'security', accessRoleId: null })),
    },
    userService: {
      delete: mock(() => Promise.resolve({ id: 'usr_01' })),
      update: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    authService: {
      provisionUser: mock(() => Promise.resolve({ id: 'usr_01' })),
    },
    storage: {
      processFile: mock(() => Promise.resolve('/images/staff_male.png')),
      delete: mock(() => Promise.resolve()),
    },
    driverRepository: {
      getByStaffId: mock(() => Promise.resolve(null)),
      delete: mock(() => Promise.resolve({ id: 'drv_01' })),
      create: mock(() => Promise.resolve({ id: 'drv_01' })),
      update: mock(() => Promise.resolve({ id: 'drv_01' })),
    },
    staffAssignmentRepository: {
      createForRole: mock(() => Promise.resolve([])),
      replaceForRole: mock(() => Promise.resolve([])),
      deleteForRole: mock(() => Promise.resolve([])),
      deleteAllForStaff: mock(() => Promise.resolve()),
    },
    vehicleAssignmentRepository: {
      create: mock(() => Promise.resolve({ id: 'vas_01' })),
      deleteByDriverId: mock(() => Promise.resolve([])),
    },
  };
}

function createService(deps = createMockDeps()) {
  const service = new StaffService(
    deps.staffRepository as any,
    deps.staffValidator as any,
    deps.userService as any,
    deps.authService as any,
    deps.storage as any,
    deps.driverRepository as any,
    deps.staffAssignmentRepository as any,
    deps.vehicleAssignmentRepository as any,
  );
  return { service, deps };
}

describe('StaffService Phase B cleanup', () => {
  it('clears old role assignments when role changes', async () => {
    const { service, deps } = createService();

    await service.update('stf_01', { role: 'security', assignments: [{ zoneId: 'zone_01' }] });

    expect(deps.staffAssignmentRepository.deleteForRole).toHaveBeenCalledWith('cleaner', 'stf_01');
    expect(deps.staffAssignmentRepository.replaceForRole).toHaveBeenCalledWith('security', 'stf_01', [{ zoneId: 'zone_01' }]);
  });

  it('removes driver profile and vehicle links when leaving driver role', async () => {
    const { service, deps } = createService();
    deps.staffValidator.ensureExists.mockImplementation(() => Promise.resolve({
      id: 'stf_01',
      role: 'driver',
      userId: 'usr_01',
    }));
    deps.driverRepository.getByStaffId.mockImplementation(() => Promise.resolve({ id: 'drv_01', staffId: 'stf_01' }));

    await service.update('stf_01', { role: 'cleaner', assignments: [{ zoneId: 'zone_01' }] });

    expect(deps.vehicleAssignmentRepository.deleteByDriverId).toHaveBeenCalledWith('drv_01');
    expect(deps.driverRepository.delete).toHaveBeenCalledWith('drv_01');
  });

  it('deletes assignments, staff user, and staff avatar on staff delete', async () => {
    const { service, deps } = createService();

    await service.delete('stf_01');

    expect(deps.staffRepository.getLinkedTeacher).toHaveBeenCalledWith('stf_01');
    expect(deps.staffRepository.getLinkedDriver).toHaveBeenCalledWith('stf_01');
    expect(deps.staffAssignmentRepository.deleteAllForStaff).toHaveBeenCalledWith('stf_01');
    expect(deps.staffRepository.delete).toHaveBeenCalledWith('stf_01');
    expect(deps.userService.delete).toHaveBeenCalledWith('usr_01');
    expect(deps.storage.delete).toHaveBeenCalledWith('staff', 'stf_01_avatar.png');
  });

  it('blocks direct deletion while a teacher profile is still linked', async () => {
    const { service, deps } = createService();
    deps.staffRepository.getLinkedTeacher.mockImplementation(() => Promise.resolve({ id: 'tch_01' }));

    await expect(service.delete('stf_01')).rejects.toMatchObject({ status: 409 });
    expect(deps.staffRepository.delete).not.toHaveBeenCalled();
  });

  it('persists and synchronizes a changed staff email', async () => {
    const { service, deps } = createService();

    await service.update('stf_01', { email: 'staff@example.com' });

    expect(deps.staffValidator.ensureEmailUnique).toHaveBeenCalledWith('staff@example.com', 'stf_01');
    expect(deps.userService.update).toHaveBeenCalledWith('usr_01', { email: 'staff@example.com' });
    expect(deps.staffRepository.update).toHaveBeenCalledWith('stf_01', { email: 'staff@example.com' });
  });
});
