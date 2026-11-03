import { deleteFileByPathApi, uploadFileApi } from './fileApi';
import { api, formApi } from './http';

export const getUsersApi = async () => {
  // The API defaults to 50 accounts; NTable searches and paginates this list
  // locally, so stopping at the first API page hides the remaining accounts.
  const users: any[] = [];
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const res = await api.get('/users', { params: { limit, offset } });
    const page = res.data.data;
    users.push(...page);
    if (page.length < limit) return { ...res.data, data: users };
  }
};

/** Which logins belong to a student, a parent or a staff member; any other login has no person behind it. */
export const getAccountLinksApi = async (): Promise<{ userId: string; kind: 'student' | 'parent' | 'staff' }[]> => {
  const res = await api.get('/accounts/links');
  return res.data.data;
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

// najm-auth stores `image` as given, so a file sent with the account was saved
// as the text "[object File]". A changed photo goes to School's own route.
export const updateUserApi = async ({ image, ...data }) => {
  const res = await api.put(`/users/${data.id}`, data);
  if (image !== undefined) {
    const photo = await updateUserImageApi(data.id, image);
    return { ...res.data, data: { ...res.data?.data, ...photo.data } };
  }
  return res.data;
};

/** A new photo (a File), or null to remove it. */
export const updateUserImageApi = async (id: string, image: Blob | null) => {
  const res = await formApi.put(`/accounts/${id}/image`, { image });
  return res.data;
};

export const deleteUserApi = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

// The account a reset would act on: its role and status choose what the
// confirmation explains. Lets a staff or teacher row open the reset by user id.
export const getResetTargetApi = async (userId: string) => {
  const res = await api.get(`/admin/access/users/${userId}`);
  return res.data;
};

// Admin resets one account's access. The server picks the consequence from the
// account as it stands now; `expectedMode` only states which consequence the
// confirmation explained, so a stale dialog is refused rather than acted on.
export const resetUserAccessApi = async (
  userId: string,
  data: { reason?: string; expectedMode: string },
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
