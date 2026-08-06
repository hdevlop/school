import { api } from './http';

export const getStudentCreditsApi = async (studentId: string) =>
  (await api.get(`/student-credits/student/${studentId}`)).data;

export const applyStudentCreditApi = async (studentId: string, amount: number) =>
  (await api.post('/student-credits/apply', { studentId, amount })).data;

export const getFinancialAuditApi = async (filters: Record<string, unknown> = {}) =>
  (await api.post('/financial-audit-logs/list', { limit: 50, offset: 0, ...filters })).data;

export const getFinancialNotificationsApi = async () =>
  (await api.get('/financial-notifications/recent')).data;

export const previewRolloverApi = async (data: Record<string, unknown>) =>
  (await api.post('/rollover/preview', data)).data;

export const commitRolloverApi = async (data: Record<string, unknown>) =>
  (await api.post('/rollover/commit', data)).data;
