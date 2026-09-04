'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'najm-i18n/react';
import { schoolI18n } from '@sms/server/locales';
import { toast } from 'sonner';

import { auth } from '@/lib/auth';
import type { SchoolLanguage } from '@/preferences';
import { updateUserLangApi } from '@/services/userApi';

/**
 * Keeps School's authenticated database preference and the package-owned UI
 * cookie in sync. The client catalog changes only after the server update wins.
 */
export const useUpdateLang = () => {
  const queryClient = useQueryClient();
  const { t, changeLanguage } = useTranslation();

  const mutation = useMutation({
    mutationFn: (language: SchoolLanguage) => updateUserLangApi({ language }),
    onSuccess: async (resp: unknown, language: SchoolLanguage) => {
      await changeLanguage(language);
      await auth.client.fetchUser();
      queryClient.invalidateQueries({ queryKey: ['user', 'language'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const message =
        resp && typeof resp === 'object' && 'message' in resp
          ? (resp as { message?: unknown }).message
          : undefined;
      toast.success(
        typeof message === 'string'
          ? message
          : schoolI18n.translate(language, 'language.success.preferenceUpdated'),
      );
    },
    onError: () => {
      toast.error(t('common.updateLanguageFailed'));
    },
  });

  return {
    updateLang: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
};
