import { Injectable, Transaction } from '../../najm';
import { env } from '../../env';
import { getBusinessDateOverride } from '../../shared/businessDate';
import { schoolClock, toMinutes, weekdayOf } from '../../shared/schoolClock';
import { AcademicYearRepository } from '../academicYears/AcademicYearRepository';
import { AttendanceRepository } from '../attendance/AttendanceRepository';
import { ClassRoutineRepository } from '../classRoutines/ClassRoutineRepository';
import { EventRepository } from '../events/EventRepository';
import { SettingsRepository } from '../settings/SettingsRepository';
import { StaffRepository } from '../staff/StaffRepository';
import {
  arrivalDeadline,
  arrivalTimeOf,
  closableDates,
  dateOf,
  expectedOn,
  handshakeReply,
  parseAttendanceLog,
  parseDeviceUsers,
  staffMarkFor,
} from './admsProtocol';
import { AttendanceDeviceRepository } from './AttendanceDeviceRepository';
import { devicePeople } from './devicePeople';
import { AttendanceDeviceValidator } from './AttendanceDeviceValidator';

type Device = Awaited<ReturnType<AttendanceDeviceRepository['touchDevice']>>;
type Punch = { id: string; deviceUserId: string; punchedAt: string };
type DayPlan = Awaited<ReturnType<ClassRoutineRepository['getStaffDayPlan']>>;
type SchoolDay = NonNullable<Awaited<ReturnType<SettingsRepository['getStaffAttendanceDay']>>>;
type Year = { id: string; label: string };

const DEFAULT_ARRIVAL = '08:15';
const DEFAULT_DEPARTURE = '15:45';

/** What one request learns once and reuses for every scan in it. */
class DayContext {
  private years = new Map<string, Promise<Year | null>>();
  private plans = new Map<string, Promise<DayPlan>>();

  constructor(
    private academicYears: AcademicYearRepository,
    private routines: ClassRoutineRepository,
    readonly settings: SchoolDay,
  ) {}

  year(date: string) {
    if (!this.years.has(date)) this.years.set(date, this.academicYears.findForDate(date));
    return this.years.get(date)!;
  }

  async plan(date: string) {
    const year = await this.year(date);
    if (!year) return new Map() as DayPlan;
    const weekday = weekdayOf(date);
    const key = `${year.label}:${weekday}`;
    if (!this.plans.has(key)) this.plans.set(key, this.routines.getStaffDayPlan(year.label, weekday));
    return this.plans.get(key)!;
  }
}

/**
 * Staff attendance from a fingerprint terminal. A scan marks its staff member
 * present or late, by one of two rules (`arrivalDeadline`):
 *
 * - permanent (monthly) staff keep the school's fixed hours: late after the
 *   staff arrival time (08:15), expected every teaching day;
 * - a vacataire (hourly) is late after their first lesson or duty of the day
 *   minus the lead minutes (5), and expected only on a day they teach; on a
 *   day without a lesson a scan is only present.
 *
 * The earliest scan of the day counts. A person's mark always wins: a scan
 * replaces only a scan's or the close's mark.
 *
 * The end-of-day close marks absent every active staff member on the device
 * who was expected that day and has no mark. It runs from the device's own
 * requests, after the staff departure time (15:45) and the day's last lesson,
 * and only for a day the device delivered scans on and that is no holiday: a
 * device that was off, or a day nobody came, marks no one absent.
 *
 * A device request has no session and no selected year, so every read and
 * write here names the year of the scan's own date.
 */
@Injectable()
export class AttendanceDeviceService {
  constructor(
    private devices: AttendanceDeviceRepository,
    private validator: AttendanceDeviceValidator,
    private attendance: AttendanceRepository,
    private academicYears: AcademicYearRepository,
    private events: EventRepository,
    private settings: SettingsRepository,
    private staff: StaffRepository,
    private routines: ClassRoutineRepository,
  ) {}

  // ---------- the device ----------

