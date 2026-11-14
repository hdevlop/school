import { z } from 'zod';
import { HOMEWORK_LIMITS as limits } from '@sms/contracts';
import { optionalDateField, optionalId, requiredId } from '../../shared/fields';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const homeworkSchema = z.object({
  sectionIds: z.array(requiredId).min(1, 'Select at least one section').max(50),
  subjectId: requiredId,
  // The part of the subject, by name, among those offered for the class
  // (GET /homework/parts); null takes it off.
  subSubject: z.string().trim().max(120).nullish(),
  // Read for a school-wide author only; a teacher always posts as themselves.
  teacherId: optionalId,
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(limits.title, 'Title too long'),
  content: z.string().trim().max(limits.content, 'homework.errors.contentTooLong').nullish(),
  date: isoDate,
  dueOn: optionalDateField,
  assessmentId: optionalId,
});

const dueAfterGiven = (data: { date?: string; dueOn?: string | null }) =>
  !data.date || !data.dueOn || data.dueOn >= data.date;
const dueMessage = { message: 'homework.errors.dueBeforeGiven', path: ['dueOn'] };

export const createHomeworkDto = homeworkSchema.refine(dueAfterGiven, dueMessage);
export const updateHomeworkDto = homeworkSchema.partial().refine(dueAfterGiven, dueMessage);

export const homeworkIdParam = z.object({ id: z.string().min(1) });
export const homeworkAttachmentParams = z.object({ id: z.string().min(1), attachmentId: z.string().min(1) });
/** A class, or sections of one: `sectionIds` comma-separated, as a query string carries it. */
export const homeworkPartsQuery = z.object({
  subjectId: requiredId,
  classId: z.string().min(1).optional(),
  sectionIds: z.string().optional()
    .transform((value) => (value ? value.split(',').map((id) => id.trim()).filter(Boolean) : [])),
}).refine((query) => query.classId || query.sectionIds.length, { message: 'Class is required', path: ['classId'] });
export const homeworkSectionParam =z.object({ sectionId: z.string().min(1) });
export const homeworkStudentParam = z.object({ studentId: z.string().min(1) });
/** The validation plugin restores the uploaded File fields into the body. */
export const homeworkUploadDto = z.object({});
export const acknowledgeHomeworkDto = z.object({ studentId: requiredId });

export type CreateHomeworkDto = z.infer<typeof createHomeworkDto>;
export type UpdateHomeworkDto = z.infer<typeof updateHomeworkDto>;
export type HomeworkPartsQuery = z.infer<typeof homeworkPartsQuery>;
export type AcknowledgeHomeworkDto =z.infer<typeof acknowledgeHomeworkDto>;
