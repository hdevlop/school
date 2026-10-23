'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'najm-i18n/react';
import { useDialog } from '@/shared/useDialog';
import { deleteSelection } from '@/shared/deleteSelection';
import { useAcademicYearScope } from '@/features/AcademicYears/hooks/useYearScopedQuery';
import { withAcademicYear } from '@/features/AcademicYears/utils/yearScope';
import { useViewerRole } from '@/features/Users/hooks/useViewerRole';

/** Selected deletion uses the same guarded endpoint as a single deletion. */
export function useAcademicTableActions(resource: string, remove: (id: string) => Promise<unknown>, itemLabel?: (row: any) => string) {
  const { t } = useTranslation();
  const { confirmDelete } = useDialog();
  const queryClient = useQueryClient();
  const { academicYear } = useAcademicYearScope();
  const { can } = useViewerRole();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const confirm = (ids: string[], itemName: string) => {
    if (!can(`delete:${resource}`)) return;
    // Keep the year in which the confirmation was opened, even if it changes.
    const year = academicYear;
    void confirmDelete({
      itemName,
      warningText: t('academic.deleteWarning'),
      onConfirm: async () => {
        const result = await deleteSelection(ids, id => withAcademicYear(year, () => remove(id)));
        setRowSelection(previous => Object.fromEntries(Object.entries(previous)
          .filter(([id]) => !result.deleted.includes(id))));
        await queryClient.invalidateQueries();
        if (result.deleted.length) toast.success(t('common.deletedCount', { count: result.deleted.length }));
        if (result.failed.length) toast.error(t('common.deleteFailedCount', { count: result.failed.length }), {
          description: [...new Set(result.failed.map(item => item.message))].join(' · '),
          duration: 10000,
        });
        // A refused deletion has been reported; close this confirmation too.
      },
    });
  };

  return {
    getRowId: (row: { id: string }) => row.id,
    rowSelection,
    onRowSelectionChange: setRowSelection,
    onDelete: (row: { id: string; name: string }) => confirm([row.id], itemLabel ? itemLabel(row) : row.name),
    onBulkDelete: (ids: string[]) => confirm(ids, t('common.deleteSelected', { count: ids.length })),
  };
}
