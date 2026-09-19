'use client'

import React from 'react';
import { NLanguageMenu, type NLanguageOption } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useUpdateLang } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import type { SchoolLanguage } from '@/preferences';

const languages = [
  { code: 'en', name: 'English', iso2: 'us' },
  { code: 'fr', name: 'Français', iso2: 'fr' },
  { code: 'es', name: 'Español', iso2: 'es' },
  { code: 'ar', name: 'العربية', iso2: 'ma' },
] satisfies Array<{ code: SchoolLanguage; name: string; iso2: string }>;

const options: Array<NLanguageOption<SchoolLanguage>> = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
  icon: (
    <span
      className={cn('fi', `fi-${lang.iso2}`, 'shrink-0 rounded-sm')}
      style={{ width: '1.25rem', height: '0.9375rem' }}
    />
  ),
}));

/**
 * Language Switcher Component
 *
 * The dropdown, the selected state and the pending state are Najm Kit's. The
 * transaction stays School's: `useUpdateLang` writes the authenticated
 * preference, changes the package language, refreshes the user, invalidates
 * School queries and raises its own toast.
 */
const LanguageSwitcher = () => {
  const { language } = useTranslation();
  const { updateLang, isLoading: isUpdatingLang } = useUpdateLang();

  return (
    <NLanguageMenu
      contentClassName="w-48"
      label="Change language"
      onChange={(next) => updateLang(next)}
      // `useUpdateLang` already presents its own failure; swallowing the
      // rejection here keeps it from being reported twice.
      onError={() => undefined}
      options={options}
      pending={isUpdatingLang}
      value={(language ?? 'en') as SchoolLanguage}
    />
  );
};

export default LanguageSwitcher;
