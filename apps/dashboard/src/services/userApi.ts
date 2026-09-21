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

// Admin resets one account's access. The server picks the consequence from the
// account as it stands now; `expectedMode` only states which consequence the
// confirmation explained, so a stale dialog is refused rather than acted on.
export const resetUserAccessApi = async (
  userId: string,
  data: { reason: string; expectedMode: string },
) => {
  const res = await api.post(`/admin/access/users/${userId}/reset-access`, data);
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
