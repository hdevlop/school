'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TranslationParams } from 'najm-i18n';
import { useTranslation as useNajmTranslation } from 'najm-i18n/react';
import translations from '@sms/server/locales';
import { toast } from 'sonner';

import { auth } from '@/lib/auth';
import { updateUserLangApi } from '@/services/userApi';
import { SCHOOL_DEFAULT_LANGUAGE, type SchoolLanguage } from '@/preferences';

/**
 * Facade over `najm-i18n/react`.
 *
 * The catalog, the active language, and the translator all come from the
 * `I18nProvider` that `NajmAppProvider` mounts — there is one translation
 * source. This file survives only so School's ~200 existing `useTranslation`
 * call sites keep working, and to preserve one behavior the package
 * deliberately does not have: a per-key fallback to English.
 *
 * `najm-i18n` echoes a missing key by design, so that the gap is visible rather
 * than papered over. School ships four locales built from one source catalog,
 * and a key added to `en.json` before its translations land would otherwise
 * render as `staff.form.shift` in the UI. Falling back to English keeps the
 * screen readable; the `i18n:check` script is what makes the gap visible.
 */
const getNestedValue = (obj: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[key]
          : undefined,
      obj,
    );

/**
 * Wider than `najm-i18n`'s `TranslationParams` on purpose.
 *
 * School's call sites pass whatever they have — a Date, a computed object, a
 * row — and every interpolation ends in `String(value)` regardless. Narrowing
 * the facade would be a type-only change to ~200 unrelated files that buys
 * nothing at runtime.
 */
type SchoolTranslationParams = Record<string, unknown>;

const interpolate = (template: string, params: SchoolTranslationParams) =>
  template.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (placeholder, double, single) => {
    const name = double ?? single;
    return name && name in params ? String(params[name]) : placeholder;
  });

export const useTranslation = () => {
  const { t: translate, language, changeLanguage, languages } = useNajmTranslation();

  const t = (key: string, params: SchoolTranslationParams | null = null) => {
    const translated = translate(key, (params ?? undefined) as TranslationParams | undefined);
    if (translated !== key) return translated;

    const fallback = getNestedValue(
      (translations as Record<string, unknown>)[SCHOOL_DEFAULT_LANGUAGE],
      key,
    );
    if (typeof fallback !== 'string') return translated;
    return params ? interpolate(fallback, params) : fallback;
  };

  return { t, language: language as SchoolLanguage, changeLanguage, languages };
};

/**
 * Changes the language in both places it lives.
 *
 * The database row is the durable preference and the cookie is the immediate
 * render preference, so both are written: `changeLanguage` swaps the client
 * catalog and POSTs the cookie through the provider's language endpoint, while
 * `updateUserLangApi` goes through School's existing authenticated service.
 *
 * The catalog swap happens after the server accepts the change, so a rejected
 * update does not leave the UI in a language the account is not actually set to.
 */
export const useUpdateLang = () => {
  const queryClient = useQueryClient();
  const { t, changeLanguage } = useTranslation();

  const mutation = useMutation({
    mutationFn: (language: string) => updateUserLangApi({ language }),
    onSuccess: async (resp: any, language: string) => {
      await changeLanguage(language);
      await auth.client.fetchUser();
      queryClient.invalidateQueries({ queryKey: ['user', 'language'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const targetTranslations = (translations as Record<string, unknown>)[language]
        ?? (translations as Record<string, unknown>)[SCHOOL_DEFAULT_LANGUAGE];
      const fallbackMessage =
        (getNestedValue(targetTranslations, 'language.success.preferenceUpdated') as
          | string
          | undefined)
        ?? t('language.success.preferenceUpdated');

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
