import { api } from './http';

export const getFinancialAuditApi = async (filters: Record<string, unknown> = {}) =>
  (await api.post('/financial-audit-logs/list', { limit: 50, offset: 0, ...filters })).data;

export const previewRolloverApi = async (data: Record<string, unknown>) =>
  (await api.post('/rollover/preview', data)).data;

export const commitRolloverApi = async (data: Record<string, unknown>) =>
  (await api.post('/rollover/commit', data)).data;
