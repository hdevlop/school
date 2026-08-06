import { api } from './http';

export const getStaffRolesApi = async () => {
  const res = await api.get('/staff-roles');
  return res.data;
};

export const getActiveStaffRolesApi = async () => {
  const res = await api.get('/staff-roles/active');
  return res.data;
};

export const createStaffRoleApi = async (data) => {
  const res = await api.post('/staff-roles', data);
  return res.data;
};

export const updateStaffRoleApi = async ({ code, ...data }) => {
  const res = await api.put(`/staff-roles/${code}`, data);
  return res.data;
};

export const deleteStaffRoleApi = async (code) => {
  const res = await api.delete(`/staff-roles/${code}`);
  return res.data;
};
