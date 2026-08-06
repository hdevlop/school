import { api, formApi } from './http'

export const getTeachersApi = async () => {
  const res = await api.get('/teachers')
  return res.data
}

export const getTeacherByIdApi = async (id) => {
  const res = await api.get(`/teachers/${id}`)
  return res.data
}

export const getTeacherByEmailApi = async (email) => {
  const res = await api.get(`/teachers/email/${email}`)
  return res.data
}

export const getTeacherByCinApi = async (cin) => {
  const res = await api.get(`/teachers/cin/${cin}`)
  return res.data
}

export const getTeacherClassesApi = async (id) => {
  const res = await api.get(`/teachers/${id}/classes`)
  return res.data
}

export const getTeacherTeachersApi = async (id) => {
  const res = await api.get(`/teachers/${id}/teachers`)
  return res.data
}

export const createTeacherApi = async (data) => {
  const res = await formApi.post('/teachers', data)
  return res.data
}

export const updateTeacherApi = async (data) => {
  const res = await formApi.put(`/teachers/${data.id}`, data);
  return res.data;
};

export const deleteTeacherApi = async (id) => {
  const res = await api.delete(`/teachers/${id}`)
  return res.data
}

export const createBulkTeachersApi = async (data) => {
  const res = await api.post('/teachers/bulk', data);
  return res.data;
};

export const deleteBulkTeachersApi = async (data) => {
  const res = await api.delete('/teachers/bulk', { data });
  return res.data;
};
