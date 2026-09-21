import { z } from 'zod';

/**
 * The three consequences an administrator can be shown, and can confirm having
 * been shown. `expectedMode` repeats what the dialog explained; it never
 * selects the workflow. The server resolves the mode from freshly loaded
 * account state and refuses when the two disagree, so a stale row — or a
 * crafted request — cannot steer a parent into mail, or a student into a
 * credential replacement.
 */
export const ACCESS_RESET_MODES = [
  'parent_credential_setup',
  'reset_email_sent',
  'invitation_resent',
] as const;

export type AccessResetMode = (typeof ACCESS_RESET_MODES)[number];

/**
 * How the mail actually left, reported rather than assumed.
 *
 * `simulated` is a console/memory transport accepting the message: useful in
 * development, but nobody received an email, so it must never be presented as
 * delivery. `not_sent` is a failure the administrator has to retry.
 * `not_applicable` belongs to the CIN path, which sends nothing.
 */
export type AccessResetDelivery = 'sent' | 'simulated' | 'not_sent' | 'not_applicable';

export const accessResetUserParam = z.object({
  userId: z.string().min(1, 'A target user id is required'),
});

export const resetAccessDto = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'An administrative reason of at least 3 characters is required')
    .max(500, 'The administrative reason may not exceed 500 characters'),
  expectedMode: z.enum(ACCESS_RESET_MODES),
});

export type ResetAccessDto = z.infer<typeof resetAccessDto>;

export type AccessResetResult = {
  userId: string;
  mode: AccessResetMode;
  delivery: AccessResetDelivery;
};
