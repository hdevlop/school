import { api } from './http';

export const getRewardTemplatesApi = async () => {
  const response = await api.get('/behavior-reward-templates');
  return response.data;
};

export const getRewardTemplateByIdApi = async (id: string) => {
  const response = await api.get(`/behavior-reward-templates/${id}`);
  return response.data;
};

export const createRewardTemplateApi = async (data: unknown) => {
  const response = await api.post('/behavior-reward-templates', data);
  return response.data;
};

export const updateRewardTemplateApi = async (data: { id: string } & Record<string, unknown>) => {
  const { id, ...payload } = data;
  const response = await api.put(`/behavior-reward-templates/${id}`, payload);
  return response.data;
};

export const deleteRewardTemplateApi = async (id: string) => {
  const response = await api.delete(`/behavior-reward-templates/${id}`);
  return response.data;
};
