import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { api } from '../../src/services/http';
import { getAttendanceByDateApi, getStaffAttendanceApi } from '../../src/services/attendanceApi';

let get: ReturnType<typeof spyOn> | undefined;
afterEach(() => { get?.mockRestore(); });

describe('attendance read endpoints', () => {
  it('uses the staff permission endpoint for dated and year-wide staff reads', async () => {
    const envelope = { data: [{ id: 'staff-mark' }] };
    get = spyOn(api, 'get').mockResolvedValue({ data: envelope });
    expect(await getStaffAttendanceApi()).toEqual(envelope);
    expect(await getAttendanceByDateApi('2026-10-23', 'staff')).toEqual(envelope);
    expect(get).toHaveBeenNthCalledWith(1, '/attendance/staff/records');
    expect(get).toHaveBeenNthCalledWith(2, '/attendance/staff/records', { params: { date: '2026-10-23' } });
  });

  it('keeps student reads on their existing endpoint', async () => {
    get = spyOn(api, 'get').mockResolvedValue({ data: { data: [] } });
    await getAttendanceByDateApi('2026-10-23', 'student');
    expect(get).toHaveBeenCalledWith('/attendance/date/2026-10-23', { params: { type: 'student' } });
  });
});
