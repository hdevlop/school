import { api } from './http';

export const getCyclesApi = async () => {
  const res = await api.get('/cycles');
  return res.data;
};

export const getActiveCyclesApi = async () => {
  const res = await api.get('/cycles/active');
  return res.data;
};

export const getCycleApi = async (id: string) => {
  const res = await api.get(`/cycles/${id}`);
  return res.data;
};

export const createCycleApi = async (data: any) => {
  const res = await api.post('/cycles', data);
  return res.data;
};

export const updateCycleApi = async (data: any) => {
  const res = await api.put(`/cycles/${data.id}`, data);
  return res.data;
};

export const deleteCycleApi = async (id: string) => {
  const res = await api.delete(`/cycles/${id}`);
  return res.data;
};
