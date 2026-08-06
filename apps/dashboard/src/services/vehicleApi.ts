import { api } from './http';

export const getVehiclesApi = async () => {
  const res = await api.get('/vehicles');
  return res.data;
};

export const getVehicleByIdApi = async (id: string) => {
  const res = await api.get(`/vehicles/${id}`);
  return res.data;
};

export const getVehicleByLicensePlateApi = async (licensePlate: string) => {
  const res = await api.get(`/vehicles/license/${licensePlate}`);
  return res.data;
};

export const getUnassignedVehiclesApi = async () => {
  const res = await api.get('/vehicles/unassigned');
  return res.data;
};

export const getAssignedVehiclesApi = async () => {
  const res = await api.get('/vehicles/assigned');
  return res.data;
};

export const createVehicleApi = async (data: any) => {
  const res = await api.post('/vehicles', data);
  return res.data;
};

export const updateVehicleApi = async (data) => {
  const res = await api.put(`/vehicles/${data.id}`, data);
  return res.data;
};

export const deleteVehicleApi = async (id: string) => {
  const res = await api.delete(`/vehicles/${id}`);
  return res.data;
};

export const assignDriverApi = async (data) => {
  const res = await api.post('/vehicle-assignments/assign', data);
  return res.data;
};

export const unassignDriverApi = async (id, unassignmentDate?) => {
  const res = await api.put(`/vehicle-assignments/${id}/unassign`, { unassignmentDate });
  return res.data;
};

