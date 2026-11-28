import { beforeEach, describe, expect, it } from 'bun:test';
import { AttendanceDeviceService } from '../../src/modules/attendanceDevices/AttendanceDeviceService';
import { AttendanceDeviceValidator } from '../../src/modules/attendanceDevices/AttendanceDeviceValidator';
import { devicePeople } from '../../src/modules/attendanceDevices/devicePeople';
import type { DeviceStaffMark, StaffMark } from '../../src/modules/attendance/AttendanceRepository';
import { addDays, schoolClock } from '../../src/shared/schoolClock';
import { withEnglishMessages } from '../support/englishMessages';

const SERIAL = 'F18TEST01';
process.env.ATTENDANCE_DEVICE_SERIALS = SERIAL;

// The service reads the real clock in the school's zone; UTC keeps it plain.
const today = schoolClock('UTC').date;
const yesterday = addDays(today, -1);

type Person = { id: string; deviceUserId: string; teacherId: string | null; status?: string; compensationMode?: 'monthly' | 'hourly' };

/**
 * One school in memory: a device, staff with PINs, attendance marks and the
 * timetable. Each fake does only what its repository promises.
 */
function school(options: {
  people: Person[];
  plan?: Record<string, { firstStart: string; lastEnd: string }>;
  marks?: StaffMark[];
  holidays?: string[];
  departureTime?: string;
  closedThrough?: string | null;
}) {
  const device = {
    id: 'd1',
    serialNumber: SERIAL,
    lastSeenAt: null as string | null,
    closedThrough: options.closedThrough === undefined ? yesterday : options.closedThrough,
    createdAt: `${addDays(today, -30)} 09:00:00`,
    updatedAt: null as string | null,
  };
  const punches: { id: string; deviceUserId: string; punchedAt: string; staffId: string | null }[] = [];
  const marks: StaffMark[] = [...(options.marks ?? [])];
  const calls = { plan: 0, touched: 0 };

  const devices = {
    touchDevice: async () => { calls.touched += 1; return { ...device }; },
    setClosedThrough: async (_id: string, date: string) => { device.closedThrough = date; },
    insertPunches: async (_id: string, list: { deviceUserId: string; punchedAt: string }[]) => {
      const fresh = list
        .filter((punch) => !punches.some((known) => known.deviceUserId === punch.deviceUserId && known.punchedAt === punch.punchedAt))
        .map((punch) => ({ ...punch, id: `p${punches.length + 1}-${punch.deviceUserId}`, staffId: null }));
      punches.push(...fresh);
      return fresh.map(({ id, deviceUserId, punchedAt }) => ({ id, deviceUserId, punchedAt }));
    },
    assignPunches: async (ids: string[], staffId: string) => {
      for (const punch of punches) if (ids.includes(punch.id)) punch.staffId = staffId;
    },
    unassignedPunchesFor: async (pin: string) => punches.filter((punch) => punch.deviceUserId === pin && !punch.staffId),
    hasPunchesOn: async (_id: string, date: string) => punches.some((punch) => punch.punchedAt.startsWith(date)),
    saveDeviceUsers: async () => {},
  };
  const attendance = {
    getStaffMarksOn: async (ids: string[], date: string) => marks.filter((mark) => ids.includes(mark.staffId) && (mark as StaffMark & { date?: string }).date === date),
    insertDeviceStaffMarks: async (rows: DeviceStaffMark[]) => {
      let saved = 0;
      for (const row of rows) {
        if (marks.some((mark) => mark.staffId === row.staffId && (mark as StaffMark & { date?: string }).date === row.date)) continue;
        marks.push({ id: `m${marks.length + 1}`, staffId: row.staffId, status: row.status, source: row.source, arrivalTime: row.arrivalTime, date: row.date } as StaffMark);
        saved += 1;
      }
      return saved;
    },
    replaceDeviceStaffMark: async (mark: StaffMark, next: { status: 'present' | 'late'; arrivalTime: string }) => {
      const stored = marks.find((row) => row.id === mark.id);
      if (!stored || stored.source === 'manual') return false;
      Object.assign(stored, next, { source: 'device' });
      return true;
    },
  };
  const staffRecords = options.people.map((person) => ({
    id: person.id,
    deviceUserId: person.deviceUserId,
    status: person.status ?? 'active',
    hireDate: '2020-01-01',
    endDate: null,
    teacherId: person.teacherId,
    compensationMode: person.compensationMode ?? 'monthly',
  }));
  const staff = {
    getByDeviceUserIds: async (pins: string[]) => staffRecords.filter((person) => pins.includes(person.deviceUserId)),
    getOnDeviceWorkingOn: async () => staffRecords.filter((person) => person.status === 'active').map(({ id, teacherId, compensationMode }) => ({ id, teacherId, compensationMode })),
  };
  const settings = {
    getStaffAttendanceDay: async () => ({
      timeZone: 'UTC',
      arrivalTime: '08:15',
      departureTime: options.departureTime ?? '00:00',
      hourlyLeadMinutes: 5,
      teachingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }),
  };
  const routines = {
    getStaffDayPlan: async () => { calls.plan += 1; return new Map(Object.entries(options.plan ?? {})); },
  };
  const academicYears = { findForDate: async () => ({ id: 'y1', label: '2026-2027' }) };
  const events = { isHolidayOn: async (date: string) => (options.holidays ?? []).includes(date) };

  const validator = withEnglishMessages(new AttendanceDeviceValidator(staff as any));
  const service = new AttendanceDeviceService(
    devices as any, validator, attendance as any, academicYears as any,
    events as any, settings as any, staff as any, routines as any,
  );
  const markOf = (staffId: string, date = today) => marks.find((mark) => mark.staffId === staffId && (mark as StaffMark & { date?: string }).date === date);
  return { service, device, marks, markOf, calls };
}

