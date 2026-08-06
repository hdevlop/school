import { api } from './http';

export const getAssessmentsApi = async () => {
  const res = await api.get('/assessments');
  return res.data;
};

export const getAssessmentByIdApi = async (id: string) => {
  const res = await api.get(`/assessments/${id}`);
  return res.data;
};

export const getTodayAssessmentsApi = async () => {
  const res = await api.get('/assessments/today');
  return res.data;
};

export const getUpcomingAssessmentsApi = async () => {
  const res = await api.get('/assessments/upcoming');
  return res.data;
};

export const getDueThisWeekAssessmentsApi = async () => {
  const res = await api.get('/assessments/due-this-week');
  return res.data;
};

export const getOverdueAssessmentsApi = async () => {
  const res = await api.get('/assessments/overdue');
  return res.data;
};

export const getAssessmentsByClassApi = async (classId: string) => {
  const res = await api.get(`/assessments/class/${classId}`);
  return res.data;
};

export const getAssessmentsBySectionApi = async (sectionId: string) => {
  const res = await api.get(`/assessments/section/${sectionId}`);
  return res.data;
};

export const getAssessmentsBySubjectApi = async (subjectId: string) => {
  const res = await api.get(`/assessments/subject/${subjectId}`);
  return res.data;
};

export const getAssessmentsByTeacherApi = async (teacherId: string) => {
  const res = await api.get(`/assessments/teacher/${teacherId}`);
  return res.data;
};

export const createAssessmentApi = async (data) => {
  const res = await api.post('/assessments', data);
  return res.data;
};

export const updateAssessmentApi = async (data) => {
  const res = await api.put(`/assessments/${data.id}`, data);
  return res.data;
};

export const deleteAssessmentApi = async (id: string) => {
  const res = await api.delete(`/assessments/${id}`);
  return res.data;
};

export const deleteBulkAssessmentsApi = async (ids: string[]) => {
  const res = await api.delete('/assessments/bulk', { data: ids });
  return res.data;
};

export const deleteAllAssessmentsApi = async () => {
  const res = await api.delete('/assessments');
  return res.data;
};

export const seedDemoAssessmentsApi = async (data) => {
  const res = await api.post('/assessments/seed', data);
  return res.data;
};
