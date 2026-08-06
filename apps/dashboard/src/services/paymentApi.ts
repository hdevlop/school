import { api } from './http';

export const getAllPaymentsApi = async () => {
  const res = await api.get('/payments');
  return res.data;
};

export const getPaymentByIdApi = async (id) => {
  const res = await api.get(`/payments/${id}`);
  return res.data;
};

export const getPaymentsByStudentApi = async (studentId) => {
  const res = await api.get(`/payments/student/${studentId}`);
  return res.data;
};

export const getPaymentsByFeeApi = async (feeId) => {
  const res = await api.get(`/payments/fee/${feeId}`);
  return res.data;
};

export const getPendingChecksApi = async () => {
  const res = await api.get('/payments/pending-checks');
  return res.data;
};

export const getOverdueChecksApi = async () => {
  const res = await api.get('/payments/overdue-checks');
  return res.data;
};

export const recordPaymentApi = async (data) => {
  const payload = { ...data };
  if (!payload.idempotencyKey) {
    payload.idempotencyKey = crypto.randomUUID();
  }
  const res = await api.post('/payments', payload);
  return res.data;
};

export const updatePaymentApi = async (data) => {
  const { id, ...updateData } = data;
  const res = await api.put(`/payments/${id}`, updateData);
  return res.data;
};

export const refundPaymentApi = async (id, reason) => {
  const res = await api.post(`/payments/${id}/refund`, { reason });
  return res.data;
};

export const voidPaymentApi = async (id, reason) => {
  const res = await api.post(`/payments/${id}/void`, { reason });
  return res.data;
};

export const updateCheckStatusApi = async (id, body) => {
  const res = await api.post(`/payments/${id}/check-status`, body);
  return res.data;
};

export const deletePaymentApi = async (_id) => {
  throw new Error('Hard delete of payments is disabled. Use voidPaymentApi to mark a payment as voided.');
};
