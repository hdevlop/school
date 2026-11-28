import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, max, sql } from 'drizzle-orm';
import { Repository } from '../../najm';
import { DB } from '../../database/db';
import { attendanceDevicePunches, attendanceDevices, attendanceDeviceUsers } from '../../database/schema';
import { addDays } from '../../shared/schoolClock';
import type { DevicePunch, DeviceUser } from './admsProtocol';

// A device polls about every half minute; five minutes of silence is offline.
const ONLINE_WITHIN = sql`interval '5 minutes'`;

/**
 * Data access for the fingerprint terminals' own tables: the devices, the
 * users they report and every scan they send. A device request carries no
 * session and no selected year, so nothing here is owned or year-scoped; only
 * the device service, after it has checked the serial number, calls in. The
 * marks, staff, calendar and timetable a scan touches are read through their
 * own modules' repositories.
 */
@Repository()
export class AttendanceDeviceRepository {
  declare db: DB;

  // ---------- devices ----------

  /** The device's row, created on its first contact; marks its contact time. */
  async touchDevice(serialNumber: string) {
    const [row] = await this.db.insert(attendanceDevices)
      .values({ serialNumber, lastSeenAt: sql`CURRENT_TIMESTAMP` })
      .onConflictDoUpdate({
        target: attendanceDevices.serialNumber,
        set: { lastSeenAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` },
      })
      .returning();
    return row;
  }

  async setClosedThrough(deviceId: string, date: string) {
    await this.db.update(attendanceDevices)
      .set({ closedThrough: date })
      .where(eq(attendanceDevices.id, deviceId));
  }

  async listDevices() {
    const lastPunch = this.db.select({
      deviceId: attendanceDevicePunches.deviceId,
      lastPunchAt: max(attendanceDevicePunches.punchedAt).as('last_punch_at'),
    })
      .from(attendanceDevicePunches)
      .groupBy(attendanceDevicePunches.deviceId)
      .as('last_punch');
    return this.db.select({
      id: attendanceDevices.id,
      serialNumber: attendanceDevices.serialNumber,
      lastSeenAt: attendanceDevices.lastSeenAt,
      // Judged on the database's own clock, the one lastSeenAt was written with.
      online: sql<boolean>`coalesce(${attendanceDevices.lastSeenAt} > CURRENT_TIMESTAMP - ${ONLINE_WITHIN}, false)`,
      closedThrough: attendanceDevices.closedThrough,
      createdAt: attendanceDevices.createdAt,
      lastPunchAt: lastPunch.lastPunchAt,
    })
      .from(attendanceDevices)
      .leftJoin(lastPunch, eq(lastPunch.deviceId, attendanceDevices.id))
      .orderBy(asc(attendanceDevices.serialNumber));
  }

  // ---------- users and scans ----------

  async saveDeviceUsers(deviceId: string, users: DeviceUser[]) {
    if (!users.length) return;
    await this.db.insert(attendanceDeviceUsers)
      .values(users.map((user) => ({ deviceId, deviceUserId: user.deviceUserId, name: user.name })))
      .onConflictDoUpdate({
        target: [attendanceDeviceUsers.deviceId, attendanceDeviceUsers.deviceUserId],
        set: { name: sql`coalesce(excluded.name, ${attendanceDeviceUsers.name})`, updatedAt: sql`CURRENT_TIMESTAMP` },
      });
  }

  /** Stores the scans not seen before and returns only those. */
  async insertPunches(deviceId: string, punches: DevicePunch[]) {
    if (!punches.length) return [];
    return this.db.insert(attendanceDevicePunches)
      .values(punches.map((punch) => ({ deviceId, deviceUserId: punch.deviceUserId, punchedAt: punch.punchedAt })))
      .onConflictDoNothing()
      .returning({
        id: attendanceDevicePunches.id,
        deviceUserId: attendanceDevicePunches.deviceUserId,
        punchedAt: attendanceDevicePunches.punchedAt,
      });
  }

  async unassignedPunchesFor(deviceUserId: string) {
    return this.db.select({
      id: attendanceDevicePunches.id,
      deviceUserId: attendanceDevicePunches.deviceUserId,
      punchedAt: attendanceDevicePunches.punchedAt,
    })
      .from(attendanceDevicePunches)
      .where(and(eq(attendanceDevicePunches.deviceUserId, deviceUserId), isNull(attendanceDevicePunches.staffId)))
      .orderBy(asc(attendanceDevicePunches.punchedAt));
  }

  async assignPunches(ids: string[], staffId: string) {
    if (!ids.length) return;
    await this.db.update(attendanceDevicePunches)
      .set({ staffId })
      .where(inArray(attendanceDevicePunches.id, ids));
  }

  async hasPunchesOn(deviceId: string, date: string) {
    const [row] = await this.db.select({ id: attendanceDevicePunches.id })
      .from(attendanceDevicePunches)
      .where(and(
        eq(attendanceDevicePunches.deviceId, deviceId),
        // A range, not a cast, so the punched_at index serves it.
        gte(attendanceDevicePunches.punchedAt, `${date} 00:00:00`),
        lt(attendanceDevicePunches.punchedAt, `${addDays(date, 1)} 00:00:00`),
      ))
      .limit(1);
    return Boolean(row);
  }

  /** Each PIN's scan count and last scan, across every device. */
  async punchStatsByPin() {
    return this.db.select({
      deviceUserId: attendanceDevicePunches.deviceUserId,
      punchCount: count(),
      lastPunchAt: max(attendanceDevicePunches.punchedAt),
    })
      .from(attendanceDevicePunches)
      .groupBy(attendanceDevicePunches.deviceUserId);
  }

  /** The users the devices reported, the most recently named first. */
  async listDeviceUsers() {
    return this.db.select({
      deviceUserId: attendanceDeviceUsers.deviceUserId,
      name: attendanceDeviceUsers.name,
    })
      .from(attendanceDeviceUsers)
      .orderBy(desc(isNotNull(attendanceDeviceUsers.name)), desc(attendanceDeviceUsers.updatedAt));
  }
}
