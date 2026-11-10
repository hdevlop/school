import { api } from './http';

export const createTeacherRequestApi = async (data: Record<string, unknown>) => (await api.post('/teacher-requests', data)).data;
export const getTeacherRequestsApi = async () => (await api.get('/teacher-requests')).data;
export const rejectTeacherRequestApi = async (id: string) => (await api.delete(`/teacher-requests/${id}`)).data;
export const approveTeacherRequestApi = async (id: string) => (await api.post(`/teacher-requests/${id}/approve`)).data;
