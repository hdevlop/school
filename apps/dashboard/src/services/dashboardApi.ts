import { api } from './http';
import type {
  TeacherAttendanceTrend,
  TeacherDashboardOverview,
  TeacherTrendRange,
} from '@sms/contracts/teacher-dashboard';

type ApiEnvelope<T> = { data: T; message?: string; status?: string };

// Every read covers the year its request sends as X-Academic-Year.
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

export const getStaffAttendanceMonthlyApi = async () => {
  const res = await api.get('/dashboard/attendance/staff-monthly');
  return res.data;
};

// The signed-in teacher's own home page; the server resolves the teacher.
export const getTeacherDashboardOverviewApi = async (): Promise<ApiEnvelope<TeacherDashboardOverview>> => {
  const res = await api.get('/dashboard/teacher/overview');
  return res.data;
};

export const getTeacherAttendanceTrendApi = async (range: TeacherTrendRange): Promise<ApiEnvelope<TeacherAttendanceTrend>> => {
  const res = await api.get('/dashboard/teacher/attendance-trend', { params: { range } });
  return res.data;
};

export const getFinanceKpisApi = async () => {
  const res = await api.get('/dashboard/finance/kpis');
  return res.data;
};

export const getFinanceTrendApi = async () => {
  const res = await api.get('/dashboard/finance/trend');
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

export const getFinanceExpenseBreakdownApi = async () => {
  const res = await api.get('/dashboard/finance/reports/expense-breakdown');
  return res.data;
};

export const getFinanceCollectionByClassApi = async () => {
  const res = await api.get('/dashboard/finance/reports/collection-by-class');
  return res.data;
};

export const getFinanceAgingDetailApi = async () => {
  const res = await api.get('/dashboard/finance/reports/aging-detail');
  return res.data;
};
