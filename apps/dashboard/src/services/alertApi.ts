import type { AlertStatus } from '@sms/contracts';
import { api } from './http';

// The alerts the signed-in person may see in the selected year: staff see
// every alert, teachers, parents and students only their own.

export const getAlertsApi = async () => {
  const res = await api.get('/alerts');
  return res.data;
};

export const getAlertByIdApi = async (id: string) => {
  const res = await api.get(`/alerts/${id}`);
  return res.data;
};

export const getStudentAlertsApi = async (studentId: string) => {
  const res = await api.get(`/alerts/student/${studentId}`);
  return res.data;
};

export const getActiveAlertsApi = async () => {
  const res = await api.get('/alerts/active');
  return res.data;
};

export const getAlertStatusCountsApi = async () => {
  const res = await api.get('/alerts/status-counts');
  return res.data;
};

/** Families may only acknowledge an alert about themselves or their child. */
export const updateAlertStatusApi = async ({ id, status }: { id: string; status: AlertStatus }) => {
  const res = await api.put(`/alerts/${id}/status`, { status });
  return res.data;
};

export const deleteAlertApi = async (id: string) => {
  const res = await api.delete(`/alerts/${id}`);
  return res.data;
};
