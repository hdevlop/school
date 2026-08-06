import { api } from './http';

// Basic CRUD Operations
export const getAlertsApi = async () => {
  const res = await api.get('/alerts');
  return res.data;
};

export const getAlertByIdApi = async (id) => {
  const res = await api.get(`/alerts/${id}`);
  return res.data;
};

export const createAlertApi = async (data) => {
  const res = await api.post('/alerts', data);
  return res.data;
};

export const updateAlertApi = async (data) => {
  const res = await api.put(`/alerts/${data.id}`, data);
  return res.data;
};

export const deleteAlertApi = async (id) => {
  const res = await api.delete(`/alerts/${id}`);
  return res.data;
};

export const deleteAllAlertsApi = async () => {
  const res = await api.delete('/alerts/all');
  return res.data;
};

// Status Operations
export const updateAlertStatusApi = async (id, status) => {
  const res = await api.put(`/alerts/${id}/status`, { status });
  return res.data;
};

export const markAlertAsReadApi = async (id) => {
  const res = await api.put(`/alerts/${id}/read`);
  return res.data;
};

export const markAllAlertsAsReadApi = async () => {
  const res = await api.put('/alerts/mark-all-read');
  return res.data;
};

// Filtering Operations
export const getAlertsByStatusApi = async (status) => {
  const res = await api.get(`/alerts/status/${status}`);
  return res.data;
};

export const getAlertsByTypeApi = async (type) => {
  const res = await api.get(`/alerts/type/${type}`);
  return res.data;
};

export const getAlertsByPriorityApi = async (priority) => {
  const res = await api.get(`/alerts/priority/${priority}`);
  return res.data;
};

export const getAlertsByVehicleIdApi = async (vehicleId) => {
  const res = await api.get(`/alerts/vehicle/${vehicleId}`);
  return res.data;
};

export const getAlertsByOperatorIdApi = async (operatorId) => {
  const res = await api.get(`/alerts/operator/${operatorId}`);
  return res.data;
};

export const getAlertsByUserIdApi = async (userId) => {
  const res = await api.get(`/alerts/user/${userId}`);
  return res.data;
};

// Recent & Active Alerts
export const getRecentAlertsApi = async (limit?: number) => {
  const url = limit ? `/alerts/recent?limit=${limit}` : '/alerts/recent';
  const res = await api.get(url);
  return res.data;
};

export const getActiveAlertsApi = async () => {
  const res = await api.get('/alerts/active');
  return res.data;
};

export const getUnreadAlertsApi = async () => {
  const res = await api.get('/alerts/unread');
  return res.data;
};

export const getCriticalAlertsApi = async () => {
  const res = await api.get('/alerts/critical');
  return res.data;
};

export const getHighPriorityAlertsApi = async () => {
  const res = await api.get('/alerts/high-priority');
  return res.data;
};

// Analytics & Statistics
export const getAlertCountApi = async () => {
  const res = await api.get('/alerts/count');
  return res.data;
};

export const getAlertStatusCountsApi = async () => {
  const res = await api.get('/alerts/analytics/status-counts');
  return res.data;
};

export const getAlertTypeCountsApi = async () => {
  const res = await api.get('/alerts/analytics/type-counts');
  return res.data;
};

export const getAlertPriorityCountsApi = async () => {
  const res = await api.get('/alerts/analytics/priority-counts');
  return res.data;
};

export const getAlertsByDateRangeApi = async (startDate, endDate) => {
  const res = await api.get(`/alerts/date-range?startDate=${startDate}&endDate=${endDate}`);
  return res.data;
};

export const getTodayAlertsApi = async () => {
  const res = await api.get('/alerts/today');
  return res.data;
};

// Alert Dashboard & Summary
export const getAlertDashboardSummaryApi = async () => {
  const res = await api.get('/alerts/dashboard/summary');
  return res.data;
};

export const getUnreadAlertCountApi = async () => {
  const res = await api.get('/alerts/unread/count');
  return res.data;
};

// Specialized Alert Creation
export const createMaintenanceAlertApi = async (data) => {
  const res = await api.post('/alerts/maintenance', data);
  return res.data;
};

export const createFuelAlertApi = async (data) => {
  const res = await api.post('/alerts/fuel', data);
  return res.data;
};

export const createSecurityAlertApi = async (data) => {
  const res = await api.post('/alerts/security', data);
  return res.data;
};

export const createOperationalAlertApi = async (data) => {
  const res = await api.post('/alerts/operational', data);
  return res.data;
};

export const createSystemAlertApi = async (data) => {
  const res = await api.post('/alerts/system', data);
  return res.data;
};