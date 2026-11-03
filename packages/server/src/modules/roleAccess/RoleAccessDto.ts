import { z } from 'zod';
import { SIDEBAR_ENTRIES, SIDEBAR_ORDER_IDS } from '@sms/contracts/access-control';

const ids = z.array(z.string().min(1).max(128)).max(2000).refine(
  (values) => new Set(values).size === values.length,
  'Duplicate permission IDs',
);
export const roleAccessParam = z.object({ roleId: z.string().min(1).max(128) });
const sidebarOrder = z.array(z.enum(SIDEBAR_ORDER_IDS)).max(SIDEBAR_ORDER_IDS.length)
  .refine((values) => new Set(values).size === values.length, 'Duplicate sidebar order entries');
export const saveRoleAccessDto = z.object({
  permissionIds: ids,
  expectedPermissionIds: ids,
  sidebarKeys: z.array(z.enum(SIDEBAR_ENTRIES.map((entry) => entry[0]))).max(SIDEBAR_ENTRIES.length)
    .refine((values) => new Set(values).size === values.length, 'Duplicate sidebar entries').optional(),
  sidebarOrder: sidebarOrder.optional(),
  expectedSidebarOrder: sidebarOrder.optional(),
}).refine((body) => body.sidebarOrder === undefined || body.expectedSidebarOrder !== undefined, 'The original sidebar order is required');
export type SaveRoleAccessDto = z.infer<typeof saveRoleAccessDto>;
