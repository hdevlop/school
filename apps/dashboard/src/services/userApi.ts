import { deleteFileByPathApi, uploadFileApi } from './fileApi';
import { api, formApi } from './http';

export const getUsersApi = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const getUserByIdApi = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

export const createUserApi = async (data) => {
  const res = await formApi.post('/users', data);
  return res.data;
};

// Admin invites a user: creates the account and emails a set-password link.
// No password is sent — the invitee chooses their own.
export const inviteUserApi = async (data) => {
  const res = await api.post('/auth/invite', data);
  return res.data;
};

export const updateUserApi = async (data) => {
  const res = await formApi.put(`/users/${data.id}`, data);
  return res.data;
};

export const deleteUserApi = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export const updateUserLangApi = async ({ language }) => {
  const res = await api.post(`/users/lang/${language}`);
  return res.data;
};

export const getUserLangApi = async () => {
  const res = await api.get('/users/lang');
  return res.data;
};

export const uploadUserImageApi = async (userId, image) => {
  const file = Object.assign(image, {
    entityType: 'user',
    entityId: userId
  });
  return await uploadFileApi(file);
};

export const deleteUserImageApi = async (imagePath) => {
  return await deleteFileByPathApi(imagePath);
};
