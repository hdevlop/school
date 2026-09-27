import { api } from './http';

// One row per student for fees charged to the request's school year.
export const getFeesApi = async () => {
  const res = await api.get('/fees');
  return res.data;
};

// Students owing fees of any school year, one row per student with every
// year summed: an explicit all-year read, whatever year the tab views.
export const getOutstandingFeesApi = async () => {
  const res = await api.get('/fees/outstanding');
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

// Every year's fees of one student: an explicit all-year read, used to show
// other years' unpaid fees whatever year the tab views.
export const getFeesByStudentAllYearsApi = async (studentId: string) => {
  const res = await api.get(`/fees/student/${studentId}/all-years`);
  return res.data;
};

// The student's fees, totals and payment metrics for the request's fee year.
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
