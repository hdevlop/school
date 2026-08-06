import { api } from './http';

export const getSectionsApi = async () => {
  const res = await api.get('/sections');
  return res.data;
};

export const getSectionByIdApi = async (id) => {
  const res = await api.get(`/sections/${id}`);
  return res.data;
};

export const getSectionByCodeApi = async (code) => {
  const res = await api.get(`/sections/code/${code}`);
  return res.data;
};

export const getSectionsByGradeLevelApi = async (gradeLevel) => {
  const res = await api.get(`/sections/grade/${gradeLevel}`);
  return res.data;
};

export const getSectionsByAcademicYearApi = async (academicYear) => {
  const res = await api.get(`/sections/academic-year/${academicYear}`);
  return res.data;
};

export const getSectionsByStatusApi = async (status) => {
  const res = await api.get(`/sections/status/${status}`);
  return res.data;
};

export const getSectionsCountApi = async () => {
  const res = await api.get('/sections/count');
  return res.data;
};

export const createSectionApi = async (data) => {
  const res = await api.post('/sections', data);
  return res.data;
};

export const updateSectionApi = async (data) => {
  const res = await api.put(`/sections/${data.id}`, data);
  return res.data;
};

export const deleteSectionApi = async (id) => {
  const res = await api.delete(`/sections/${id}`);
  return res.data;
};

export const getSectionClassesApi = async (id) => {
  const res = await api.get(`/sections/${id}/classes`);
  return res.data;
};

export const getSectionStudentsApi = async (id) => {
  const res = await api.get(`/sections/${id}/students`);
  return res.data;
};

export const getSectionTeachersApi = async (id) => {
  const res = await api.get(`/sections/${id}/teachers`);
  return res.data;
};

export const getSectionAnalyticsApi = async (id) => {
  const res = await api.get(`/sections/${id}/analytics`);
  return res.data;
};

export const seedDemoSectionsApi = async (data) => {
  const res = await api.post('/sections/seed', data);
  return res.data;
};

export const deleteAllSectionsApi = async () => {
  const res = await api.delete('/sections');
  return res.data;
};
