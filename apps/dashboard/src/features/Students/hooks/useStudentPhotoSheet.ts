import { useCallback } from 'react';
import { useTranslation } from 'najm-i18n/react';
import type { Table } from '@tanstack/react-table';
import { toast } from 'sonner';
import { useSchoolPrintOptions } from '@/hooks/useSchoolPrintOptions';
import { useSchoolToday } from '@/hooks/useSchoolFormat';
import { printSchoolDocument } from '@/shared/schoolPrintDocument';
import { buildStudentPhotoSheet, studentPhotoSheetGroups } from '../config/studentPhotoSheet';

/** Prints the filtered students' photos and names, one page per class section. */
export function useStudentPhotoSheet({ academicYear }: { academicYear?: string | null }) {
  const { t } = useTranslation();
  const printOptions = useSchoolPrintOptions();
  const today = useSchoolToday();

  return useCallback((table: Table<any> | null) => {
    if (!table) return;
    const groups = studentPhotoSheetGroups(table);
    if (!groups.length) {
      toast.info(t('students.photoSheet.empty'));
      return;
    }
    const options = printOptions({
      title: t('students.photoSheet.title'),
      date: today,
      columns: [],
      details: academicYear ? [{ label: t('academicYearViewing.label'), value: academicYear }] : [],
    });
    void printSchoolDocument(buildStudentPhotoSheet(groups, {
      ...options,
      labels: { class: t('students.table.class'), section: t('students.table.section') },
    }));
  }, [t, printOptions, today, academicYear]);
}
