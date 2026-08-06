import { api } from './http';

export const getAttendanceApi = async (type?: string) => {
  const res = await api.get('/attendance', { params: { type } });
  return res.data;
};

export const getStudentAttendanceApi = async () => {
  const res = await api.get('/attendance', { params: { type: 'student' } });
  return res.data;
};

export const getTeacherAttendanceApi = async () => {
  return getStaffAttendanceApi();
};

export const getStaffAttendanceApi = async () => {
  const res = await api.get('/attendance', { params: { type: 'staff' } });
  return res.data;
};

export const getTodayAttendanceApi = async (type?: string) => {
  const res = await api.get('/attendance/today', { params: { type } });
  return res.data;
};

export const getAttendanceByDateApi = async (date: string, type?: string) => {
  const res = await api.get(`/attendance/date/${date}`, { params: { type } });
  return res.data;
};

export const getAttendanceBySectionApi = async (sectionId: string) => {
  const res = await api.get(`/attendance/section/${sectionId}`);
  return res.data;
};

export const getAttendanceByStudentApi = async (studentId: string) => {
  const res = await api.get(`/attendance/student/${studentId}`);
  return res.data;
};

export const getAttendanceByTeacherApi = async (teacherId: string) => {
  const res = await api.get(`/attendance/teacher/${teacherId}`);
  return res.data;
};

export const getAttendanceByStaffApi = async (staffId: string) => {
  const res = await api.get(`/attendance/staff/${staffId}`);
  return res.data;
};

export const markAttendanceApi = async (data: any) => {
  const res = await api.post('/attendance', data);
  return res.data;
};

export const upsertStaffAttendanceRosterApi = async (items: Array<{
  staffId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  notes?: string | null;
}>) => {
  const res = await api.post('/attendance/staff/bulk', { items });
  return res.data;
};

export const updateAttendanceApi = async (data: any) => {
  const res = await api.put(`/attendance/${data.id}`, data);
  return res.data;
};

// Daily-mode correction: update today's status for a student in a section.
// Body: { studentId, sectionId, status, note? }
export const updateAttendanceStatusApi = async (data: {
  studentId: string;
  sectionId: string;
  status: string;
  note?: string;
}) => {
  const res = await api.put('/attendance/status', data);
  return res.data;
};

export const getAttendanceHistoryApi = async (id: string) => {
  const res = await api.get(`/attendance/${id}/history`);
  return res.data;
};

export const deleteAttendanceApi = async (id: string) => {
  const res = await api.delete(`/attendance/${id}`);
  return res.data;
};
