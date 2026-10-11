import React from 'react';
import { cn, type NLanguageOption } from 'najm-kit';
import type { SchoolLocale } from '@sms/contracts/locales';

const languages = [
  { code: 'en', name: 'English', iso2: 'us' },
  { code: 'fr', name: 'Français', iso2: 'fr' },
  { code: 'es', name: 'Español', iso2: 'es' },
  { code: 'ar', name: 'العربية', iso2: 'ma' },
] satisfies Array<{ code: SchoolLocale; name: string; iso2: string }>;

/**
 * The language menu entries, each with its flag. Shared by the dashboard
 * header and the public landing page so both offer the same list.
 */
export const languageOptions: Array<NLanguageOption<SchoolLocale>> = languages.map((lang) => ({
  value: lang.code,
  label: lang.name,
  icon: (
    <span
      className={cn('fi', `fi-${lang.iso2}`, 'shrink-0 rounded-sm')}
      style={{ width: '1.25rem', height: '0.9375rem' }}
    />
  ),
}));
