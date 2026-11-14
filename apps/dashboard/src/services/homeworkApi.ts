import type { HomeworkAttachment, HomeworkRow } from '@sms/contracts';
import { api, fileRequest, formApi } from './http';

export type HomeworkPayload = {
  id?: string;
  sectionIds: string[];
  subjectId: string;
  subSubject?: string | null;
  teacherId?: string;
  title: string;
  content?: string | null;
  date: string;
  dueOn?: string | null;
};

export const getHomeworkApi = async (): Promise<{ data: HomeworkRow[] }> => {
  const res = await api.get('/homework');
  return res.data;
};

export const getHomeworkByIdApi = async (id: string): Promise<{ data: HomeworkRow }> => {
  const res = await api.get(`/homework/${id}`);
  return res.data;
};

/** The parts a subject is taught as in a class or its sections: Massar's that year, or the subject's own. */
export const getHomeworkPartsApi = async (query: { subjectId: string; classId?: string; sectionIds?: string[] }): Promise<{ data: string[] }> => {
  const res = await api.get('/homework/parts', {
    params: {
      subjectId: query.subjectId,
      ...(query.sectionIds?.length ? { sectionIds: query.sectionIds.join(',') } : { classId: query.classId }),
    },
  });
  return res.data;
};

export const getStudentHomeworkApi =async (studentId: string): Promise<{ data: HomeworkRow[] }> => {
  const res = await api.get(`/homework/student/${studentId}`);
  return res.data;
};

export const createHomeworkApi = async (data: HomeworkPayload): Promise<{ data: HomeworkRow }> => {
  const res = await api.post('/homework', data);
  return res.data;
};

export const updateHomeworkApi = async (data: HomeworkPayload & { id: string }): Promise<{ data: HomeworkRow }> => {
  const res = await api.put(`/homework/${data.id}`, data);
  return res.data;
};

export const deleteHomeworkApi = async (id: string) => {
  const res = await api.delete(`/homework/${id}`);
  return res.data;
};

/** One multipart request; the server refuses all of the files if it refuses one. */
export const addHomeworkAttachmentsApi = async (id: string, files: File[]): Promise<{ data: HomeworkAttachment[] }> => {
  const res = await formApi.post(`/homework/${id}/attachments`, Object.fromEntries(files.map((file, index) => [`file${index}`, file])));
  return res.data;
};

export const removeHomeworkAttachmentApi = async (id: string, attachmentId: string) => {
  const res = await api.delete(`/homework/${id}/attachments/${attachmentId}`);
  return res.data;
};

/**
 * The file itself. Read through the HTTP client rather than an <img> URL: the
 * route asks for the sign-in token and the selected school year, which a
 * plain image request does not carry.
 */
export const getHomeworkAttachmentBlobApi = async (id: string, attachmentId: string): Promise<Blob> => {
  const response = await fileRequest('GET', `/homework/${id}/attachments/${attachmentId}`);
  return response.blob();
};

export const acknowledgeHomeworkApi = async (id: string, studentId: string): Promise<{ data: { homeworkId: string; studentId: string; seenAt: string | null } }> => {
  const res = await api.post(`/homework/${id}/acknowledge`, { studentId });
  return res.data;
};
