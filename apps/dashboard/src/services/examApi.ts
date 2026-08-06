import { api } from './http';

export const getExamsApi = async () => {
  const res = await api.get('/exams');
  return res.data;
};

export const getExamByIdApi = async (id: string) => {
  const res = await api.get(`/exams/${id}`);
  return res.data;
};

export const getTodayExamsApi = async () => {
  const res = await api.get('/exams/today');
  return res.data;
};

export const getUpcomingExamsApi = async () => {
  const res = await api.get('/exams/upcoming');
  return res.data;
};

export const getExamsBySectionApi = async (sectionId: string) => {
  const res = await api.get(`/exams/section/${sectionId}`);
  return res.data;
};

export const getExamsBySubjectApi = async (subjectId: string) => {
  const res = await api.get(`/exams/subject/${subjectId}`);
  return res.data;
};

export const getExamsByTeacherApi = async (teacherId: string) => {
  const res = await api.get(`/exams/teacher/${teacherId}`);
  return res.data;
};

export const createExamApi = async (data) => {
  const res = await api.post('/exams', data);
  return res.data;
};

export const updateExamApi = async (data) => {
  const res = await api.put(`/exams/${data.id}`, data);
  return res.data;
};

export const deleteExamApi = async (id: string) => {
  const res = await api.delete(`/exams/${id}`);
  return res.data;
};

export const deleteBulkExamsApi = async (ids: string[]) => {
  const res = await api.delete('/exams/bulk', { data: ids });
  return res.data;
};

export const deleteAllExamsApi = async () => {
  const res = await api.delete('/exams');
  return res.data;
};

export const seedDemoExamsApi = async (data) => {
  const res = await api.post('/exams/seed', data);
  return res.data;
};
