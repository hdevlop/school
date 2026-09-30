import { defineI18n, type TranslationKeys } from 'najm-i18n/define';

import en from './en.json';
import fr from './fr.json';
import ar from './ar.json';
import es from './es.json';

export const schoolI18n = defineI18n({
  translations: { en, fr, ar, es },
  defaultLanguage: 'en',
  fallbackToDefaultLanguage: true,
  languageMetadata: {
    en: { locale: 'en-MA', direction: 'ltr' },
    fr: { locale: 'fr-MA', direction: 'ltr' },
    ar: { locale: 'ar-MA', direction: 'rtl' },
    es: { locale: 'es-MA', direction: 'ltr' },
  },
});

export const translations = schoolI18n.translations;

/**
 * The header the dashboard names its interface language in, and the first
 * place the server looks when it translates a response. Without it the server
 * fell back to najm-i18n's own `language` cookie, which it had pinned to the
 * first language it guessed, so refusals stayed English under a French page.
 */
export const LANGUAGE_HEADER = 'X-Language';
export type SchoolLocale = (typeof schoolI18n.supportedLanguages)[number];
export type SchoolTranslationKey = TranslationKeys<typeof en>;

export { en, fr, ar, es };
export default translations;