  async handshake(serialNumber: string | undefined) {
    const serial = this.validator.ensureAllowedDevice(serialNumber);
    await this.devices.touchDevice(serial);
    return handshakeReply(serial);
  }

  /** An upload: scans (ATTLOG) or users (OPERLOG, USERINFO). Returns how many lines it took. */
  @Transaction()
  async receive(serialNumber: string | undefined, table: string | undefined, body: string) {
    const serial = this.validator.ensureAllowedDevice(serialNumber);
    const device = await this.devices.touchDevice(serial);
    const kind = (table ?? '').toUpperCase();
    let accepted = 0;
    if (kind === 'ATTLOG') {
      // Logs from before the device first reached School stay on the device.
      const firstDay = this.firstDay(device);
      const punches = parseAttendanceLog(body).filter((punch) => dateOf(punch.punchedAt) >= firstDay);
      accepted = punches.length;
      const fresh = await this.devices.insertPunches(device.id, punches);
      await this.countPunches(fresh);
    } else if (kind === 'OPERLOG' || kind === 'USERINFO' || kind === 'USER') {
      const users = parseDeviceUsers(body);
      accepted = users.length;
      await this.devices.saveDeviceUsers(device.id, users);
    }
    await this.closeOwedDays(device);
    return accepted;
  }

  /** The device's poll for commands; School sends none, and closes any owed day. */
  @Transaction()
  async poll(serialNumber: string | undefined) {
    const serial = this.validator.ensureAllowedDevice(serialNumber);
    const device = await this.devices.touchDevice(serial);
    await this.closeOwedDays(device);
  }

  // ---------- the dashboard ----------

  async listDevices() {
    const devices = await this.devices.listDevices();
    const known = new Set(devices.map((device) => device.serialNumber));
    return {
      devices,
      // Listed in ATTENDANCE_DEVICE_SERIALS but never connected yet.
      waiting: env.attendance.deviceSerials.filter((serial) => !known.has(serial)),
    };
  }

  async listPeople() {
    const [users, stats, linked] = await Promise.all([
      this.devices.listDeviceUsers(),
      this.devices.punchStatsByPin(),
      this.staff.getLinkedToDevice(),
    ]);
    return devicePeople(users, stats, linked);
  }

  /**
   * Links a device PIN to a staff member (or unlinks it). The PIN's scans that
   * belonged to no one yet are counted for them at once.
   */
  @Transaction()
  async link(deviceUserId: string, staffId: string | null) {
    if (!staffId) {
      await this.staff.clearDeviceUserId(deviceUserId);
      return { deviceUserId, staffId: null, counted: 0 };
    }
    await this.validator.ensureStaffExists(staffId);
    await this.validator.ensureDeviceUserIdFree(deviceUserId, staffId);
    await this.staff.setDeviceUserId(staffId, deviceUserId);
    const punches = await this.devices.unassignedPunchesFor(deviceUserId);
    await this.countPunches(punches);
    return { deviceUserId, staffId, counted: punches.length };
  }

  // ---------- marks ----------

  private firstDay(device: Pick<Device, 'createdAt'>) {
    return (device.createdAt ?? '').slice(0, 10) || '0000-01-01';
  }

  private hours(context: DayContext) {
    return {
      arrivalTime: context.settings.arrivalTime ?? DEFAULT_ARRIVAL,
      hourlyLeadMinutes: context.settings.hourlyLeadMinutes ?? 5,
    };
  }

  private async context() {
    const settings = await this.settings.getStaffAttendanceDay();
    return settings ? new DayContext(this.academicYears, this.routines, settings) : null;
  }

