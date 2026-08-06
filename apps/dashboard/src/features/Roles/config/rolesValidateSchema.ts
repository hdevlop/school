import { z } from 'zod'

export const roleValidationSchema = (t) => z.object({
    name: z.string().min(2, { message: t('roles.validation.nameMinLength') }),
    description: z.string().optional(),
});