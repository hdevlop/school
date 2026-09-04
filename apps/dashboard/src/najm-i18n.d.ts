import type {
  SchoolLocale,
  SchoolTranslationKey,
} from '@sms/server/locales';

declare module 'najm-i18n/react' {
  interface NajmI18nRegistry {
    key: SchoolTranslationKey;
    language: SchoolLocale;
  }
}

export {};
