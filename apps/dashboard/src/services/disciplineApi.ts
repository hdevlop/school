import { api } from './http';

export const getDisciplineApi = async () => (await api.get('/discipline')).data;
export const getDisciplineByIdApi = async (id: string) => (await api.get(`/discipline/${id}`)).data;
export const createDisciplineApi = async (data: unknown) => (await api.post('/discipline', data)).data;
export const updateDisciplineApi = async (data: any) => {
  const { id, ...body } = data;
  return (await api.put(`/discipline/${id}`, body)).data;
};
export const resolveDisciplineApi = async (data: any) => {
  const { id, ...body } = data;
  return (await api.post(`/discipline/${id}/resolve`, body)).data;
};
export const reopenDisciplineApi = async (id: string) => (await api.post(`/discipline/${id}/reopen`)).data;
export const deleteDisciplineApi = async (id: string) => (await api.delete(`/discipline/${id}`)).data;
