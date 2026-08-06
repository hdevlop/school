import { api } from './http';

export const getAnnouncementsApi = async () => {
  const res = await api.get('/announcements');
  return res.data;
};

export const getAnnouncementByIdApi = async (id: string) => {
  const res = await api.get(`/announcements/${id}`);
  return res.data;
};

export const getPublishedAnnouncementsApi = async () => {
  const res = await api.get('/announcements/published');
  return res.data;
};

export const getUpcomingAnnouncementsApi = async () => {
  const res = await api.get('/announcements/upcoming');
  return res.data;
};

export const getExpiredAnnouncementsApi = async () => {
  const res = await api.get('/announcements/expired');
  return res.data;
};

export const getAnnouncementStatsApi = async () => {
  const res = await api.get('/announcements/stats');
  return res.data;
};

export const getRecentAnnouncementsApi = async () => {
  const res = await api.get('/announcements/recent');
  return res.data;
};

export const getAnnouncementsByAuthorApi = async (authorId: string) => {
  const res = await api.get(`/announcements/author/${authorId}`);
  return res.data;
};

export const getAnnouncementsByAudienceApi = async (targetAudience: string) => {
  const res = await api.get(`/announcements/audience/${targetAudience}`);
  return res.data;
};

export const getAnnouncementsByClassApi = async (classId: string) => {
  const res = await api.get(`/announcements/class/${classId}`);
  return res.data;
};

export const createAnnouncementApi = async (data) => {
  const res = await api.post('/announcements', data);
  return res.data;
};

export const updateAnnouncementApi = async (data) => {
  const res = await api.put(`/announcements/${data.id}`, data);
  return res.data;
};

export const publishAnnouncementApi = async (id: string) => {
  const res = await api.post(`/announcements/${id}/publish`);
  return res.data;
};

export const unpublishAnnouncementApi = async (id: string) => {
  const res = await api.post(`/announcements/${id}/unpublish`);
  return res.data;
};

export const deleteAnnouncementApi = async (id: string) => {
  const res = await api.delete(`/announcements/${id}`);
  return res.data;
};

export const deleteBulkAnnouncementsApi = async (ids: string[]) => {
  const res = await api.delete('/announcements/bulk', { data: ids });
  return res.data;
};

export const deleteAllAnnouncementsApi = async () => {
  const res = await api.delete('/announcements');
  return res.data;
};

export const seedDemoAnnouncementsApi = async (data) => {
  const res = await api.post('/announcements/seed', data);
  return res.data;
};
