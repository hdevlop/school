import 'reflect-metadata';
import { afterEach, describe, expect, it } from 'bun:test';
import { updateStaffDto } from '../../src/modules/staff/StaffDto';
import { StaffService } from '../../src/modules/staff/StaffService';
import { StaffValidator } from '../../src/modules/staff/StaffValidator';
import { isCurrentAssignment } from '../../src/modules/staff/StaffAssignmentRepository';
import { withEnglishMessages } from '../support/englishMessages';

const originalBusinessDate = process.env.APP_BUSINESS_DATE;
afterEach(() => {
  if (originalBusinessDate === undefined) delete process.env.APP_BUSINESS_DATE;
  else process.env.APP_BUSINESS_DATE = originalBusinessDate;
});

type Calls = string[];

function service(calls: Calls, options: { role?: string; history?: Partial<Record<string, number>> } = {}) {
  const role = options.role ?? 'driver';
  const staffRepository = {
    getById: async () => ({ id: 'staff-1', role, userId: null, email: null }),
    update: async (_id: string, data: object) => { calls.push(`update ${JSON.stringify(data)}`); return { id: 'staff-1', role, ...data }; },
    getLinkedTeacher: async () => null,
    getLinkedDriver: async () => null,
    delete: async () => { calls.push('delete staff'); return { id: 'staff-1' }; },
    getAttendanceRoster: async (date: string) => { calls.push(`roster ${date}`); return []; },
    countRecordedHistory: async () => ({ payslips: 0, attendance: 0, duties: 0, vehicleAssignments: 0, ...options.history }),
  };
  const validator = withEnglishMessages(new StaffValidator(staffRepository as any, { getByCode: async (code: string) => ({ code, active: true }) } as any));
  return new StaffService(
    staffRepository as any,
    validator,
    {} as any,
    {} as any,
    { delete: async () => undefined } as any,
    {
      getByStaffId: async () => ({ id: 'driver-1' }),
      delete: async () => { calls.push('delete driver'); },
    } as any,
    {
      syncCurrentForRole: async (assignedRole: string, _id: string, rows: object[], day: string) => {
        calls.push(`sync ${assignedRole} ${day} ${JSON.stringify(rows)}`);
      },
      endCurrentForRole: async (ended: string, _id: string, day: string) => { calls.push(`end ${ended} ${day}`); },
      deleteAllForStaff: async () => { calls.push('delete assignments'); },
    } as any,
    { deleteByDriverIdAcrossYears: async () => { calls.push('delete vehicle history'); } } as any,
    { assignDriverFromToday: async (driverId: string, vehicleId: string) => { calls.push(`assign ${driverId} ${vehicleId}`); } } as any,
  );
}

describe('staff: shared identity with dated assignments', () => {
  // `.partial()` kept the defaults, so an update naming a phone number set a
  // departed staff member back to active and an hourly one back to monthly.
  it('changes only the fields an update names', () => {
    expect(updateStaffDto.parse({ phone: '212600000000' })).toEqual({ phone: '212600000000' });
  });

  // Every save deleted the driver's vehicle assignments in every year and
  // inserted the vehicles again as active from today.
  it("reassigns a driver's vehicle from today and never deletes the history", async () => {
    const calls: Calls = [];
    await service(calls).update('staff-1', { assignments: [
      { vehicleId: 'bus-old', status: 'completed', startDate: '2024-09-01', endDate: '2025-07-01' },
      { vehicleId: 'bus-now', status: 'active' },
    ] } as any);
    expect(calls.filter((call) => !call.startsWith('update'))).toEqual(['assign driver-1 bus-now']);

    await expect(service([]).update('staff-1', { assignments: [{ vehicleId: 'bus-a' }, { vehicleId: 'bus-b' }] } as any))
      .rejects.toThrow('A driver has one current vehicle');
  });

  it('keeps other roles\' ended assignments: the request names the current ones', async () => {
    process.env.APP_BUSINESS_DATE = '2026-09-27';
    const calls: Calls = [];
    await service(calls, { role: 'cleaner' }).update('staff-1', { assignments: [{ zoneId: 'zone-b' }] } as any);
    expect(calls.filter((call) => !call.startsWith('update'))).toEqual(['sync cleaner 2026-09-27 [{"zoneId":"zone-b"}]']);
  });

  it("ends the old role's assignments on a role change, and keeps a driver with vehicle history a driver", async () => {
    process.env.APP_BUSINESS_DATE = '2026-09-27';
    const calls: Calls = [];
    await service(calls, { role: 'cleaner' }).update('staff-1', { role: 'security', assignments: [{ zoneId: 'gate' }] } as any);
    expect(calls.filter((call) => !call.startsWith('update')))
      .toEqual(['end cleaner 2026-09-27', 'sync security 2026-09-27 [{"zoneId":"gate"}]']);

    const driverCalls: Calls = [];
    await expect(service(driverCalls, { history: { vehicleAssignments: 2 } }).update('staff-1', { role: 'cleaner' } as any))
      .rejects.toThrow('keeps the driver role');
    expect(driverCalls).toEqual([]);
  });

  it('refuses to delete a staff member other modules hold records of, before deleting anything', async () => {
    for (const history of [{ payslips: 1 }, { attendance: 3 }, { duties: 1 }]) {
      const calls: Calls = [];
      await expect(service(calls, { role: 'cleaner', history }).delete('staff-1')).rejects.toThrow('cannot be deleted');
      expect(calls).toEqual([]);
    }
    const calls: Calls = [];
    await service(calls, { role: 'cleaner' }).delete('staff-1');
    expect(calls).toEqual(['delete assignments', 'delete staff']);
  });

  it("builds the attendance roster for the school's day, not the server clock's", async () => {
    process.env.APP_BUSINESS_DATE = '2026-09-27';
    const calls: Calls = [];
    await service(calls).getAttendanceRoster();
    await service(calls).getAttendanceRoster('2025-10-01');
    expect(calls).toEqual(['roster 2026-09-27', 'roster 2025-10-01']);
  });

  it('holds an assignment through its end date, inclusive', () => {
    expect(isCurrentAssignment({ status: 'active', endDate: null }, '2026-09-27')).toBe(true);
    expect(isCurrentAssignment({ status: 'active', endDate: '2026-09-27' }, '2026-09-27')).toBe(true);
    expect(isCurrentAssignment({ status: 'active', endDate: '2026-09-26' }, '2026-09-27')).toBe(false);
    expect(isCurrentAssignment({ status: 'completed', endDate: null }, '2026-09-27')).toBe(false);
  });
});