const log = (...lines: [pin: string, time: string][]) => lines.map(([pin, time]) => `${pin}\t${time}\t0\t1`).join('\n');

describe('a fingerprint scan', () => {
  it('holds a permanent teacher to the fixed arrival time, not their first lesson', async () => {
    const { service, markOf } = school({
      people: [{ id: 's1', deviceUserId: '1', teacherId: 't1' }, { id: 's2', deviceUserId: '2', teacherId: 't2' }],
      plan: { s1: { firstStart: '10:30', lastEnd: '12:00' }, s2: { firstStart: '10:30', lastEnd: '12:00' } },
    });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 08:15:59`], ['2', `${today} 08:16:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'present', source: 'device', arrivalTime: '08:15' });
    expect(markOf('s2')).toMatchObject({ status: 'late', source: 'device', arrivalTime: '08:16' });
  });

  it('wants a vacataire five minutes before their first lesson', async () => {
    const { service, markOf } = school({
      people: [
        { id: 'v1', deviceUserId: '1', teacherId: 't1', compensationMode: 'hourly' },
        { id: 'v2', deviceUserId: '2', teacherId: 't2', compensationMode: 'hourly' },
      ],
      plan: { v1: { firstStart: '10:30', lastEnd: '12:00' }, v2: { firstStart: '10:30', lastEnd: '12:00' } },
    });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 10:25:00`], ['2', `${today} 10:26:00`]));
    expect(markOf('v1')).toMatchObject({ status: 'present', arrivalTime: '10:25' });
    expect(markOf('v2')).toMatchObject({ status: 'late', arrivalTime: '10:26' });
  });

  it('never replaces a mark a person saved', async () => {
    const { service, markOf } = school({
      people: [{ id: 's1', deviceUserId: '1', teacherId: null }],
      marks: [{ id: 'm1', staffId: 's1', status: 'absent', source: 'manual', arrivalTime: null, date: today } as StaffMark],
    });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 07:50:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'absent', source: 'manual' });
  });

  it('keeps the earliest scan of the day, even when it arrives late', async () => {
    const { service, markOf } = school({ people: [{ id: 's1', deviceUserId: '1', teacherId: null }] });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 08:20:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'late', arrivalTime: '08:20' });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 09:00:00`]));
    expect(markOf('s1')).toMatchObject({ arrivalTime: '08:20' });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 07:55:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'present', arrivalTime: '07:55' });
  });

  it('replaces the close’s absence when a scan for that day arrives afterwards', async () => {
    const { service, markOf } = school({
      people: [{ id: 's1', deviceUserId: '1', teacherId: null }],
      marks: [{ id: 'm1', staffId: 's1', status: 'absent', source: 'auto', arrivalTime: null, date: today } as StaffMark],
    });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 07:58:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'present', source: 'device', arrivalTime: '07:58' });
  });

  it('only counts a vacataire present when they have no lesson that day', async () => {
    const { service, markOf } = school({ people: [{ id: 's1', deviceUserId: '1', teacherId: 't1', compensationMode: 'hourly' }] });
    await service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 11:00:00`]));
    expect(markOf('s1')).toMatchObject({ status: 'present' });
  });

  it('refuses a serial number that is not listed, before storing anything', async () => {
    const { service, calls } = school({ people: [] });
    await expect(service.receive('UNKNOWN', 'ATTLOG', log(['1', `${today} 08:00:00`]))).rejects.toMatchObject({ status: 403 });
    expect(calls.touched).toBe(0);
  });
});

describe('the end-of-day close', () => {
  let world: ReturnType<typeof school>;

  beforeEach(() => {
    world = school({
      closedThrough: addDays(today, -1),
      people: [
        { id: 'came', deviceUserId: '1', teacherId: null },
        { id: 'missing', deviceUserId: '2', teacherId: null },
        { id: 'permanent-teacher', deviceUserId: '3', teacherId: 't3' },
        { id: 'vacataire-free', deviceUserId: '4', teacherId: 't4', compensationMode: 'hourly' },
        { id: 'vacataire-teaching', deviceUserId: '5', teacherId: 't5', compensationMode: 'hourly' },
      ],
      // The lesson ends at midnight so the close is already due on the test's clock.
      plan: { 'vacataire-teaching': { firstStart: '00:00', lastEnd: '00:00' } },
    });
  });

  it('marks expected staff with no mark absent on a day the device delivered scans', async () => {
    await world.service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 07:55:00`]));
    expect(world.markOf('came')).toMatchObject({ status: 'present', source: 'device' });
    expect(world.markOf('missing')).toMatchObject({ status: 'absent', source: 'auto' });
    // Permanent staff keep fixed hours, lesson or not.
    expect(world.markOf('permanent-teacher')).toMatchObject({ status: 'absent', source: 'auto' });
    // A vacataire is expected only on a day they teach.
    expect(world.markOf('vacataire-free')).toBeUndefined();
    expect(world.markOf('vacataire-teaching')).toMatchObject({ status: 'absent', source: 'auto' });
    expect(world.device.closedThrough).toBe(today);
  });

  it('marks no one absent on a day without scans, but still closes it', async () => {
    await world.service.poll(SERIAL);
    expect(world.marks).toHaveLength(0);
    expect(world.device.closedThrough).toBe(today);
  });

  it('marks no one absent on a holiday', async () => {
    const holiday = school({
      closedThrough: addDays(today, -1),
      holidays: [today],
      people: [{ id: 'came', deviceUserId: '1', teacherId: null }, { id: 'missing', deviceUserId: '2', teacherId: null }],
    });
    await holiday.service.receive(SERIAL, 'ATTLOG', log(['1', `${today} 07:55:00`]));
    expect(holiday.markOf('missing')).toBeUndefined();
    expect(holiday.device.closedThrough).toBe(today);
  });

  it('reads no timetable on a poll before the staff departure time', async () => {
    const early = school({ closedThrough: yesterday, departureTime: '23:59', people: [] });
    await early.service.poll(SERIAL);
    expect(early.calls.plan).toBe(0);
    expect(early.device.closedThrough).toBe(yesterday);
  });
});

describe('device people', () => {
  it('lists every known PIN once, unlinked first, in the device’s order, with the latest name', () => {
    const people = devicePeople(
      [
        { deviceUserId: '10', name: 'Karim' },
        { deviceUserId: '2', name: null },
        { deviceUserId: '2', name: 'Sara' },
        { deviceUserId: '10', name: 'Old name' },
      ],
      [
        { deviceUserId: '2', punchCount: 3, lastPunchAt: `${today} 08:01:00` },
        { deviceUserId: '7', punchCount: 1, lastPunchAt: `${today} 07:40:00` },
      ],
      [{ id: 's7', name: 'Nadia', role: 'teacher', compensationMode: 'hourly', deviceUserId: '7' }],
    );
    expect(people.map((person) => person.deviceUserId)).toEqual(['2', '10', '7']);
    expect(people[0]).toMatchObject({ deviceName: 'Sara', punchCount: 3, staffId: null });
    expect(people[1]).toMatchObject({ deviceName: 'Karim', punchCount: 0, lastPunchAt: null });
    expect(people[2]).toMatchObject({ staffId: 's7', staffName: 'Nadia', staffRole: 'teacher', staffCompensationMode: 'hourly', deviceName: null });
  });
});
