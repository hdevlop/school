import { z } from 'zod'

export const permissionValidationSchema = (t) => z.object({
    name: z.string().min(2, { message: t('permissions.validation.nameRequired') }),
    resource: z.string().min(1, { message: t('permissions.validation.resourceRequired') }),
    action: z.string().min(1, { message: t('permissions.validation.actionRequired') }),
    description: z.string().optional(),
});
