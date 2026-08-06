import { api } from './http';

export const getRolesApi = async () => {
  const res = await api.get('/roles');
  return res.data;
};

export const getRoleByIdApi = async (id) => {
  const res = await api.get(`/roles/${id}`);
  return res.data;
};

export const createRoleApi = async (data) => {
  const res = await api.post('/roles', data);
  return res.data;
};

export const updateRoleApi = async (data) => {
  const res = await api.put(`/roles/${data.id}`, data);
  return res.data;
};

export const deleteRoleApi = async (id) => {
  const res = await api.delete(`/roles/${id}`);
  return res.data;
};