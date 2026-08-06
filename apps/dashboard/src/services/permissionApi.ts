import { api } from './http';

export const getPermissionsApi = async () => {
  const res = await api.get('/permissions');
  return res.data;
};

export const getPermissionByIdApi = async (id) => {
  const res = await api.get(`/permissions/${id}`);
  return res.data;
};

export const createPermissionApi = async (data) => {
  const res = await api.post('/permissions', data);
  return res.data;
};

export const updatePermissionApi = async ({ id, ...data }) => {
  const res = await api.put(`/permissions/${id}`, data);
  return res.data;
};

export const deletePermissionApi = async (id) => {
  const res = await api.delete(`/permissions/${id}`);
  return res.data;
};

export const getPermissionsByRoleApi = async (roleId) => {
  const res = await api.get(`/permissions/role/${roleId}`);
  return res.data;
};

export const assignPermissionToRoleApi = async ({ roleId, permissionId }) => {
  const res = await api.post(`/permissions/assign/${roleId}/${permissionId}`);
  return res.data;
};

export const removePermissionFromRoleApi = async ({ roleId, permissionId }) => {
  const res = await api.delete(`/permissions/remove/${roleId}/${permissionId}`);
  return res.data;
};
