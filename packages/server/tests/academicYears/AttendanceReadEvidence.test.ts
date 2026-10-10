import 'reflect-metadata';
import { expect, test } from 'bun:test';
import { AttendanceController } from '../../src/modules/attendance/AttendanceController';
import { attendanceReadEvidence, AttendanceService } from '../../src/modules/attendance/AttendanceService';

test('empty recorded attendance leaves presence and absence unknown', () => {
  const result = attendanceReadEvidence([]);
  expect(result.records).toEqual([]);
  expect(result.recordState).toBe('no_records');
  expect(result.interpretation).toContain('Who is absent or present is unknown');
  const rows = [{ id: 'a', status: 'absent' }];
  const nonempty = attendanceReadEvidence(rows);
  expect(nonempty.records).toBe(rows);
  expect(nonempty.recordState).toBe('records_found');
  expect(nonempty.interpretation).toContain('Unrecorded people have unknown attendance');
});

test('MCP attendance reads carry evidence while dashboard list contracts keep arrays', async () => {
  const rows: Awaited<ReturnType<AttendanceService['getToday']>> = [], calls: unknown[] = [];
  const service = {
    getToday: async (type: unknown) => { calls.push(type); return rows; },
    getAll: async () => rows,
    getByDate: async () => rows,
  } as unknown as AttendanceService;
  const controller = new AttendanceController(service);
  expect(await controller.listToday('student')).toBe(rows);
  expect(await controller.listAll('student')).toBe(rows);
  for (const result of [await controller.getTodayStudents(), await controller.getTodayStaff(),
    await controller.getTodayAll({ type: 'student' }), await controller.getAll({ type: 'student' }),
    await controller.getByDate({ date: '2026-10-10', type: 'student' })]) {
    expect(result.records).toBe(rows);
    expect(result.recordState).toBe('no_records');
  }
  expect(calls).toEqual(['student', 'student', 'staff', 'student']);
});
