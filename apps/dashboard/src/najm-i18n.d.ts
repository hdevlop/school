import type {
  SchoolLocale,
  SchoolTranslationKey,
} from '@sms/contracts/locales';

declare module 'najm-i18n/react' {
  interface NajmI18nRegistry {
    // Known keys autocomplete, but any string is accepted. That is what the
    // dashboard has always compiled against: the old compiled server
    // declaration lost the catalog's key union, and 49 call sites in 26 files
    // build keys from runtime values. Narrowing to SchoolTranslationKey alone
    // is recorded debt, not part of the workspace migration.
    key: SchoolTranslationKey | (string & {});
    language: SchoolLocale;
  }
}

export {};
