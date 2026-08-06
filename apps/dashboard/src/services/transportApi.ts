import { api } from './http'

//=====================================================================//
// GET ENDPOINTS
//=====================================================================//

export const getBusesApi = async () => {
  const res = await api.get('/transport/buses')
  return res.data
}

export const getBusByIdApi = async (id: string) => {
  const res = await api.get(`/transport/buses/${id}`)
  return res.data
}

export const getRoutesApi = async () => {
  const res = await api.get('/transport/routes')
  return res.data
}

export const getRouteByIdApi = async (id: string) => {
  const res = await api.get(`/transport/routes/${id}`)
  return res.data
}

export const getBusStudentsApi = async (busId: string) => {
  const res = await api.get(`/transport/buses/${busId}/students`)
  return res.data
}

//=====================================================================//
// POST ENDPOINTS (CREATE)
//=====================================================================//

export const createBusApi = async (data: any) => {
  const res = await api.post('/transport/buses', data)
  return res.data
}

export const createRouteApi = async (data: any) => {
  const res = await api.post('/transport/routes', data)
  return res.data
}

export const assignStudentToBusApi = async (busId: string, studentId: string) => {
  const res = await api.post(`/transport/buses/${busId}/assign`, { studentId })
  return res.data
}

//=====================================================================//
// PUT ENDPOINTS (UPDATE)
//=====================================================================//

export const updateBusApi = async (data: any) => {
  const { id, ...updateData } = data
  const res = await api.put(`/transport/buses/${id}`, updateData)
  return res.data
}

export const updateRouteApi = async (data: any) => {
  const { id, ...updateData } = data
  const res = await api.put(`/transport/routes/${id}`, updateData)
  return res.data
}

//=====================================================================//
// DELETE ENDPOINTS
//=====================================================================//

export const deleteBusApi = async (id: string) => {
  const res = await api.delete(`/transport/buses/${id}`)
  return res.data
}

export const deleteRouteApi = async (id: string) => {
  const res = await api.delete(`/transport/routes/${id}`)
  return res.data
}

export const unassignStudentFromBusApi = async (busId: string, studentId: string) => {
  const res = await api.delete(`/transport/buses/${busId}/unassign/${studentId}`)
  return res.data
}

export const deleteAllBusesApi = async () => {
  const res = await api.delete('/transport/buses')
  return res.data
}

//=====================================================================//
// STUDENT ROUTES (student-vehicle assignments with auto fee billing)
//=====================================================================//

export const getStudentRoutesByVehicleApi = async (vehicleId: string) => {
  const res = await api.get(`/student-routes/vehicle/${vehicleId}`)
  return res.data
}

export const getStudentRoutesByStudentApi = async (studentId: string) => {
  const res = await api.get(`/student-routes/student/${studentId}`)
  return res.data
}

export const assignStudentToRouteApi = async (data: {
  studentId: string
  vehicleId: string
  pickupLocation?: string
  dropoffLocation?: string
  notes?: string
  pickupPlaceId?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropoffPlaceId?: string | null
  dropoffLatitude?: number | null
  dropoffLongitude?: number | null
}) => {
  const res = await api.post('/student-routes', data)
  return res.data
}

export const updateStudentRouteApi = async (data: { id: string } & Record<string, any>) => {
  const { id, ...payload } = data
  const res = await api.put(`/student-routes/${id}`, payload)
  return res.data
}

export const reassignStudentRouteApi = async (data: { id: string; vehicleId: string } & Record<string, any>) => {
  const { id, studentId: _studentId, ...payload } = data
  const res = await api.post(`/student-routes/${id}/reassign`, payload)
  return res.data
}

export const unassignStudentFromRouteApi = async (assignmentId: string) => {
  const res = await api.delete(`/student-routes/${assignmentId}/unassign`)
  return res.data
}

export const deleteStudentRouteApi = async (assignmentId: string) => {
  const res = await api.delete(`/student-routes/${assignmentId}`)
  return res.data
}
