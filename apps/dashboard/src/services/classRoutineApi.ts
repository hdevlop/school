import { api } from './http';

export const getRoutinePeriodsApi = async () => (await api.get('/class-routines/periods')).data;
export const createRoutinePeriodApi = async (data) => (await api.post('/class-routines/periods', data)).data;
export const updateRoutinePeriodApi = async ({ id, ...data }) => (await api.put(`/class-routines/periods/${id}`, data)).data;

export const getClassRoutinesApi = async (params = {}) =>
  (await api.get('/class-routines', { params })).data;
export const getClassRoutineApi = async (id) => (await api.get(`/class-routines/${id}`)).data;
export const createClassRoutineApi = async (data) => (await api.post('/class-routines', data)).data;
export const updateClassRoutineApi = async ({ id, ...data }) => (await api.put(`/class-routines/${id}`, data)).data;
export const updateRoutineLayoutApi = async ({ id, ...data }) => (await api.put(`/class-routines/${id}/layout`, data)).data;
export const deleteClassRoutineApi = async (id) => (await api.delete(`/class-routines/${id}`)).data;
export const publishClassRoutineApi = async (id) => (await api.post(`/class-routines/${id}/publish`)).data;
export const archiveClassRoutineApi = async (id) => (await api.post(`/class-routines/${id}/archive`)).data;

export const getRoutineAssignmentsApi = async (sectionId) =>
  (await api.get(`/class-routines/assignments/${sectionId}`)).data;
export const getRoutineDutyCandidatesApi = async () =>
  (await api.get('/class-routines/duty-candidates')).data;
export const createRoutineEntryApi = async ({ scheduleId, ...data }) =>
  (await api.post(`/class-routines/${scheduleId}/entries`, data)).data;
export const updateRoutineEntryApi = async ({ scheduleId, id, ...data }) =>
  (await api.put(`/class-routines/${scheduleId}/entries/${id}`, data)).data;
export const deleteRoutineEntryApi = async ({ scheduleId, id }) =>
  (await api.delete(`/class-routines/${scheduleId}/entries/${id}`)).data;
export const createRoutineDutyApi = async ({ scheduleId, ...data }) =>
  (await api.post(`/class-routines/${scheduleId}/duties`, data)).data;
export const updateRoutineDutyApi = async ({ scheduleId, id, ...data }) =>
  (await api.put(`/class-routines/${scheduleId}/duties/${id}`, data)).data;
export const deleteRoutineDutyApi = async ({ scheduleId, id }) =>
  (await api.delete(`/class-routines/${scheduleId}/duties/${id}`)).data;

export const getTeacherRoutineApi = async (teacherId, academicYear?: string) =>
  (await api.get(`/class-routines/teachers/${teacherId}`, { params: { academicYear } })).data;
