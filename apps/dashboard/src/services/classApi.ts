import { api } from './http';

export const getClassesApi = async () => {
  const res = await api.get('/classes');
  return res.data;
};

export const getClassByIdApi = async (id: string) => {
  const res = await api.get(`/classes/${id}`);
  return res.data;
};

export const getClassStudentsApi = async (classId: string) => {
  const res = await api.get(`/classes/${classId}/students`);
  return res.data;
};

export const createClassApi = async (data: any) => {
  const res = await api.post('/classes', data);
  return res.data;
};

export const updateClassApi = async (data: any) => {
  const res = await api.put(`/classes/${data.id}`, data);
  return res.data;
};

export const deleteClassApi = async (id: string) => {
  const res = await api.delete(`/classes/${id}`);
  return res.data;
};
