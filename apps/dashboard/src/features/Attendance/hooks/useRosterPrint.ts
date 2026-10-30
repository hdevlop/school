import { useCallback } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useNThemeBrandingSlot } from 'najm-theme/react';
import { schoolApp } from '@/najm.config';
import { usePublicSettings } from '@/features/Settings/hooks/useSettings';
import { useSchoolFormat } from '@/hooks/useSchoolFormat';
import { buildRosterDocument, printRosterDocument, rowsForChoice, type RosterDocumentRow, type RosterPrintChoice } from '../config/rosterPrint';

const themeColor = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name);

interface RosterSheet {
  title: string;
  date: string;
  details: readonly { label: string; value: string }[];
  columns: readonly string[];
}

/** Prints the people of a register whose mark is one of the chosen ones, under the school's letterhead. */
export function useRosterPrint() {
  const { t, language } = useTranslation();
  const { publicSettings } = usePublicSettings();
  const brandingLogo = useNThemeBrandingSlot('authLogo');
  const { displayDateOnly } = useSchoolFormat();
  const settings = Array.isArray(publicSettings) ? publicSettings[0] : publicSettings;

  return useCallback((choice: RosterPrintChoice, rows: readonly RosterDocumentRow[], sheet: RosterSheet) => {
    // An Arabic sheet takes the school's Arabic name and address when they are set.
    const arabic = language === 'ar';
    const phones: string[] = settings?.schoolPhones?.length ? settings.schoolPhones : settings?.schoolPhone ? [settings.schoolPhone] : [];
    const contact = [
      (arabic && settings?.schoolAddressAr) || settings?.schoolAddress,
      phones.join(' / '),
      settings?.schoolEmail,
    ].filter((item): item is string => !!item);
    void printRosterDocument(buildRosterDocument(rowsForChoice(rows, choice), {
      language,
      school: {
        name: (arabic && settings?.schoolNameAr) || settings?.schoolName || schoolApp.appName,
        logo: settings?.schoolLogo || brandingLogo,
        contact,
      },
      title: sheet.title,
      date: displayDateOnly(sheet.date),
      details: sheet.details,
      columns: sheet.columns,
      statusHeader: t('common.status'),
      statusLabels: {
        present: t('attendance.roster.present'),
        absent: t('attendance.roster.absent'),
        late: t('attendance.roster.late'),
        unmarked: t('attendance.roster.unmarked'),
      },
      totalLabel: t('attendance.roster.total'),
      signature: t('attendance.roster.signature'),
      assetOrigin: window.location.origin,
      accent: { color: themeColor('--primary'), foreground: themeColor('--primary-foreground') },
    }));
  }, [t, language, settings, brandingLogo, displayDateOnly]);
}
