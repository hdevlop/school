import { z } from 'zod';

/** What a device sends in its query: its serial number and, on uploads, the table. */
export const admsQueryDto = z.object({
  SN: z.string().max(64).optional(),
  table: z.string().max(32).optional(),
});

export const deviceUserIdParam = z.object({
  deviceUserId: z.string().regex(/^[A-Za-z0-9]{1,24}$/u, 'validationMessages.deviceUserIdInvalid'),
});

/** The staff member a device PIN belongs to; null unlinks it. */
export const linkDeviceUserDto = z.object({
  staffId: z.string().min(1).max(64).nullable(),
});

export type AdmsQueryDto = z.infer<typeof admsQueryDto>;
export type LinkDeviceUserDto = z.infer<typeof linkDeviceUserDto>;
