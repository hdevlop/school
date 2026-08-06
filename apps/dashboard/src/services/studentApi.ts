import { api, formApi } from './http';

export const getStudentsApi = async () => {
  const res = await api.get('/students');
  return res.data;
};

export const getStudentByIdApi = async (id) => {
  const res = await api.get(`/students/${id}`);
  return res.data;
};

export const getStudentByCodeApi = async (studentCode) => {
  const res = await api.get(`/students/code/${studentCode}`);
  return res.data;
};

export const getStudentGradesApi = async (id) => {
  const res = await api.get(`/students/${id}/grades`);
  return res.data;
};

export const getStudentAttendanceApi = async (id) => {
  const res = await api.get(`/students/${id}/attendance`);
  return res.data;
};

export const getStudentAssessmentsApi = async (id) => {
  const res = await api.get(`/students/${id}/assessments`);
  return res.data;
};

export const getStudentAnalyticsApi = async (id) => {
  const res = await api.get(`/students/${id}/analytics`);
  return res.data;
};

export const getStudentParentsApi = async (id) => {
  const res = await api.get(`/students/${id}/parents`);
  return res.data;
};

export const createStudentApi = async (data) => {
  const res = await formApi.post('/students', data);
  return res.data;
};

export const updateStudentApi = async (data) => {
  const res = await formApi.put(`/students/${data.id}`, data);
  return res.data;
};

export const deleteStudentApi = async (id) => {
  const res = await api.delete(`/students/${id}`);
  return res.data;
};

export const createBulkStudentsApi = async (data) => {
  const res = await api.post('/students/bulk', data);
  return res.data;
};

export const deleteBulkStudentsApi = async (data) => {
  const payload = Array.isArray(data) ? { ids: data } : data;
  const res = await api.delete('/students/bulk', { data: payload });
  return res.data;
};
