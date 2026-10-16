'use client'

import React from 'react';
import { NLanguageMenu } from 'najm-kit';
import { useTranslation } from 'najm-i18n/react';
import { useUpdateLang } from '../hooks/useUpdateLang';
import { languageOptions } from '@/shared/languageOptions';
import type { SchoolLocale } from '@sms/contracts/locales';

/**
 * Language Switcher Component
 *
 * The dropdown, the selected state and the pending state are Najm Kit's. The
 * transaction stays School's: `useUpdateLang` writes the authenticated
 * preference, changes the package language, refreshes the user, invalidates
 * School queries and raises its own toast.
 */
const LanguageSwitcher = () => {
  const { language, t } = useTranslation();
  const { updateLang, isLoading: isUpdatingLang } = useUpdateLang();

  return (
    <NLanguageMenu
      contentClassName="w-48"
      label={t('navigation.changeLanguage')}
      onChange={(next) => updateLang(next)}
      // `useUpdateLang` already presents its own failure; swallowing the
      // rejection here keeps it from being reported twice.
      onError={() => undefined}
      options={languageOptions}
      pending={isUpdatingLang}
      value={(language ?? 'en') as SchoolLocale}
    />
  );
};

export default LanguageSwitcher;
