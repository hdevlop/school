import { updateUserLangApi } from '@/services/userApi';
import { useAuth } from 'najm-auth/client/react';
import { auth } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import translations from '@sms/server/locales';
import { toast } from 'sonner';

const getNestedValue = (obj, path) => {
   return path.split('.').reduce((current, key) => current?.[key], obj);
};

export const useTranslation = () => {
   const { user } = useAuth();
   const language = (user as any)?.language || 'en';

   const t = (key, params = null) => {
      const langTranslations = translations[language] || translations['en'];
      let translation =
         getNestedValue(langTranslations, key) ||
         getNestedValue(translations['en'], key) ||
         key;

      if (params && typeof translation === 'string') {
         Object.entries(params).forEach(([param, value]) => {
            translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
         });
      }

      return translation;
   };

   return { t, language };
};

export const useUpdateLang = () => {
   const queryClient = useQueryClient();
   const { t } = useTranslation();

   const mutation = useMutation({
      mutationFn: (language: string) => updateUserLangApi({ language }),
      onSuccess: async (resp: any, language: string) => {
         await auth.client.fetchUser();
         queryClient.invalidateQueries({ queryKey: ['user', 'language'] });
         queryClient.invalidateQueries({ queryKey: ['dashboard'] });

         const targetTranslations = translations[language] || translations['en'];
         const fallbackMessage =
            getNestedValue(targetTranslations, 'language.success.preferenceUpdated') ||
            t('language.success.preferenceUpdated');

         toast.success(resp?.message || fallbackMessage);
      },
      onError: () => {
         toast.error('Failed to update language');
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
