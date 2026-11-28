import { addDays, toMinutes } from '../../shared/schoolClock';

/**
 * The parts of ZKTeco's ADMS "push" protocol a fingerprint terminal (F18 and
 * its family) speaks to School, as pure functions. The device opens with
 * `GET /iclock/cdata?SN=…&options=all`, posts its logs to
 * `POST /iclock/cdata?SN=…&table=ATTLOG` as tab-separated lines, and polls
 * `GET /iclock/getrequest?SN=…` for commands. Every answer is plain text.
 */

export type DevicePunch = { deviceUserId: string; punchedAt: string };
export type DeviceUser = { deviceUserId: string; name: string | null };

const PIN = /^[A-Za-z0-9]{1,24}$/u;
const STAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/u;

/** `YYYY-MM-DD HH:MM[:SS]` as `YYYY-MM-DD HH:MM:SS`, or null when it is no real time. */
export function normalizePunchTime(value: string): string | null {
  const match = STAMP.exec(value.trim());
  if (!match) return null;
  const [, date, hours, minutes, seconds = '00'] = match;
  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return null;
  const day = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) return null;
  return `${date} ${hours}:${minutes}:${seconds}`;
}

/**
 * The scans in an ATTLOG upload: one per line, `PIN<TAB>time<TAB>status…`.
 * Some firmware separates with spaces instead; a malformed line is skipped.
 */
export function parseAttendanceLog(body: string): DevicePunch[] {
  const punches: DevicePunch[] = [];
  for (const raw of body.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line) continue;
    let fields = line.split('\t').map((field) => field.trim());
    if (fields.length < 2) {
      const words = line.split(/\s+/u);
      fields = [words[0], `${words[1] ?? ''} ${words[2] ?? ''}`];
    }
    const [deviceUserId, time] = fields;
    const punchedAt = normalizePunchTime(time ?? '');
    if (!PIN.test(deviceUserId ?? '') || !punchedAt) continue;
    punches.push({ deviceUserId, punchedAt });
  }
  return punches;
}

/**
 * The users in an OPERLOG or USERINFO upload: `USER PIN=1<TAB>Name=Ahmed…`.
 * Other operation-log lines (OPLOG, FP templates) are ignored.
 */
export function parseDeviceUsers(body: string): DeviceUser[] {
  const users = new Map<string, DeviceUser>();
  for (const raw of body.split(/\r?\n/u)) {
    const line = raw.trim().replace(/^USER\s+/u, '');
    if (!line.startsWith('PIN=')) continue;
    const fields = Object.fromEntries(line.split('\t').map((field) => {
      const at = field.indexOf('=');
      return at < 0 ? [field, ''] : [field.slice(0, at).trim(), field.slice(at + 1).trim()];
    }));
    const deviceUserId = fields.PIN;
    if (!PIN.test(deviceUserId ?? '')) continue;
    users.set(deviceUserId, { deviceUserId, name: fields.Name ? fields.Name.slice(0, 120) : null });
  }
  return [...users.values()];
}

/**
 * The options School sends on the opening request: send each scan at once
 * (Realtime) and every minute after a failure, with user changes.
 */
export function handshakeReply(serialNumber: string): string {
  return [
    `GET OPTION FROM: ${serialNumber}`,
    'ATTLOGStamp=None',
    'OPERLOGStamp=None',
    'ATTPHOTOStamp=None',
    'ErrorDelay=60',
    'Delay=30',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog OpLog EnrollUser ChgUser',
    'Realtime=1',
    'Encrypt=None',
  ].join('\n');
}

/** The school's rules for one staff member's day. */
export type StaffHours = {
  /** Permanent (monthly) staff: the fixed arrival time, `HH:MM`. */
  arrivalTime: string;
  /** A vacataire (hourly) arrives this many minutes before their first lesson or duty. */
  hourlyLeadMinutes: number;
};

/**
 * The latest on-time arrival, `HH:MM`, or null when the day has no deadline.
 * Permanent (monthly) staff keep the school's fixed arrival time whatever
 * they teach. A vacataire (hourly) is due `hourlyLeadMinutes` before their
 * first lesson or duty, and has no deadline on a day without one.
 */
export function arrivalDeadline(
  compensationMode: string | null | undefined,
  firstStart: string | null | undefined,
  hours: StaffHours,
): string | null {
  if (compensationMode !== 'hourly') return hours.arrivalTime.slice(0, 5);
  if (!firstStart) return null;
  const minutes = Math.max(0, toMinutes(firstStart) - Math.max(0, hours.hourlyLeadMinutes));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Whether the close expects this staff member that day: permanent staff on
 * every teaching day, a vacataire only on a day with a lesson or duty.
 */
export function expectedOn(compensationMode: string | null | undefined, hasLessonOrDuty: boolean, teachingDay: boolean) {
  return compensationMode === 'hourly' ? hasLessonOrDuty : teachingDay || hasLessonOrDuty;
}

/**
 * Present, or late once the scan is past the deadline's minute: with 08:15,
 * 08:15:59 is on time and 08:16 is late. No deadline means no lateness.
 */
export function staffMarkFor(punchedAt: string, deadline: string | null): 'present' | 'late' {
  if (!deadline) return 'present';
  return toMinutes(punchedAt.slice(11, 16)) > toMinutes(deadline) ? 'late' : 'present';
}

/** `HH:MM`, the form attendance stores an arrival in. */
export const arrivalTimeOf = (punchedAt: string) => punchedAt.slice(11, 16);
export const dateOf = (punchedAt: string) => punchedAt.slice(0, 10);

/**
 * The school days the end-of-day close still owes, oldest first: after the
 * last closed day, at most `maxDays` back, and today only once the school's
 * clock is past the day's closing time.
 */
export function closableDates(input: {
  closedThrough: string | null;
  firstDay: string;
  today: string;
  nowMinutes: number;
  closingMinutes: number;
  maxDays?: number;
}): string[] {
  const { closedThrough, firstDay, today, nowMinutes, closingMinutes, maxDays = 7 } = input;
  const lastDay = nowMinutes >= closingMinutes ? today : addDays(today, -1);
  let from = addDays(today, -(maxDays - 1));
  if (closedThrough && addDays(closedThrough, 1) > from) from = addDays(closedThrough, 1);
  if (firstDay > from) from = firstDay;
  const dates: string[] = [];
  for (let date = from; date <= lastDay; date = addDays(date, 1)) dates.push(date);
  return dates;
}
