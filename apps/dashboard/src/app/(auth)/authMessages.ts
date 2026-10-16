import { z } from 'zod';

type T = (key: string) => string;

/**
 * The auth pages' schemas take `t`, so their validation reads in the page's
 * language instead of English.
 */
/** Min 8 matches the server's reset and credential-setup password rule. */
export const newPasswordSchema = (t: T) =>
  z.object({
    newPassword: z.string().min(8, { message: t('auth.validation.passwordMinLength') }),
    confirmPassword: z.string().min(8, { message: t('auth.validation.confirmPasswordRequired') }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('auth.validation.passwordsMismatch'),
    path: ['confirmPassword'],
  });

export const emailSchema = (t: T) => z.string().email({ message: t('auth.validation.emailInvalid') });

export const strongPasswordSchema = (t: T) =>
  z.string()
    .min(8, { message: t('auth.validation.passwordMinLength') })
    .regex(/[A-Z]/, { message: t('auth.validation.passwordUppercase') })
    .regex(/[a-z]/, { message: t('auth.validation.passwordLowercase') })
    .regex(/\d/, { message: t('auth.validation.passwordNumber') });

type AuthFailure = { status?: number; message?: string; body?: unknown; response?: { status?: number; data?: { message?: string; code?: string } } };

/**
 * najm-auth's client sends no `X-Language`, so the server answers its auth
 * routes in English. The statuses whose meaning is fixed are shown from the
 * catalog instead; any other refusal keeps the server's own explanation, and
 * a failure with none falls back to `fallbackKey`.
 */
export function authErrorMessage(
  error: unknown,
  t: T,
  fallbackKey: string,
  byStatus: Record<number, string> = {},
): string {
  const failure = (typeof error === 'object' && error !== null ? error : {}) as AuthFailure;
  const status = failure.status ?? failure.response?.status;
  const code = failure.response?.data?.code ?? (failure.body as { code?: string } | undefined)?.code;
  // A body that failed validation is the form's problem, not the token's.
  const statusKey = status !== undefined && code !== 'VALIDATION_BODY' ? byStatus[status] : undefined;
  if (statusKey) return t(statusKey);
  if (status === 429) return t('auth.errors.tooManyAttempts');
  return failure.response?.data?.message ?? failure.message ?? t(fallbackKey);
}