  private async countPunches(punches: Punch[]) {
    if (!punches.length) return;
    const context = await this.context();
    if (!context) return;
    const people = await this.staff.getByDeviceUserIds([...new Set(punches.map((punch) => punch.deviceUserId))]);
    const byPin = new Map(people.map((person) => [person.deviceUserId, person]));

    const earliest = new Map<string, { person: (typeof people)[number]; date: string; punchedAt: string }>();
    const idsByStaff = new Map<string, string[]>();
    for (const punch of punches) {
      const person = byPin.get(punch.deviceUserId);
      if (!person) continue;
      idsByStaff.set(person.id, [...(idsByStaff.get(person.id) ?? []), punch.id]);
      const date = dateOf(punch.punchedAt);
      const key = `${person.id}:${date}`;
      const known = earliest.get(key);
      if (!known || punch.punchedAt < known.punchedAt) earliest.set(key, { person, date, punchedAt: punch.punchedAt });
    }
    for (const [staffId, ids] of idsByStaff) await this.devices.assignPunches(ids, staffId);
    for (const scan of earliest.values()) await this.applyScan(context, scan.person, scan.date, scan.punchedAt);
  }

  private async applyScan(
    context: DayContext,
    person: { id: string; status: string; hireDate: string; endDate: string | null; compensationMode: string | null },
    date: string,
    punchedAt: string,
  ) {
    const working = (person.status === 'active' || person.status === 'onLeave')
      && person.hireDate <= date && (!person.endDate || person.endDate >= date);
    if (!working) return;
    const year = await context.year(date);
    if (!year) return;
    const plan = await context.plan(date);
    const deadline = arrivalDeadline(person.compensationMode, plan.get(person.id)?.firstStart, this.hours(context));
    const status = staffMarkFor(punchedAt, deadline);
    const arrivalTime = arrivalTimeOf(punchedAt);

    const [mark] = await this.attendance.getStaffMarksOn([person.id], date);
    if (!mark) {
      await this.attendance.insertDeviceStaffMarks([{ staffId: person.id, academicYearId: year.id, date, status, arrivalTime, source: 'device' }]);
      return;
    }
    if (mark.source === 'manual') return;
    // A later scan the same day changes nothing; an earlier one (a delayed
    // upload) or a scan after the close's absence does.
    if (mark.source === 'device' && mark.arrivalTime && mark.arrivalTime <= arrivalTime) return;
    await this.attendance.replaceDeviceStaffMark(mark, { status, arrivalTime });
  }

  // ---------- the end-of-day close ----------

  private async closeOwedDays(device: Device) {
    const context = await this.context();
    if (!context) return;
    const clock = schoolClock(context.settings.timeZone, new Date(), getBusinessDateOverride());
    const owed = (closingMinutes: number) => closableDates({
      closedThrough: device.closedThrough,
      firstDay: this.firstDay(device),
      today: clock.date,
      nowMinutes: clock.minutes,
      closingMinutes,
    });
    // The device polls every half minute. The day closes no earlier than the
    // staff departure time, so most polls stop here before reading the timetable.
    const departure = toMinutes(context.settings.departureTime ?? DEFAULT_DEPARTURE);
    if (!owed(departure).length) return;

    const todayPlan = await context.plan(clock.date);
    const lastEnds = [...todayPlan.values()].map((entry) => toMinutes(entry.lastEnd));
    const closingMinutes = Math.max(departure, ...lastEnds);
    for (const date of owed(closingMinutes)) {
      if (await this.devices.hasPunchesOn(device.id, date)) await this.closeDay(context, date);
      await this.devices.setClosedThrough(device.id, date);
    }
  }

  private async closeDay(context: DayContext, date: string) {
    if (await this.events.isHolidayOn(date)) return;
    const year = await context.year(date);
    if (!year) return;
    const plan = await context.plan(date);
    const teachingDay = (context.settings.teachingDays ?? []).includes(weekdayOf(date));
    const expected = (await this.staff.getOnDeviceWorkingOn(date))
      .filter((person) => expectedOn(person.compensationMode, plan.has(person.id), teachingDay));
    if (!expected.length) return;
    const marked = new Set((await this.attendance.getStaffMarksOn(expected.map((person) => person.id), date)).map((mark) => mark.staffId));
    await this.attendance.insertDeviceStaffMarks(expected
      .filter((person) => !marked.has(person.id))
      .map((person) => ({ staffId: person.id, academicYearId: year.id, date, status: 'absent' as const, arrivalTime: null, source: 'auto' as const })));
  }
}
