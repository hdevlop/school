import { api, formApi } from './http';

export const getFeeTypesApi = async () => {
  const res = await api.get('/fee-types');
  return res.data;
};

export const getFeeTypeByIdApi = async (id) => {
  const res = await api.get(`/fee-types/${id}`);
  return res.data;
};

export const createFeeTypeApi = async (data) => {
  const res = await formApi.post('/fee-types', data);
  return res.data;
};

export const updateFeeTypeApi = async (data) => {
  const res = await formApi.put(`/fee-types/${data.id}`, data);
  return res.data;
};

export const deleteFeeTypeApi = async (id) => {
  const res = await api.delete(`/fee-types/${id}`);
  return res.data;
};
