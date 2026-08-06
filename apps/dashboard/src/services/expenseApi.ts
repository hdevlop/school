import { api } from "./http";

// Types for requests/responses
export interface CreateExpenseData {
  category: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
  paymentDate?: string;
  vendor?: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  checkNumber?: string;
  transactionRef?: string;
  notes?: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string;
}

export interface ApprovalData {
  action: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface PaymentData {
  paymentMethod: string;
  paymentDate: string;
  checkNumber?: string;
  transactionRef?: string;
  notes?: string;
}

// GET Endpoints
export const getExpensesApi = async () => {
  const res = await api.get('/expenses');
  return res.data;
};

export const getExpenseByIdApi = async (id: string) => {
  const res = await api.get(`/expenses/${id}`);
  return res.data;
};

export const getExpensesByCategoryApi = async (category: string) => {
  const res = await api.get(`/expenses/category/${category}`);
  return res.data;
};

export const getExpensesByStatusApi = async (status: string) => {
  const res = await api.get(`/expenses/status/${status}`);
  return res.data;
};

export const getExpensesByVendorApi = async (vendor: string) => {
  const res = await api.get(`/expenses/vendor/${vendor}`);
  return res.data;
};

export const getExpensesByDateRangeApi = async (startDate: string, endDate: string) => {
  const res = await api.get(`/expenses/date-range`, {
    params: { startDate, endDate },
  });
  return res.data;
};

export const getPendingApprovalsApi = async () => {
  const res = await api.get('/expenses/pending/approvals');
  return res.data;
};

// Analytics Endpoints
export const getTotalExpensesByCategoryApi = async () => {
  const res = await api.get('/expenses/analytics/by-category');
  return res.data;
};

export const getTotalExpensesByStatusApi = async () => {
  const res = await api.get('/expenses/analytics/by-status');
  return res.data;
};

export const getMonthlyExpensesApi = async (year: number) => {
  const res = await api.get(`/expenses/analytics/monthly/${year}`);
  return res.data;
};

export const getTopVendorsApi = async (limit: number = 5) => {
  const res = await api.get(`/expenses/analytics/top-vendors`, {
    params: { limit },
  });
  return res.data;
};

// POST Endpoints
export const createExpenseApi = async (data: CreateExpenseData) => {
  const res = await api.post('/expenses', data);
  return res.data;
};

export const handleApprovalApi = async (id: string, data: ApprovalData) => {
  const res = await api.post(`/expenses/${id}/approval`, data);
  return res.data;
};

export const recordPaymentApi = async (id: string, data: PaymentData) => {
  const res = await api.post(`/expenses/${id}/payment`, data);
  return res.data;
};

// PUT Endpoints
export const updateExpenseApi = async (data: UpdateExpenseData) => {
  const { id, ...updateData } = data;
  const res = await api.put(`/expenses/${id}`, updateData);
  return res.data;
};

// DELETE Endpoints
export const deleteExpenseApi = async (id: string) => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};

export const deleteAllExpensesApi = async () => {
  const res = await api.delete('/expenses');
  return res.data;
};