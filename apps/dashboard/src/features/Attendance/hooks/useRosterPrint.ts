import { useCallback } from 'react';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolPrintOptions, type SchoolPrintSheet } from '@/hooks/useSchoolPrintOptions';
import { buildRosterDocument, printRosterDocument, rowsForChoice, type RosterDocumentRow, type RosterPrintChoice } from '../config/rosterPrint';

/** Prints the chosen marks under the same school letterhead as other lists. */
export function useRosterPrint() {
  const { t } = useTranslation();
  const printOptions = useSchoolPrintOptions();
  return useCallback((choice: RosterPrintChoice, rows: readonly RosterDocumentRow[], sheet: SchoolPrintSheet) => {
    void printRosterDocument(buildRosterDocument(rowsForChoice(rows, choice), {
      ...printOptions(sheet),
      statusHeader: t('common.status'),
      statusLabels: {
        present: t('attendance.roster.present'),
        absent: t('attendance.roster.absent'),
        late: t('attendance.roster.late'),
        unmarked: t('attendance.roster.unmarked'),
      },
    }));
  }, [t, printOptions]);
}
