import { api } from './http';

export const getPublicSettingsApi = async () => {
  const res = await api.get('/settings/public');
  return res.data;
};

export const getAdminSettingsApi = async () => {
  const res = await api.get('/settings/admin');
  return res.data;
};

export const getSettingByIdApi = async (id) => {
  const res = await api.get(`/settings/${id}`);
  return res.data;
};

export const createSettingsApi = async (data) => {
  const res = await api.post('/settings', data);
  return res.data;
};

export const updateSettingsApi = async (data) => {
  const res = await api.put('/settings', data);
  return res.data;
};