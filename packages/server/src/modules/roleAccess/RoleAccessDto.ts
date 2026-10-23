import { z } from 'zod';
import { SIDEBAR_ENTRIES } from '@sms/contracts/access-control';

const ids = z.array(z.string().min(1).max(128)).max(2000).refine(
  (values) => new Set(values).size === values.length,
  'Duplicate permission IDs',
);
export const roleAccessParam = z.object({ roleId: z.string().min(1).max(128) });
export const saveRoleAccessDto = z.object({
  permissionIds: ids,
  expectedPermissionIds: ids,
  sidebarKeys: z.array(z.enum(SIDEBAR_ENTRIES.map((entry) => entry[0]))).max(SIDEBAR_ENTRIES.length)
    .refine((values) => new Set(values).size === values.length, 'Duplicate sidebar entries').optional(),
});
export type SaveRoleAccessDto = z.infer<typeof saveRoleAccessDto>;
