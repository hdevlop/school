import { describe, expect, it } from 'bun:test';
import {
  arrivalDeadline,
  closableDates,
  expectedOn,
  handshakeReply,
  normalizePunchTime,
  parseAttendanceLog,
  parseDeviceUsers,
  staffMarkFor,
} from '../../src/modules/attendanceDevices/admsProtocol';

describe('ADMS attendance log', () => {
  it('reads tab-separated scans and skips malformed lines', () => {
    const body = [
      '1\t2026-11-27 07:58:12\t0\t1\t0\t0\t0',
      '42\t2026-11-27 08:21:00\t0\t1',
      '',
      'bad line',
      '7\t2026-13-01 08:00:00\t0\t1',
      '../x\t2026-11-27 08:00:00\t0\t1',
      '9\t2026-11-27 8:00:00\t0\t1',
    ].join('\r\n');
    expect(parseAttendanceLog(body)).toEqual([
      { deviceUserId: '1', punchedAt: '2026-11-27 07:58:12' },
      { deviceUserId: '42', punchedAt: '2026-11-27 08:21:00' },
    ]);
  });

  it('accepts firmware that separates with spaces and times without seconds', () => {
    expect(parseAttendanceLog('5 2026-11-27 08:01 0 1')).toEqual([
      { deviceUserId: '5', punchedAt: '2026-11-27 08:01:00' },
    ]);
  });

  it('refuses impossible times', () => {
    expect(normalizePunchTime('2026-02-30 08:00:00')).toBeNull();
    expect(normalizePunchTime('2026-11-27 24:00:00')).toBeNull();
    expect(normalizePunchTime('2026-11-27 23:59:59')).toBe('2026-11-27 23:59:59');
  });
});

describe('ADMS users', () => {
  it('reads USER lines from the operation log and ignores the rest', () => {
    const body = [
      'USER PIN=1\tName=Ahmed Alaoui\tPri=0\tPasswd=\tCard=\tGrp=1',
      'OPLOG 4\t0\t2026-11-27 08:00:00\t0\t0\t0\t0',
      'FP PIN=1\tFID=6\tSize=1024\tValid=1\tTMP=abc',
      'PIN=2\tName=',
    ].join('\n');
    expect(parseDeviceUsers(body)).toEqual([
      { deviceUserId: '1', name: 'Ahmed Alaoui' },
      { deviceUserId: '2', name: null },
    ]);
  });
});

describe('ADMS handshake', () => {
  it('names the device and asks for real-time scans', () => {
    const reply = handshakeReply('ABC123');
    expect(reply.split('\n')[0]).toBe('GET OPTION FROM: ABC123');
    expect(reply).toContain('Realtime=1');
    expect(reply).toContain('TransFlag=TransData AttLog');
  });
});

describe('staff lateness', () => {
  const hours = { arrivalTime: '08:15', hourlyLeadMinutes: 5 };

  it('holds permanent staff to the fixed arrival time, whatever their first lesson', () => {
    expect(arrivalDeadline('monthly', '10:30:00', hours)).toBe('08:15');
    expect(arrivalDeadline('monthly', null, hours)).toBe('08:15');
    expect(staffMarkFor('2026-11-27 08:15:59', '08:15')).toBe('present');
    expect(staffMarkFor('2026-11-27 08:16:00', '08:15')).toBe('late');
  });

  it('wants a vacataire five minutes before their first lesson', () => {
    expect(arrivalDeadline('hourly', '08:30:00', hours)).toBe('08:25');
    expect(staffMarkFor('2026-11-27 08:25:00', '08:25')).toBe('present');
    expect(staffMarkFor('2026-11-27 08:26:00', '08:25')).toBe('late');
    expect(arrivalDeadline('hourly', '10:00', hours)).toBe('09:55');
  });

  it('gives a vacataire no deadline on a day without a lesson', () => {
    expect(arrivalDeadline('hourly', null, hours)).toBeNull();
    expect(staffMarkFor('2026-11-27 16:00:00', null)).toBe('present');
  });

  it('expects permanent staff every teaching day and a vacataire only when they teach', () => {
    expect(expectedOn('monthly', false, true)).toBe(true);
    expect(expectedOn('monthly', false, false)).toBe(false);
    expect(expectedOn('hourly', false, true)).toBe(false);
    expect(expectedOn('hourly', true, true)).toBe(true);
  });
});

describe('end-of-day close', () => {
  it('waits for the closing time before closing today', () => {
    const base = { closedThrough: '2026-11-26', firstDay: '2026-11-01', today: '2026-11-27', closingMinutes: 17 * 60 };
    expect(closableDates({ ...base, nowMinutes: 16 * 60 })).toEqual([]);
    expect(closableDates({ ...base, nowMinutes: 17 * 60 })).toEqual(['2026-11-27']);
  });

  it('catches up on missed days, at most a week back and never before the first day', () => {
    expect(closableDates({
      closedThrough: '2026-11-01', firstDay: '2026-10-01', today: '2026-11-27', nowMinutes: 0, closingMinutes: 900,
    })).toEqual(['2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26']);
    expect(closableDates({
      closedThrough: null, firstDay: '2026-11-26', today: '2026-11-27', nowMinutes: 0, closingMinutes: 900,
    })).toEqual(['2026-11-26']);
  });
});
