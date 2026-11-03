import { api } from './http';

export const getInsuranceRegisterApi = async () => {
  const response = await api.get('/insurance');
  return response.data;
};
