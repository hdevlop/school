import { api } from './http';
export const getVisitRequestsApi = async () => (await api.get('/visit-requests')).data;
export const updateVisitRequestApi = async ({ id, ...input }: { id: string; status: string; staffNote?: string | null }) => (await api.put(`/visit-requests/${id}`, input)).data;
