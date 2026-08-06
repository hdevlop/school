import { api, formApi } from './http'

export const getParentsApi = async () => {
  const res = await api.get('/parents')
  return res.data
}

export const getParentByIdApi = async (id) => {
  const res = await api.get(`/parents/${id}`)
  return res.data
}

export const getParentByEmailApi = async (email) => {
  const res = await api.get(`/parents/email/${email}`)
  return res.data
}

export const getParentByCinApi = async (cin) => {
  const res = await api.get(`/parents/cin/${cin}`)
  return res.data
}

export const getParentByPhoneApi = async (phone) => {
  const res = await api.get(`/parents/phone/${phone}`)
  return res.data
}

export const searchParentsApi = async (query) => {
  const res = await api.get(`/parents/search?q=${query}`)
  return res.data
}

export const getParentChildrenApi = async (parentId) => {
  const res = await api.get(`/parents/${parentId}/children`)
  return res.data
}

export const createParentApi = async (data) => {
  const res = await formApi.post('/parents', data)
  return res.data
}

export const linkStudentApi = async (parentId, studentId) => {
  const res = await api.post(`/parents/${parentId}/link-student`, { studentId })
  return res.data
}

export const updateParentApi = async (data) => {
  const res = await formApi.put(`/parents/${data.id}`, data);
  return res.data;
};

export const deleteParentApi = async (id) => {
  const res = await api.delete(`/parents/${id}`)
  return res.data
}

export const unlinkStudentApi = async (parentId, studentId) => {
  const res = await api.delete(`/parents/${parentId}/unlink-student/${studentId}`)
  return res.data
}

export const deleteAllParentsApi = async () => {
  const res = await api.delete('/parents')
  return res.data
}

export const createBulkParentsApi = async (data) => {
  const res = await api.post('/parents/bulk', data);
  return res.data;
};

export const deleteBulkParentsApi = async (data) => {
  const payload = Array.isArray(data) ? { ids: data } : data;
  const res = await api.delete('/parents/bulk', { data: payload });
  return res.data;
};
