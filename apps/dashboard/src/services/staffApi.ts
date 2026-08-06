import { api, formApi } from './http'

export const getStaffApi = async () => {
  const res = await api.get('/staff')
  return res.data
}

export const getStaffAttendanceRosterApi = async (date?: string) => {
  const res = await api.get('/staff/attendance-roster', { params: { date } })
  return res.data
}

export const getStaffMemberApi = async (id) => {
  const res = await api.get(`/staff/${id}`)
  return res.data
}

export const getStaffCountApi = async () => {
  const res = await api.get('/staff/count')
  return res.data
}

export const getStaffByRoleApi = async (role) => {
  const res = await api.get(`/staff/role/${role}`)
  return res.data
}

export const getStaffByEmployeeCodeApi = async (employeeCode) => {
  const res = await api.get(`/staff/employee-code/${employeeCode}`)
  return res.data
}

export const getStaffByCinApi = async (cin) => {
  const res = await api.get(`/staff/cin/${cin}`)
  return res.data
}

export const createStaffApi = async (data) => {
  const res = await formApi.post('/staff', data)
  return res.data
}

export const updateStaffApi = async (data) => {
  const res = await formApi.put(`/staff/${data.id}`, data)
  return res.data
}

export const deleteStaffApi = async (id) => {
  const res = await api.delete(`/staff/${id}`)
  return res.data
}

export const deleteBulkStaffApi = async (data) => {
  const res = await api.delete('/staff/bulk', { data })
  return res.data
}
