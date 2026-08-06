import { api } from './http';

// Get all installments
export const getInstallmentsApi = async () => {
  const res = await api.get('/installments');
  return res.data;
};

// Get installment by ID
export const getInstallmentByIdApi = async (id: string) => {
  const res = await api.get(`/installments/${id}`);
  return res.data;
};

// Get installments by fee ID
export const getInstallmentsByFeeIdApi = async (feeId: string) => {
  const res = await api.get(`/installments/fee/${feeId}`);
  return res.data;
};

// Get overdue installments
export const getOverdueInstallmentsApi = async () => {
  const res = await api.get('/installments/overdue');
  return res.data;
};

// Get pending installments
export const getPendingInstallmentsApi = async () => {
  const res = await api.get('/installments/pending');
  return res.data;
};

// Get paid installments
export const getPaidInstallmentsApi = async () => {
  const res = await api.get('/installments/paid');
  return res.data;
};

// Get installment statistics
export const getInstallmentStatsApi = async () => {
  const res = await api.get('/installments/stats');
  return res.data;
};

// Create installment
export const createInstallmentApi = async (data: any) => {
  const res = await api.post('/installments', data);
  return res.data;
};

// Update installment
export const updateInstallmentApi = async (data: any) => {
  const res = await api.put(`/installments/${data.id}`, data);
  return res.data;
};

// Delete installment
export const deleteInstallmentApi = async (id: string) => {
  const res = await api.delete(`/installments/${id}`);
  return res.data;
};

// Mark installment as paid
export const markInstallmentAsPaidApi = async (id: string) => {
  const res = await api.put(`/installments/${id}/mark-paid`);
  return res.data;
};

// Mark installment as overdue
export const markInstallmentAsOverdueApi = async (id: string) => {
  const res = await api.put(`/installments/${id}/mark-overdue`);
  return res.data;
};

// Mark installment as cancelled
export const markInstallmentAsCancelledApi = async (id: string) => {
  const res = await api.put(`/installments/${id}/mark-cancelled`);
  return res.data;
};