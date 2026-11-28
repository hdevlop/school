import { api } from './http';

export type AttendanceDevice = {
  id: string;
  serialNumber: string;
  lastSeenAt: string | null;
  /** Contacted within the last five minutes, judged on the server's clock. */
  online: boolean;
  lastPunchAt: string | null;
  closedThrough: string | null;
  createdAt: string | null;
};

export type AttendanceDevicePerson = {
  deviceUserId: string;
  deviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  staffRole: string | null;
  /** `hourly`: a vacataire, late after their first lesson minus the lead minutes; else permanent, fixed hours. */
  staffCompensationMode: string | null;
  /** The device's local clock, `YYYY-MM-DD HH:MM:SS`: the school's own time. */
  lastPunchAt: string | null;
  punchCount: number;
};

export const getAttendanceDevicesApi = async () => {
  const res = await api.get('/attendance-devices');
  return res.data;
};

export const getAttendanceDevicePeopleApi = async () => {
  const res = await api.get('/attendance-devices/people');
  return res.data;
};

export const linkAttendanceDeviceUserApi = async ({ deviceUserId, staffId }: { deviceUserId: string; staffId: string | null }) => {
  const res = await api.put(`/attendance-devices/people/${encodeURIComponent(deviceUserId)}`, { staffId });
  return res.data;
};
