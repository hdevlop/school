import { api } from './http';

export const getZonesApi = async () => {
  const res = await api.get('/zones');
  return res.data;
};

export const getZoneApi = async (id: string) => {
  const res = await api.get(`/zones/${id}`);
  return res.data;
};

export const createZoneApi = async (data: any) => {
  const res = await api.post('/zones', data);
  return res.data;
};

export const updateZoneApi = async (data: any) => {
  const res = await api.put(`/zones/${data.id}`, data);
  return res.data;
};

export const deleteZoneApi = async (id: string) => {
  const res = await api.delete(`/zones/${id}`);
  return res.data;
};
