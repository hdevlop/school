import { api } from "./http";

export const getVehicleAssignmentsApi = async () => {
  const res = await api.get('/vehicle-assignments');
  return res.data;
};

// Get active vehicle assignments
export const getActiveAssignmentsApi = async () => {
  const res = await api.get('/vehicle-assignments/active');
  return res.data;
};

// Get vehicle assignment by ID
export const getVehicleAssignmentByIdApi = async (id: string) => {
  const res = await api.get(`/vehicle-assignments/${id}`);
  return res.data;
};

// Get assignments by vehicle ID
export const getAssignmentsByVehicleApi = async (vehicleId: string) => {
  const res = await api.get(`/vehicle-assignments/vehicle/${vehicleId}`);
  return res.data;
};

// Get assignments by driver ID
export const getAssignmentsByDriverApi = async (driverId: string) => {
  const res = await api.get(`/vehicle-assignments/driver/${driverId}`);
  return res.data;
};

// Get active assignment for a vehicle
export const getActiveAssignmentByVehicleApi = async (vehicleId: string) => {
  const res = await api.get(`/vehicle-assignments/vehicle/${vehicleId}/active`);
  return res.data;
};

// Get active assignments for a driver
export const getActiveAssignmentsByDriverApi = async (driverId: string) => {
  const res = await api.get(`/vehicle-assignments/driver/${driverId}/active`);
  return res.data;
};

// Get assignment history for a vehicle
export const getAssignmentHistoryApi = async (vehicleId: string) => {
  const res = await api.get(`/vehicle-assignments/vehicle/${vehicleId}/history`);
  return res.data;
};

// Get driver's assignment history
export const getDriverHistoryApi = async (driverId: string) => {
  const res = await api.get(`/vehicle-assignments/driver/${driverId}/history`);
  return res.data;
};

// Create a new vehicle assignment
export const createVehicleAssignmentApi = async (data: any) => {
  const res = await api.post('/vehicle-assignments', data);
  return res.data;
};

// Assign driver to vehicle (simplified)
export const assignDriverToVehicleApi = async (data: { vehicleId: string; driverId: string; assignmentDate?: string }) => {
  const res = await api.post('/vehicle-assignments/assign', data);
  return res.data;
};

// Update vehicle assignment
export const updateVehicleAssignmentApi = async (id: string, data: any) => {
  const res = await api.put(`/vehicle-assignments/${id}`, data);
  return res.data;
};

// Delete vehicle assignment
export const deleteVehicleAssignmentApi = async (id: string) => {
  const res = await api.delete(`/vehicle-assignments/${id}`);
  return res.data;
};