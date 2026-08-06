import { api, formApi } from './http'

export const getDriversApi = async () => {
  const res = await api.get('/drivers')
  return res.data
}

export const getDriverByIdApi = async (id) => {
  const res = await api.get(`/drivers/${id}`)
  return res.data
}

export const getDriverByCinApi = async (cin) => {
  const res = await api.get(`/drivers/cin/${cin}`)
  return res.data
}

export const getDriverByLicenseApi = async (licenseNumber) => {
  const res = await api.get(`/drivers/license/${licenseNumber}`)
  return res.data
}

export const getActiveDriversApi = async () => {
  const res = await api.get('/drivers/active')
  return res.data
}

export const getInactiveDriversApi = async () => {
  const res = await api.get('/drivers/inactive')
  return res.data
}

export const getSuspendedDriversApi = async () => {
  const res = await api.get('/drivers/suspended')
  return res.data
}

export const getLicenseExpiringDriversApi = async () => {
  const res = await api.get('/drivers/license-expiring')
  return res.data
}

export const getDriverVehiclesApi = async (id) => {
  const res = await api.get(`/drivers/${id}/vehicles`)
  return res.data
}

export const getDriversCountApi = async () => {
  const res = await api.get('/drivers/count')
  return res.data
}

export const createDriverApi = async (data) => {
  const res = await formApi.post('/drivers', data)
  return res.data
}

export const updateDriverApi = async (data) => {
  const res = await formApi.put(`/drivers/${data.id}`, data);
  return res.data;
};

export const updateDriverStatusApi = async (id, status) => {
  const res = await api.put(`/drivers/${id}/status`, { status })
  return res.data
}

export const deleteDriverApi = async (id) => {
  const res = await api.delete(`/drivers/${id}`)
  return res.data
}

export const deleteAllDriversApi = async () => {
  const res = await api.delete('/drivers')
  return res.data
}

export const createBulkDriversApi = async (data) => {
  const res = await api.post('/drivers/bulk', data);
  return res.data;
};

export const deleteBulkDriversApi = async (data) => {
  const res = await api.delete('/drivers/bulk', { data });
  return res.data;
};