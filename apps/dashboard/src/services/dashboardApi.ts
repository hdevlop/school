import { api } from './http';

export const getWidgetsApi = async () => {
  const res = await api.get('/dashboard/widgets');
  return res.data;
};

export const getStudentsByGenderApi = async () => {
  const res = await api.get('/dashboard/students-by-gender');
  return res.data;
};

export const getStudentAttendanceMonthlyApi = async () => {
  const res = await api.get('/dashboard/attendance/students-monthly');
  return res.data;
};

export const getTeacherAttendanceMonthlyApi = async () => {
  return getStaffAttendanceMonthlyApi();
};

export const getStaffAttendanceMonthlyApi = async () => {
  const res = await api.get('/dashboard/attendance/staff-monthly');
  return res.data;
};

export const getFinanceKpisApi = async (academicYear?: string) => {
  const res = await api.get('/dashboard/finance/kpis', {
    params: academicYear ? { academicYear } : undefined,
  });
  return res.data;
};

export const getFinanceTrendApi = async (academicYear?: string) => {
  const res = await api.get('/dashboard/finance/trend', {
    params: academicYear ? { academicYear } : undefined,
  });
  return res.data;
};

export const getFinanceAgingApi = async () => {
  const res = await api.get('/dashboard/finance/aging');
  return res.data;
};

export const getFinanceOverdueApi = async (limit = 20) => {
  const res = await api.get('/dashboard/finance/overdue', { params: { limit } });
  return res.data;
};

export const getFinanceRecentPaymentsApi = async (limit = 10) => {
  const res = await api.get('/dashboard/finance/recent-payments', { params: { limit } });
  return res.data;
};

export const getFinanceExpenseBreakdownApi = async (academicYear?: string) => {
  const res = await api.get('/dashboard/finance/reports/expense-breakdown', {
    params: academicYear ? { academicYear } : undefined,
  });
  return res.data;
};

export const getFinanceCollectionByClassApi = async (academicYear?: string) => {
  const res = await api.get('/dashboard/finance/reports/collection-by-class', {
    params: academicYear ? { academicYear } : undefined,
  });
  return res.data;
};

export const getFinanceAgingDetailApi = async () => {
  const res = await api.get('/dashboard/finance/reports/aging-detail');
  return res.data;
};

export const getDashboardsApi = async () => {
  const res = await api.get('/dashboards');
  return res.data;
};

export const getDashboardByIdApi = async (id: string) => {
  const res = await api.get(`/dashboards/${id}`);
  return res.data;
};

export const getVehicleCountApi = async () => {
  const res = await api.get('/vehicles/count');
  return res.data;
};

export const getOperatorCountApi = async () => {
  const res = await api.get('/operators/count');
  return res.data;
};

export const getFieldCountApi = async () => {
  const res = await api.get('/fields/count');
  return res.data;
};

export const getOperationCountApi = async () => {
  const res = await api.get('/operations/count');
  return res.data;
};

export const getTotalFarmAreaApi = async () => {
  const res = await api.get('/fields/total-area');
  return res.data;
};

export const getTodayOperationsApi = async () => {
  const res = await api.get('/operations/today');
  return res.data;
};

export const getFuelConsumptionSummaryApi = async () => {
  const res = await api.get('/dashboard/fuel/consumption-summary');
  return res.data;
};

export const getVehicleStatusDistributionApi = async () => {
  const res = await api.get('/dashboard/vehicles/status-distribution');
  return res.data;
};

export const getOperatorStatusDistributionApi = async () => {
  const res = await api.get('/dashboard/operators/status-distribution');
  return res.data;
};

export const getOperationStatusDistributionApi = async () => {
  const res = await api.get('/dashboard/operations/status-distribution');
  return res.data;
};

export const getIncomeApi = async () => {
  const res = await api.get('/subscription/income');
  return res.data;
};

export const getClientCountApi = async () => {
  const res = await api.get('/clients/count');
  return res.data;
};
