import { useCallback } from 'react';
import type { Table } from '@tanstack/react-table';
import { useTranslation } from 'najm-i18n/react';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { buildFeePrintDocument, feePrintSnapshot, FEE_PRINT_COLUMN_WEIGHTS } from '../config/feePrint';

export function useFeesPrint({ academicYear, details }: {
  academicYear?: string | null;
  details: readonly { label: string; value: string }[];
}) {
  const { t } = useTranslation();
  const { majorMoney, displayDateOnly, percentFromHundred } = useSchoolFormat();
  const today = useSchoolToday();
  const printOptions = useSchoolPrintOptions();

  return useCallback((table: Table<any> | null) => {
    if (!table) return;
    const rows = feePrintSnapshot(table, {
      money: majorMoney,
      date: displayDateOnly,
      percent: percentFromHundred,
      gender: value => value === 'M' ? t('common.male') : value === 'F' ? t('common.female') : value,
      status: value => value === 'noFees' ? t('fees.studentView.noFees') : t(`fees.status.${value}`),
    });
    void printSchoolDocument(buildFeePrintDocument(rows, printOptions({
      title: t('navigation.fees'),
      date: table.getPrePaginationRowModel().rows[0]?.original.asOfDate ?? today,
      columns: [
        t('fees.table.studentCode'), t('fees.table.student'), t('students.table.gender'),
        t('students.table.phone'), t('students.table.class'), t('students.table.section'),
        t('fees.stats.paidToDate'), t('fees.print.dueThroughMonth'), t('fees.print.overdueCount'),
        t('fees.studentView.lastPayment'), t('fees.table.status'),
      ],
      columnWeights: FEE_PRINT_COLUMN_WEIGHTS,
      details: [
        ...(academicYear ? [{ label: t('academicYearViewing.label'), value: academicYear }] : []),
        ...details,
      ],
      orientation: 'landscape',
    })));
  }, [academicYear, details, t, majorMoney, displayDateOnly, percentFromHundred, today, printOptions]);
}
