import type {
  CompetencyRenameScope, CompetencyYearLevels,
  CompetencyAssignment, CompetencyDomain, CompetencyEvaluation, CompetencyEvaluations, CompetencyLevel, CompetencyRemark, StudentCompetencySheet,
} from '@sms/contracts';
import { api } from './http';

export type CompetencySheet = StudentCompetencySheet & { subjects: Array<{ id: string; name: string }> };

export const getCompetencyAssignmentsApi = async (): Promise<{ data: CompetencyAssignment[] }> => {
  const res = await api.get('/competencies/assignments');
  return res.data;
};

export const getCompetencyCatalogApi = async (teacherAssignmentId: string): Promise<{ data: CompetencyDomain[] }> => {
  const res = await api.get('/competencies/catalog', { params: { teacherAssignmentId } });
  return res.data;
};

export const getCompetencyEvaluationsApi = async (teacherAssignmentId: string, month: string): Promise<{ data: CompetencyEvaluations }> => {
  const res = await api.get('/competencies/evaluations', { params: { teacherAssignmentId, month } });
  return res.data;
};

export const getStudentCompetencySheetApi = async (studentId: string, month: string, subjectId?: string): Promise<{ data: CompetencySheet }> => {
  const res = await api.get(`/competencies/student/${studentId}`, { params: { month, ...(subjectId ? { subjectId } : {}) } });
  return res.data;
};

export const getCompetencyYearLevelsApi = async (teacherAssignmentId: string): Promise<{ data: CompetencyYearLevels }> => {
  const res = await api.get('/competencies/year', { params: { teacherAssignmentId } });
  return res.data;
};

export type CompetencyNamePayload = { name: string; altName?: string | null };

/** A change to the list is made in the month on screen and applies from that month on. */
export const createCompetencyDomainApi = async (data: CompetencyNamePayload & { teacherAssignmentId: string; month: string }) => {
  const res = await api.post('/competencies/domains', data);
  return res.data;
};

export const updateCompetencyDomainApi = async (id: string, data: Partial<CompetencyNamePayload> & { position?: number }) => {
  const res = await api.put(`/competencies/domains/${id}`, data);
  return res.data;
};

export const deleteCompetencyDomainApi = async (id: string, month: string) => {
  const res = await api.delete(`/competencies/domains/${id}?month=${encodeURIComponent(month)}`);
  return res.data;
};

export const createCompetencyApi = async (data: CompetencyNamePayload & { domainId: string; month: string }) => {
  const res = await api.post('/competencies', data);
  return res.data;
};

export const updateCompetencyApi = async (id: string, data: Partial<CompetencyNamePayload> & {
  position?: number; domainId?: string; month?: string; scope?: CompetencyRenameScope;
}) => {
  const res = await api.put(`/competencies/${id}`, data);
  return res.data;
};

export const deleteCompetencyApi = async (id: string, month: string) => {
  const res = await api.delete(`/competencies/${id}?month=${encodeURIComponent(month)}`);
  return res.data;
};

export const copyCompetencyCatalogApi = async (fromAssignmentId: string, toAssignmentId: string): Promise<{ data: CompetencyDomain[] }> => {
  const res = await api.post('/competencies/copy', { fromAssignmentId, toAssignmentId });
  return res.data;
};

export type MoveCompetencyMonth = { teacherAssignmentId: string; fromMonth: string; toMonth: string };

/** Levels and remarks entered under the wrong month move to the right one; the server refuses a month that already has some. */
export const moveCompetencyMonthApi = async (data: MoveCompetencyMonth): Promise<{ data: MoveCompetencyMonth & { levels: number; remarks: number } }> => {
  const res = await api.post('/competencies/move-month', data);
  return res.data;
};

export type SetCompetencyLevel = Omit<CompetencyEvaluation, 'level'> & { level: CompetencyLevel | null };

export const setCompetencyLevelApi = async (data: SetCompetencyLevel) => {
  const res = await api.put('/competencies/evaluations', data);
  return res.data;
};

export type SetCompetencyRemark = { teacherAssignmentId: string; studentId: string; month: string; body: string };

/** An empty body removes the remark. */
export const setCompetencyRemarkApi = async (data: SetCompetencyRemark): Promise<{ data: CompetencyRemark }> => {
  const res = await api.put('/competencies/remarks', data);
  return res.data;
};

/** An empty list starts from the class and subject's proposed list. */
export const applyDefaultCompetencyListApi = async (teacherAssignmentId: string): Promise<{ data: CompetencyDomain[] }> => {
  const res = await api.post('/competencies/default', { teacherAssignmentId });
  return res.data;
};
