import { useCallback, useMemo } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { schoolApp } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from './useSchoolFormat';
import type { SchoolPrintDocumentOptions } from '@/shared/schoolPrintDocument';

export type SchoolPrintSheet = Pick<SchoolPrintDocumentOptions, 'title' | 'date' | 'details' | 'columns' | 'columnWeights' | 'orientation'>;

export function useSchoolPrintBranding(language: string) {
  const { publicSettings, isSettingsLoading } = usePublicSettings();
  const brandingLogo = useNThemeBrandingSlot('authLogo');
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;

  const school = useMemo(() => {
    const arabic = language === 'ar';
    const phones: string[] = settings?.schoolPhones?.length ? settings.schoolPhones : settings?.schoolPhone ? [settings.schoolPhone] : [];
    return {
      name: (arabic && settings?.schoolNameAr) || settings?.schoolName || schoolApp.appName,
      nameAr: settings?.schoolNameAr as string | null | undefined,
      logo: settings?.schoolLogo || brandingLogo,
      contact: [
        (arabic && settings?.schoolAddressAr) || settings?.schoolAddress,
        phones.join(' / '),
        settings?.schoolEmail,
      ].filter((item): item is string => !!item),
    };
  }, [language, settings, brandingLogo]);

  return { school, isSettingsLoading };
}

/** One school letterhead and theme for attendance registers and student lists. */
export function useSchoolPrintOptions() {
  const { t, language } = useTranslation();
  const { school } = useSchoolPrintBranding(language);
  const { displayDateOnly } = useSchoolFormat();

  return useCallback((sheet: SchoolPrintSheet): SchoolPrintDocumentOptions => {
    const theme = getComputedStyle(document.documentElement);
    return {
      ...sheet,
      language,
      school,
      date: displayDateOnly(sheet.date),
      totalLabel: t('attendance.roster.total'),
      signature: t('attendance.roster.signature'),
      assetOrigin: window.location.origin,
      accent: { color: theme.getPropertyValue('--primary'), foreground: theme.getPropertyValue('--primary-foreground') },
    };
  }, [t, language, school, displayDateOnly]);
}
