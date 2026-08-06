import { api } from './http';

export const getGradesApi = async () => {
  const res = await api.get('/grades');
  return res.data;
};

export const getGradeByIdApi = async (id: string) => {
  const res = await api.get(`/grades/${id}`);
  return res.data;
};

export const getGradesByAssessmentApi = async (assessmentId: string) => {
  const res = await api.get(`/grades/assessment/${assessmentId}`);
  return res.data;
};

export const getGradesByExamApi = async (examId: string) => {
  const res = await api.get(`/grades/exam/${examId}`);
  return res.data;
};

export const getGradesByStudentApi = async (studentId: string) => {
  const res = await api.get(`/grades/student/${studentId}`);
  return res.data;
};

export const getStudentReportApi = async (studentId: string) => {
  const res = await api.get(`/grades/student/${studentId}/report`);
  return res.data;
};

export const getGradesBySectionApi = async (sectionId: string) => {
  const res = await api.get(`/grades/section/${sectionId}`);
  return res.data;
};

export const getGradesBySubjectApi = async (subjectId: string) => {
  const res = await api.get(`/grades/subject/${subjectId}`);
  return res.data;
};

export const getGradesByTeacherApi = async (teacherId: string) => {
  const res = await api.get(`/grades/teacher/${teacherId}`);
  return res.data;
};

export const createGradeApi = async (data) => {
  const res = await api.post('/grades', data);
  return res.data;
};

export const updateGradeApi = async (data) => {
  const res = await api.put(`/grades/${data.id}`, data);
  return res.data;
};

export const deleteGradeApi = async (id: string) => {
  const res = await api.delete(`/grades/${id}`);
  return res.data;
};

export const deleteBulkGradesApi = async (ids: string[]) => {
  const res = await api.delete('/grades/bulk', { data: ids });
  return res.data;
};

export const deleteAllGradesApi = async () => {
  const res = await api.delete('/grades');
  return res.data;
};
