export type SupportedLocale = 'en' | 'fr' | 'ar';

const LOCALE_TAG: Record<SupportedLocale, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-MA',
};

export function formatMAD(amount: number, locale: SupportedLocale = 'en'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(LOCALE_TAG[locale] ?? 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return `${formatted} MAD`;
}

export function formatPercent(value: number, locale: SupportedLocale = 'en'): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat(LOCALE_TAG[locale] ?? 'en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(safe)}%`;
}
