import { api } from './http';

// Default: Returns student-centric grouped view (one row per student)
export const getFeesApi = async () => {
  const res = await api.get('/fees');
  return res.data;
};

// Returns detailed fee-centric view (one row per fee)
export const getFeesDetailedApi = async () => {
  const res = await api.get('/fees/detailed');
  return res.data;
};

export const getFeeByIdApi = async (id) => {
  const res = await api.get(`/fees/${id}`);
  return res.data;
};

export const getFeesByStudentApi = async (studentId) => {
  const res = await api.get(`/fees/student/${studentId}`);
  return res.data;
};

export const getInstallmentsByFeeApi = async (feeId) => {
  const res = await api.get(`/fees/installments/fee/${feeId}`);
  return res.data;
};

export const createFeeApi = async (data) => {
  const res = await api.post('/fees', data);
  return res.data;
};

export const updateFeeApi = async (data) => {
  const res = await api.put(`/fees/${data.id}`, data);
  return res.data;
};

export const deleteFeeApi = async (id) => {
  const res = await api.delete(`/fees/${id}`);
  return res.data;
};

export const createBulkFeesApi = async (data) => {
  const res = await api.post('/fees/bulk', data);
  return res.data;
};

export const createBulkClassFeesApi = async (data) => {
  const res = await api.post('/fees/bulk-class', data);
  return res.data;
};

export const deleteBulkFeesApi = async (data) => {
  const payload = Array.isArray(data) ? { ids: data } : data;
  const res = await api.delete('/fees/bulk', { data: payload });
  return res.data;
};
