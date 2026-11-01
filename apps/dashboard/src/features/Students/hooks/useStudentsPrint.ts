import { useCallback } from 'react';
import { useTranslation } from 'najm-i18n/react';
import type { Table } from '@tanstack/react-table';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { useSchoolFormat, useSchoolToday } from '@/hooks/useSchoolFormat';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { buildStudentPrintDocument, studentPrintSnapshot } from '../config/studentPrint';

export function useStudentsPrint({ title, academicYear, details }: {
  title: string;
  academicYear?: string | null;
  details: readonly { label: string; value: string }[];
}) {
  const { t } = useTranslation();
  const printOptions = useSchoolPrintOptions();
  const { displayDateOnly } = useSchoolFormat();
  const today = useSchoolToday();

  return useCallback((table: Table<any> | null) => {
    if (!table) return;
    const snapshot = studentPrintSnapshot(table, {
      date: displayDateOnly,
      gender: value => value === 'M' ? t('common.male') : value === 'F' ? t('common.female') : value,
    });
    void printSchoolDocument(buildStudentPrintDocument(snapshot.rows, printOptions({
      title,
      date: today,
      columns: snapshot.columns,
      columnWeights: snapshot.columnWeights,
      details: [
        ...(academicYear ? [{ label: t('academicYearViewing.label'), value: academicYear }] : []),
        ...details,
      ],
      orientation: snapshot.columns.length > 6 ? 'landscape' : 'portrait',
    })));
  }, [title, academicYear, details, t, printOptions, displayDateOnly, today]);
}
