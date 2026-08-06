import { api } from './http';

export const getBehaviorRewardsApi = async () => {
  const response = await api.get('/behavior-rewards');
  return response.data;
};

export const getBehaviorRewardByIdApi = async (id: string) => {
  const response = await api.get(`/behavior-rewards/${id}`);
  return response.data;
};

export const createBehaviorRewardApi = async (data: unknown) => {
  const response = await api.post('/behavior-rewards', data);
  return response.data;
};

export const updateBehaviorRewardApi = async (data: { id: string } & Record<string, unknown>) => {
  const { id, ...payload } = data;
  const response = await api.put(`/behavior-rewards/${id}`, payload);
  return response.data;
};

export const deleteBehaviorRewardApi = async (id: string) => {
  const response = await api.delete(`/behavior-rewards/${id}`);
  return response.data;
};
