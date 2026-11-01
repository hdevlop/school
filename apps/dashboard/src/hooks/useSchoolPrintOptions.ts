import { useCallback } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { schoolApp } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from './useSchoolFormat';
import type { SchoolPrintDocumentOptions } from '@/shared/schoolPrintDocument';

export type SchoolPrintSheet = Pick<SchoolPrintDocumentOptions, 'title' | 'date' | 'details' | 'columns' | 'columnWeights' | 'orientation'>;

/** One school letterhead and theme for attendance registers and student lists. */
export function useSchoolPrintOptions() {
  const { t, language } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const brandingLogo = useNThemeBrandingSlot('authLogo');
  const { displayDateOnly } = useSchoolFormat();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;

  return useCallback((sheet: SchoolPrintSheet): SchoolPrintDocumentOptions => {
    const arabic = language === 'ar';
    const phones: string[] = settings?.schoolPhones?.length ? settings.schoolPhones : settings?.schoolPhone ? [settings.schoolPhone] : [];
    const contact = [
      (arabic && settings?.schoolAddressAr) || settings?.schoolAddress,
      phones.join(' / '),
      settings?.schoolEmail,
    ].filter((item): item is string => !!item);
    const theme = getComputedStyle(document.documentElement);
    return {
      ...sheet,
      language,
      school: {
        name: (arabic && settings?.schoolNameAr) || settings?.schoolName || schoolApp.appName,
        logo: settings?.schoolLogo || brandingLogo,
        contact,
      },
      date: displayDateOnly(sheet.date),
      totalLabel: t('attendance.roster.total'),
      signature: t('attendance.roster.signature'),
      assetOrigin: window.location.origin,
      accent: { color: theme.getPropertyValue('--primary'), foreground: theme.getPropertyValue('--primary-foreground') },
    };
  }, [t, language, settings, brandingLogo, displayDateOnly]);
}
