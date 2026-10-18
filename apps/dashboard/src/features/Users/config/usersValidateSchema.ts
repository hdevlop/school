import { z } from 'zod'

// Create = invite. The admin only provides identity + role; the user sets
// their own password via the emailed link, so no password fields here.
export const usersValidationSchema = (t) => z.object({
    name: z.string().min(2, { message: t('users.validation.nameMinLength') }),
    email: z.string().email({ message: t('users.validation.emailInvalid') }),
    roleId: z.string().min(1, { message: t('users.validation.roleRequired') }),
})

// Edit = identity, role and account status. Credentials are never set from here: an admin
// recovers an account with the Reset access action, which picks the right
// consequence, forces a replacement and leaves an audit record behind.
export const updateUsersValidationSchema = (t) => z.object({
    id: z.string().optional(),
    name: z.string().min(2, { message: t('users.validation.nameMinLength') }),
    email: z.string().email({ message: t('users.validation.emailInvalid') }),
    roleId: z.string().min(1, { message: t('users.validation.roleRequired') }),
    image: z.any().optional(),
    status: z.enum(['active', 'inactive', 'pending']),
})

// Keep the old exports for backward compatibility until all references are updated
export const createUserSchema = usersValidationSchema;
export const updateUserSchema = updateUsersValidationSchema;
