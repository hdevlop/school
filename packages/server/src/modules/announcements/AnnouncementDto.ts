import { z } from 'zod';
import { optionalId } from '@server/shared/fields';

const announcementSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content too long'),
  authorId: optionalId,
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents', 'class']),
  classId: optionalId,
  classIds: z.array(z.string().min(1)).min(1, 'Select at least one class').optional(),
  publishDate: z.string().datetime('Invalid publish date').optional(),
  expiryDate: z.string().datetime('Invalid expiry date').optional(),
});

export const createAnnouncementDto = announcementSchema.refine((data) =>
  data.targetAudience !== 'class' || Boolean(data.classId) || Boolean(data.classIds?.length), {
  message: 'Select at least one class for class announcements',
  path: ['classIds'],
});
export const updateAnnouncementDto = announcementSchema.partial();
export const announcementIdParam = z.object({ id: z.string().min(1) });
export const announcementAuthorIdParam = z.object({ authorId: z.string().min(1) });
export const announcementTargetAudienceParam = z.object({
  targetAudience: announcementSchema.shape.targetAudience,
});
export const announcementClassIdParam = z.object({ classId: z.string().min(1) });
export const activeAnnouncementQueryDto = z.object({
  classId: optionalId,
});

export const createAnnouncementsBulkDto = z.array(createAnnouncementDto);
export const deleteBulkAnnouncementDto = z.array(z.string().min(1));

export type CreateAnnouncementDto = z.input<typeof createAnnouncementDto>;
export type UpdateAnnouncementDto = z.input<typeof updateAnnouncementDto>;
export type ActiveAnnouncementQueryDto = z.infer<typeof activeAnnouncementQueryDto>;
export type CreateAnnouncementsBulkDto = z.input<typeof createAnnouncementsBulkDto>;
export type DeleteBulkAnnouncementDto = z.infer<typeof deleteBulkAnnouncementDto>;
