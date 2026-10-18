'use client';

import { useLayoutEffect } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { z } from 'zod';
import ar from 'zod/v4/locales/ar.js';
import en from 'zod/v4/locales/en.js';
import es from 'zod/v4/locales/es.js';
import fr from 'zod/v4/locales/fr.js';

/**
 * zod's own messages (a select left on no option, a value of the wrong type)
 * are English, and the production bundle drops even that: zod installs its
 * English with a top-level `config(en())` in a package marked side-effect
 * free, so they read "Invalid input". Feature schemas name catalog keys for
 * their messages; these are the ones zod writes itself. The four locale
 * files are imported one by one so the bundle does not carry zod's forty.
 */
const ZOD_LOCALES = { ar, en, es, fr } as const;

export function zodLocaleFor(language: string | undefined) {
  const base = (language ?? '').toLowerCase().split('-')[0] as keyof typeof ZOD_LOCALES;
  return (ZOD_LOCALES[base] ?? en)();
}

/** Keeps zod's messages in the interface language. Renders nothing. */
export function ZodLanguage() {
  const { language } = useTranslation();
  useLayoutEffect(() => {
    z.config(zodLocaleFor(language));
  }, [language]);
  return null;
}
