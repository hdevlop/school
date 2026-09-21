'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetUserAccessApi } from '@/services/userApi';

export type AccessResetMode =
  | 'parent_credential_setup'
  | 'reset_email_sent'
  | 'invitation_resent';

export type AccessResetDelivery = 'sent' | 'simulated' | 'not_sent' | 'not_applicable';

export type ResetAccessVariables = {
  userId: string;
  reason: string;
  expectedMode: AccessResetMode;
};

export type ResetAccessResult = {
  userId: string;
  mode: AccessResetMode;
  delivery: AccessResetDelivery;
};

/**
 * The Users-table access reset command.
 *
 * It deliberately does not go through `useEntityCRUD`: that helper toasts a
 * generic success and refreshes only when the request succeeded, and neither
 * suits a command whose outcome can be "the provider accepted nothing" or "the
 * account moved under you". The dialog owns the messaging instead, and the
 * lists refresh on *both* paths — a refusal means the row the administrator
 * confirmed against was already stale, so the next attempt must be built from
 * the account as it now is.
 */
export const useResetUserAccess = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ userId, reason, expectedMode }: ResetAccessVariables) => {
      const response = await resetUserAccessApi(userId, { reason, expectedMode });
      return (response?.data ?? response) as ResetAccessResult;
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['operators'] }),
      ]);
    },
  });

  return {
    resetAccess: mutation.mutateAsync,
    isResettingAccess: mutation.isPending,
  };
};
