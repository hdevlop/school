import { api } from './http';

export const getFieldsApi = async () => {
  const res = await api.get('/fields');
  return res.data;
};

export const getFieldByIdApi = async (id) => {
  const res = await api.get(`/fields/${id}`);
  return res.data;
};

export const createFieldApi = async (data) => {
  const res = await api.post('/fields', data);
  return res.data;
};

export const updateFieldApi = async (data) => {
  const res = await api.put(`/fields/${data.id}`, data);
  return res.data;
};

export const deleteFieldApi = async (id) => {
  const res = await api.delete(`/fields/${id}`);
  return res.data;
};

export const getFieldCountApi = async () => {
  const res = await api.get('/fields/count');
  return res.data;
};

export const getTotalAreaApi = async () => {
  const res = await api.get('/fields/total-area');
  return res.data;
};

export const getFieldsBySizeApi = async () => {
  const res = await api.get('/fields/by-size');
  return res.data;
};

export const getLargeFieldsApi = async () => {
  const res = await api.get('/fields/large');
  return res.data;
};

export const getSmallFieldsApi = async () => {
  const res = await api.get('/fields/small');
  return res.data;
};

export const getFieldsWithActiveOperationsApi = async () => {
  const res = await api.get('/fields/active-operations');
  return res.data;
};

export const getFieldByNameApi = async (value) => {
  const res = await api.get(`/fields/name/${value}`);
  return res.data;
};

export const getFieldOperationsApi = async (fieldId) => {
  const res = await api.get(`/fields/${fieldId}/operations`);
  return res.data;
};

export const getFieldStatisticsApi = async (fieldId) => {
  const res = await api.get(`/fields/${fieldId}/statistics`);
  return res.data;
};

export const getFieldUtilizationApi = async (fieldId) => {
  const res = await api.get(`/fields/${fieldId}/utilization`);
  return res.data;
};
